import fs from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import express from 'express';
import * as uuid from 'uuid';
import {
  errorMiddleware,
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from './util/middlewares.js';
import { getPathForUserFile, getPathForGroupFile } from './util/paths.js';

import * as simpleSync from './sync-simple.js';

import { SyncProtoBuf } from '@actual-app/crdt';
import getAccountDb from './account-db.js';
import {
  File,
  FilesService,
  FileUpdate,
} from './app-sync/services/files-service.js';
import { FileNotFound } from './app-sync/errors.js';
import {
  validateSyncedFile,
  validateUploadedFile,
} from './app-sync/validation.js';

const app = express();
app.use(validateSessionMiddleware);
app.use(errorMiddleware);
app.use(requestLoggerMiddleware);
app.use(express.raw({ type: 'application/actual-sync' }));
app.use(express.raw({ type: 'application/encrypted-file' }));
app.use(express.json());

export { app as handlers };

const OK_RESPONSE = { status: 'ok' };

function boolToInt(deleted) {
  return deleted ? 1 : 0;
}

const verifyFileExists = (fileId, filesService, res, errorObject) => {
  try {
    return filesService.get(fileId);
  } catch (e) {
    if (e instanceof FileNotFound) {
      //FIXME: error code should be 404. Need to make sure frontend is ok with it.
      //TODO: put this into a middleware that checks if FileNotFound is thrown and returns 404 and same error message
      // for every FileNotFound error
      res.status(400).send(errorObject);
      return;
    }
    throw e;
  }
};

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

  let fileId = requestPb.getFileid() || null;
  let groupId = requestPb.getGroupid() || null;
  let keyId = requestPb.getKeyid() || null;
  let since = requestPb.getSince() || null;
  let messages = requestPb.getMessagesList();

  if (!since) {
    return res.status(422).send({
      details: 'since-required',
      reason: 'unprocessable-entity',
      status: 'error',
    });
  }

  const filesService = new FilesService(getAccountDb());

  const currentFile = verifyFileExists(
    fileId,
    filesService,
    res,
    'file-not-found',
  );

  if (!currentFile) {
    return;
  }

  const errorMessage = validateSyncedFile(groupId, keyId, currentFile);
  if (errorMessage) {
    res.status(400);
    res.send(errorMessage);
    return;
  }

  let { trie, newMessages } = simpleSync.sync(messages, since, groupId);

  // encode it back...
  let responsePb = new SyncProtoBuf.SyncResponse();
  responsePb.setMerkle(JSON.stringify(trie));
  newMessages.forEach((msg) => responsePb.addMessages(msg));

  res.set('Content-Type', 'application/actual-sync');
  res.set('X-ACTUAL-SYNC-METHOD', 'simple');
  res.send(Buffer.from(responsePb.serializeBinary()));
});

app.post('/user-get-key', (req, res) => {
  if (!res.locals) return;

  let { fileId } = req.body;

  const filesService = new FilesService(getAccountDb());
  const file = verifyFileExists(fileId, filesService, res, 'file-not-found');

  if (!file) {
    return;
  }

  res.send({
    status: 'ok',
    data: {
      id: file.encryptKeyId,
      salt: file.encryptSalt,
      test: file.encryptTest,
    },
  });
});

app.post('/user-create-key', (req, res) => {
  let { fileId, keyId, keySalt, testContent } = req.body;

  const filesService = new FilesService(getAccountDb());

  if (!verifyFileExists(fileId, filesService, res, 'file not found')) {
    return;
  }

  filesService.update(
    fileId,
    new FileUpdate({
      encryptSalt: keySalt,
      encryptKeyId: keyId,
      encryptTest: testContent,
    }),
  );

  res.send(OK_RESPONSE);
});

app.post('/reset-user-file', async (req, res) => {
  let { fileId } = req.body;

  const filesService = new FilesService(getAccountDb());
  const file = verifyFileExists(
    fileId,
    filesService,
    res,
    'User or file not found',
  );

  if (!file) {
    return;
  }

  const groupId = file.groupId;

  filesService.update(fileId, new FileUpdate({ groupId: null }));

  if (groupId) {
    try {
      await fs.unlink(getPathForGroupFile(groupId));
    } catch {
      console.log(`Unable to delete sync data for group "${groupId}"`);
    }
  }

  res.send(OK_RESPONSE);
});

app.post('/upload-user-file', async (req, res) => {
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

  const filesService = new FilesService(getAccountDb());
  let currentFile;

  try {
    currentFile = filesService.get(fileId);
  } catch (e) {
    if (e instanceof FileNotFound) {
      currentFile = null;
    } else {
      throw e;
    }
  }

  const errorMessage = validateUploadedFile(groupId, keyId, currentFile);
  if (errorMessage) {
    res.status(400).send(errorMessage);
    return;
  }

  try {
    await fs.writeFile(getPathForUserFile(fileId), req.body);
  } catch (err) {
    console.log('Error writing file', err);
    res.status(500).send({ status: 'error' });
    return;
  }

  if (!currentFile) {
    // it's new
    groupId = uuid.v4();

    filesService.set(
      new File({
        id: fileId,
        groupId: groupId,
        syncVersion: syncFormatVersion,
        name: name,
        encryptMeta: encryptMeta,
        owner:
          res.locals.user_id ||
          (() => {
            throw new Error('User ID is required for file creation');
          })(),
      }),
    );

    res.send({ status: 'ok', groupId });
    return;
  }

  if (!groupId) {
    // sync state was reset, create new group
    groupId = uuid.v4();
    filesService.update(fileId, new FileUpdate({ groupId: groupId }));
  }

  // Regardless, update some properties
  filesService.update(
    fileId,
    new FileUpdate({
      syncVersion: syncFormatVersion,
      encryptMeta: encryptMeta,
      name: name,
    }),
  );

  res.send({ status: 'ok', groupId });
});

app.get('/download-user-file', async (req, res) => {
  let fileId = req.headers['x-actual-file-id'];
  if (typeof fileId !== 'string') {
    // FIXME: Not sure how this cannot be a string when the header is
    // set.
    res.status(400).send('Single file ID is required');
    return;
  }

  const filesService = new FilesService(getAccountDb());
  if (!verifyFileExists(fileId, filesService, res, 'User or file not found')) {
    return;
  }

  res.setHeader('Content-Disposition', `attachment;filename=${fileId}`);
  res.sendFile(getPathForUserFile(fileId));
});

app.post('/update-user-filename', (req, res) => {
  let { fileId, name } = req.body;

  const filesService = new FilesService(getAccountDb());

  if (!verifyFileExists(fileId, filesService, res, 'file not found')) {
    return;
  }

  filesService.update(fileId, new FileUpdate({ name: name }));
  res.send(OK_RESPONSE);
});

app.get('/list-user-files', (req, res) => {
  const fileService = new FilesService(getAccountDb());
  const rows = fileService.find({ userId: res.locals.user_id });
  res.send({
    status: 'ok',
    data: rows.map((row) => ({
      deleted: boolToInt(row.deleted),
      fileId: row.id,
      groupId: row.groupId,
      name: row.name,
      encryptKeyId: row.encryptKeyId,
      owner: row.owner,
      usersWithAccess: fileService
        .findUsersWithAccess(row.id)
        .map((access) => ({
          ...access,
          owner: access.userId === row.owner,
        })),
    })),
  });
});

app.get('/get-user-file-info', (req, res) => {
  let fileId = req.headers['x-actual-file-id'];

  // TODO: Return 422 if fileId is not provided. Need to make sure frontend can handle it
  // if (!fileId) {
  //   return res.status(422).send({
  //     details: 'fileId-required',
  //     reason: 'unprocessable-entity',
  //     status: 'error',
  //   });
  // }

  const fileService = new FilesService(getAccountDb());

  const file = verifyFileExists(fileId, fileService, res, {
    status: 'error',
    reason: 'file-not-found',
  });

  if (!file) {
    return;
  }

  res.send({
    status: 'ok',
    data: {
      deleted: boolToInt(file.deleted), //   FIXME: convert to boolean, make sure it works in the frontend
      fileId: file.id,
      groupId: file.groupId,
      name: file.name,
      encryptMeta: file.encryptMeta ? JSON.parse(file.encryptMeta) : null,
      usersWithAccess: fileService
        .findUsersWithAccess(file.id)
        .map((access) => ({
          ...access,
          owner: access.userId === file.owner,
        })),
    },
  });
});

app.post('/delete-user-file', (req, res) => {
  let { fileId } = req.body;

  if (!fileId) {
    return res.status(422).send({
      details: 'fileId-required',
      reason: 'unprocessable-entity',
      status: 'error',
    });
  }

  const filesService = new FilesService(getAccountDb());
  if (!verifyFileExists(fileId, filesService, res, 'file-not-found')) {
    return;
  }

  filesService.update(fileId, new FileUpdate({ deleted: true }));

  res.send(OK_RESPONSE);
});
