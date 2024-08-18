import fs from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import express from 'express';
import * as uuid from 'uuid';
import { errorMiddleware, validateUserMiddleware } from './util/middlewares.js';
import getAccountDb from './account-db.js';
import { getPathForUserFile, getPathForGroupFile } from './util/paths.js';

import * as simpleSync from './sync-simple.js';

import { SyncProtoBuf } from '@actual-app/crdt';

const app = express();
app.use(errorMiddleware);
app.use(express.json());
app.use(express.raw({ type: 'application/actual-sync' }));
app.use(express.raw({ type: 'application/encrypted-file' }));
app.use(express.json());

app.use(validateUserMiddleware);
export { app as handlers };

const OK_RESPONSE = { status: 'ok' };

// This is a version representing the internal format of sync
// messages. When this changes, all sync files need to be reset. We
// will check this version when syncing and notify the user if they
// need to reset.
const SYNC_FORMAT_VERSION = 2;

app.post('/sync', async (req, res) => {
  let requestPb;
  try {
    requestPb = SyncProtoBuf.SyncRequest.deserializeBinary(req.body);
  } catch (e) {
    console.log('Error parsing sync request', e);
    res.status(500);
    res.send({ status: 'error', reason: 'internal-error' });
    return;
  }

  let accountDb = getAccountDb();
  let file_id = requestPb.getFileid() || null;
  let group_id = requestPb.getGroupid() || null;
  let key_id = requestPb.getKeyid() || null;
  let since = requestPb.getSince() || null;
  let messages = requestPb.getMessagesList();

  if (!since) {
    return res.status(422).send({
      details: 'since-required',
      reason: 'unprocessable-entity',
      status: 'error',
    });
  }

  let currentFiles = accountDb.all(
    'SELECT group_id, encrypt_keyid, encrypt_meta, sync_version FROM files WHERE id = ?',
    [file_id],
  );

  if (currentFiles.length === 0) {
    res.status(400);
    res.send('file-not-found');
    return;
  }

  let currentFile = currentFiles[0];

  if (
    currentFile.sync_version == null ||
    currentFile.sync_version < SYNC_FORMAT_VERSION
  ) {
    res.status(400);
    res.send('file-old-version');
    return;
  }

  // When resetting sync state, something went wrong. There is no
  // group id and it's awaiting a file to be uploaded.
  if (currentFile.group_id == null) {
    res.status(400);
    res.send('file-needs-upload');
    return;
  }

  // Check to make sure the uploaded file is valid and has been
  // encrypted with the same key it is registered with (this might
  // be wrong if there was an error during the key creation
  // process)
  let uploadedKeyId = currentFile.encrypt_meta
    ? JSON.parse(currentFile.encrypt_meta).keyId
    : null;
  if (uploadedKeyId !== currentFile.encrypt_keyid) {
    res.status(400);
    res.send('file-key-mismatch');
    return;
  }

  // The changes being synced are part of an old group, which
  // means the file has been reset. User needs to re-download.
  if (group_id !== currentFile.group_id) {
    res.status(400);
    res.send('file-has-reset');
    return;
  }

  // The data is encrypted with a different key which is
  // unacceptable. We can't accept these changes. Reject them and
  // tell the user that they need to generate the correct key
  // (which necessitates a sync reset so they need to re-download).
  if (key_id !== currentFile.encrypt_keyid) {
    res.status(400);
    res.send('file-has-new-key');
    return false;
  }

  let { trie, newMessages } = simpleSync.sync(messages, since, group_id);

  // encode it back...
  let responsePb = new SyncProtoBuf.SyncResponse();
  responsePb.setMerkle(JSON.stringify(trie));
  newMessages.forEach((msg) => responsePb.addMessages(msg));

  res.set('Content-Type', 'application/actual-sync');
  res.set('X-ACTUAL-SYNC-METHOD', 'simple');
  res.send(Buffer.from(responsePb.serializeBinary()));
});

app.post('/user-get-key', (req, res) => {
  let accountDb = getAccountDb();
  let { fileId } = req.body;

  let rows = accountDb.all(
    'SELECT encrypt_salt, encrypt_keyid, encrypt_test FROM files WHERE id = ?',
    [fileId],
  );
  if (rows.length === 0) {
    res.status(400).send('file-not-found');
    return;
  }
  let { encrypt_salt, encrypt_keyid, encrypt_test } = rows[0];

  res.send({
    status: 'ok',
    data: { id: encrypt_keyid, salt: encrypt_salt, test: encrypt_test },
  });
});

app.post('/user-create-key', (req, res) => {
  let accountDb = getAccountDb();
  let { fileId, keyId, keySalt, testContent } = req.body;

  accountDb.mutate(
    'UPDATE files SET encrypt_salt = ?, encrypt_keyid = ?, encrypt_test = ? WHERE id = ?',
    [keySalt, keyId, testContent, fileId],
  );

  res.send(OK_RESPONSE);
});

app.post('/reset-user-file', async (req, res) => {
  let accountDb = getAccountDb();
  let { fileId } = req.body;

  let files = accountDb.all('SELECT group_id FROM files WHERE id = ?', [
    fileId,
  ]);
  if (files.length === 0) {
    res.status(400).send('User or file not found');
    return;
  }
  let { group_id } = files[0];

  accountDb.mutate('UPDATE files SET group_id = NULL WHERE id = ?', [fileId]);

  if (group_id) {
    try {
      await fs.unlink(getPathForGroupFile(group_id));
    } catch (e) {
      console.log(`Unable to delete sync data for group "${group_id}"`);
    }
  }

  res.send(OK_RESPONSE);
});

app.post('/upload-user-file', async (req, res) => {
  let accountDb = getAccountDb();
  if (typeof req.headers['x-actual-name'] !== 'string') {
    // FIXME: Not sure how this cannot be a string when the header is
    // set.
    res.status(400).send('single x-actual-name is required');
    return;
  }

  let name = decodeURIComponent(req.headers['x-actual-name']);
  let fileId = req.headers['x-actual-file-id'];

  if (!fileId || typeof fileId !== 'string') {
    res.status(400).send('fileId is required');
    return;
  }

  let groupId = req.headers['x-actual-group-id'] || null;
  let encryptMeta = req.headers['x-actual-encrypt-meta'] || null;
  let syncFormatVersion = req.headers['x-actual-format'] || null;

  let keyId =
    encryptMeta && typeof encryptMeta === 'string'
      ? JSON.parse(encryptMeta).keyId
      : null;

  let currentFiles = accountDb.all(
    'SELECT group_id, encrypt_keyid, encrypt_meta FROM files WHERE id = ?',
    [fileId],
  );
  if (currentFiles.length > 0) {
    let currentFile = currentFiles[0];

    // The uploading file is part of an old group, so reject
    // it. All of its internal sync state is invalid because its
    // old. The sync state has been reset, so user needs to
    // either reset again or download from the current group.
    if (groupId !== currentFile.group_id) {
      res.status(400);
      res.send('file-has-reset');
      return;
    }

    // The key that the file is encrypted with is different than
    // the current registered key. All data must always be
    // encrypted with the registered key for consistency. Key
    // changes always necessitate a sync reset, which means this
    // upload is trying to overwrite another reset. That might
    // be be fine, but since we definitely cannot accept a file
    // encrypted with the wrong key, we bail and suggest the
    // user download the latest file.
    if (keyId !== currentFile.encrypt_keyid) {
      res.status(400);
      res.send('file-has-new-key');
      return;
    }
  }

  try {
    await fs.writeFile(getPathForUserFile(fileId), req.body);
  } catch (err) {
    console.log('Error writing file', err);
    res.status(500).send({ status: 'error' });
    return;
  }

  let rows = accountDb.all('SELECT id FROM files WHERE id = ?', [fileId]);
  if (rows.length === 0) {
    // it's new
    groupId = uuid.v4();
    accountDb.mutate(
      'INSERT INTO files (id, group_id, sync_version, name, encrypt_meta) VALUES (?, ?, ?, ?, ?)',
      [fileId, groupId, syncFormatVersion, name, encryptMeta],
    );
    res.send({ status: 'ok', groupId });
  } else {
    if (!groupId) {
      // sync state was reset, create new group
      groupId = uuid.v4();
      accountDb.mutate('UPDATE files SET group_id = ? WHERE id = ?', [
        groupId,
        fileId,
      ]);
    }

    // Regardless, update some properties
    accountDb.mutate(
      'UPDATE files SET sync_version = ?, encrypt_meta = ?, name = ? WHERE id = ?',
      [syncFormatVersion, encryptMeta, name, fileId],
    );

    res.send({ status: 'ok', groupId });
  }
});

app.get('/download-user-file', async (req, res) => {
  let accountDb = getAccountDb();
  let fileId = req.headers['x-actual-file-id'];
  if (typeof fileId !== 'string') {
    // FIXME: Not sure how this cannot be a string when the header is
    // set.
    res.status(400).send('Single file ID is required');
    return;
  }

  // Do some authentication
  let rows = accountDb.all(
    'SELECT id FROM files WHERE id = ? AND deleted = FALSE',
    [fileId],
  );
  if (rows.length === 0) {
    res.status(400).send('User or file not found');
    return;
  }

  res.setHeader('Content-Disposition', `attachment;filename=${fileId}`);
  res.sendFile(getPathForUserFile(fileId));
});

app.post('/update-user-filename', (req, res) => {
  let accountDb = getAccountDb();
  let { fileId, name } = req.body;

  // Do some authentication
  let rows = accountDb.all(
    'SELECT id FROM files WHERE id = ? AND deleted = FALSE',
    [fileId],
  );
  if (rows.length === 0) {
    res.status(400).send('file not found');
    return;
  }

  accountDb.mutate('UPDATE files SET name = ? WHERE id = ?', [name, fileId]);

  res.send(OK_RESPONSE);
});

app.get('/list-user-files', (req, res) => {
  let accountDb = getAccountDb();
  let rows = accountDb.all('SELECT * FROM files');

  res.send({
    status: 'ok',
    data: rows.map((row) => ({
      deleted: row.deleted,
      fileId: row.id,
      groupId: row.group_id,
      name: row.name,
      encryptKeyId: row.encrypt_keyid,
    })),
  });
});

app.get('/get-user-file-info', (req, res) => {
  let accountDb = getAccountDb();
  let fileId = req.headers['x-actual-file-id'];

  let rows = accountDb.all(
    'SELECT * FROM files WHERE id = ? AND deleted = FALSE',
    [fileId],
  );

  if (rows.length === 0) {
    res.status(400).send({ status: 'error', reason: 'file-not-found' });
    return;
  }

  let row = rows[0];

  res.send({
    status: 'ok',
    data: {
      deleted: row.deleted,
      fileId: row.id,
      groupId: row.group_id,
      name: row.name,
      encryptMeta: row.encrypt_meta ? JSON.parse(row.encrypt_meta) : null,
    },
  });
});

app.post('/delete-user-file', (req, res) => {
  let accountDb = getAccountDb();
  let { fileId } = req.body;

  if (!fileId) {
    return res.status(422).send({
      details: 'fileId-required',
      reason: 'unprocessable-entity',
      status: 'error',
    });
  }

  let rows = accountDb.all('SELECT * FROM files WHERE id = ?', [fileId]);

  if (rows.length === 0) {
    return res.status(400).send('file-not-found');
  }

  accountDb.mutate('UPDATE files SET deleted = TRUE WHERE id = ?', [fileId]);
  res.send(OK_RESPONSE);
});
