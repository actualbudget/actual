// @ts-strict-ignore
import { Buffer } from 'node:buffer';
import fs from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  create,
  fromBinary,
  SyncRequestSchema,
  SyncResponseSchema,
  toBinary,
} from '@actual-app/crdt';
import type { Request, Response } from 'express';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

import { getAccountDb, isAdmin } from './account-db';
import { FileNotFound } from './app-sync/errors';
import {
  File,
  FilesService,
  FileUpdate,
} from './app-sync/services/files-service';
import {
  validateSyncedFile,
  validateUploadedFile,
} from './app-sync/validation';
import { config } from './load-config';
import * as UserService from './services/user-service';
import * as simpleSync from './sync-simple';
import {
  errorMiddleware,
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from './util/middlewares';
import {
  getPathForGroupFile,
  getPathForUserFile,
  isValidFileId,
  isValidGroupId,
} from './util/paths';
import type { GroupId } from './util/paths';

const app = express();
app.use(validateSessionMiddleware);
app.use(errorMiddleware);
app.use(requestLoggerMiddleware);
app.use(
  express.raw({
    type: 'application/actual-sync',
    limit: `${config.get('upload.fileSizeSyncLimitMB')}mb`,
  }),
);
app.use(
  express.raw({
    type: 'application/encrypted-file',
    limit: `${config.get('upload.syncEncryptedFileSizeLimitMB')}mb`,
  }),
);
app.use(express.json({ limit: `${config.get('upload.fileSizeLimitMB')}mb` }));

export { app as handlers };

const OK_RESPONSE = { status: 'ok' };

function boolToInt(deleted: boolean) {
  return deleted ? 1 : 0;
}

function generateGroupId(): GroupId {
  const id = uuidv4();
  if (!isValidGroupId(id)) {
    throw new TypeError('UUID format no longer matches expected format');
  }
  return id;
}

function extractSingleHeader(
  req: Request,
  res: Response,
  key: string,
): string | null {
  const value = req.headers[key];
  if (!value) {
    return null;
  }
  if (typeof value !== 'string') {
    res.status(400).send('Duplicate headers encountered for key ' + key);
    return null;
  }
  return value;
}

const verifyFileExists = (
  fileId: unknown,
  filesService: FilesService,
  res: Response,
  errorObject: string | Record<string, unknown>,
) => {
  if (typeof fileId !== 'string' || !isValidFileId(fileId)) {
    res.status(400).send('invalid fileId');
    return;
  }

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

function requireFileAccess(file: File, userId: string) {
  const isOwner = file.owner === userId;
  const isServerAdmin = isAdmin(userId);
  if (isOwner || isServerAdmin) {
    return null;
  }
  if (UserService.countUserAccess(file.id, userId) > 0) {
    return null;
  }
  return 'file-access-not-allowed';
}

app.post('/sync', async (req, res): Promise<void> => {
  let requestPb;
  try {
    requestPb = fromBinary(SyncRequestSchema, req.body);
  } catch (e) {
    console.log('Error parsing sync request', e);
    res.status(500);
    res.send({ status: 'error', reason: 'internal-error' });
    return;
  }

  const fileId = requestPb.fileId || null;
  const groupId = requestPb.groupId || null;
  const keyId = requestPb.keyId || null;
  const since = requestPb.since || null;
  const messages = requestPb.messages;

  if (!since) {
    res.status(422).send({
      details: 'since-required',
      reason: 'unprocessable-entity',
      status: 'error',
    });
    return;
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

  const fileAccessError = requireFileAccess(currentFile, res.locals.user_id);
  if (fileAccessError) {
    res.status(403);
    res.send(fileAccessError);
    return;
  }

  const errorMessage = validateSyncedFile(groupId, keyId, currentFile);
  if (errorMessage) {
    res.status(400);
    res.send(errorMessage);
    return;
  }

  const { trie, newMessages } = simpleSync.sync(messages, since, groupId);

  const responsePb = create(SyncResponseSchema, {
    merkle: JSON.stringify(trie),
    messages: newMessages,
  });

  res.set('Content-Type', 'application/actual-sync');
  res.set('X-ACTUAL-SYNC-METHOD', 'simple');
  res.send(Buffer.from(toBinary(SyncResponseSchema, responsePb)));
});

app.post('/user-get-key', (req, res) => {
  if (!res.locals) return;

  const { fileId } = req.body || {};

  const filesService = new FilesService(getAccountDb());
  const file = verifyFileExists(fileId, filesService, res, 'file-not-found');

  if (!file) {
    return;
  }

  const fileAccessError = requireFileAccess(file, res.locals.user_id);
  if (fileAccessError) {
    res.status(403);
    res.send(fileAccessError);
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
  const { fileId, keyId, keySalt, testContent } = req.body || {};

  const filesService = new FilesService(getAccountDb());
  const file = verifyFileExists(fileId, filesService, res, 'file-not-found');

  if (!file) {
    return;
  }

  const fileAccessError = requireFileAccess(file, res.locals.user_id);
  if (fileAccessError) {
    res.status(403);
    res.send(fileAccessError);
    return;
  }

  filesService.update(
    file.id,
    new FileUpdate({
      encryptSalt: keySalt,
      encryptKeyId: keyId,
      encryptTest: testContent,
    }),
  );

  res.send(OK_RESPONSE);
});

app.post('/reset-user-file', async (req, res) => {
  const { fileId } = req.body || {};

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

  const fileAccessError = requireFileAccess(file, res.locals.user_id);
  if (fileAccessError) {
    res.status(403);
    res.send(fileAccessError);
    return;
  }

  const groupId = file.groupId;

  filesService.update(file.id, new FileUpdate({ groupId: null }));

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

  const name = decodeURIComponent(req.headers['x-actual-name']);
  const fileId = req.headers['x-actual-file-id'];

  if (!fileId || typeof fileId !== 'string') {
    res.status(400).send('fileId is required');
    return;
  }
  if (!isValidFileId(fileId)) {
    res.status(400).send('invalid fileId');
    return;
  }

  let groupId = req.headers['x-actual-group-id'] || null;
  const encryptMeta = extractSingleHeader(req, res, 'x-actual-encrypt-meta');
  if (res.headersSent) return;
  const syncFormatVersion = extractSingleHeader(req, res, 'x-actual-format');
  if (res.headersSent) return;

  if (!!groupId && (typeof groupId !== 'string' || !isValidGroupId(groupId))) {
    res.status(400).send('invalid groupId');
    return;
  }

  const keyId =
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

  const fileAccessError = currentFile
    ? requireFileAccess(currentFile, res.locals.user_id)
    : null;
  if (fileAccessError) {
    res.status(403);
    res.send(fileAccessError);
    return;
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
    const newGroupId = generateGroupId();
    groupId = newGroupId;
    filesService.set(
      new File({
        id: fileId,
        groupId: newGroupId,
        syncVersion: syncFormatVersion,
        name,
        encryptMeta,
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
    const newGroupId = generateGroupId();
    groupId = newGroupId;
    filesService.update(fileId, new FileUpdate({ groupId: newGroupId }));
  }

  // Regardless, update some properties
  filesService.update(
    fileId,
    new FileUpdate({
      syncVersion: syncFormatVersion,
      encryptMeta,
      name,
    }),
  );

  res.send({ status: 'ok', groupId });
});

app.get('/download-user-file', async (req, res) => {
  const fileId = req.headers['x-actual-file-id'];
  if (typeof fileId !== 'string') {
    // FIXME: Not sure how this cannot be a string when the header is
    // set.
    res.status(400).send('Single file ID is required');
    return;
  }
  if (!isValidFileId(fileId)) {
    res.status(400).send('invalid fileId');
    return;
  }

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

  const fileAccessError = requireFileAccess(file, res.locals.user_id);
  if (fileAccessError) {
    res.status(403);
    res.send(fileAccessError);
    return;
  }

  const path = getPathForUserFile(fileId);

  if (!path.startsWith(resolve(config.get('userFiles')))) {
    //Ensure the user doesn't try to access files outside of the user files directory
    res.status(403).send('Access denied');
    return;
  }

  res.setHeader('Content-Disposition', `attachment;filename=${fileId}`);
  res.sendFile(path, { dotfiles: 'allow' });
});

app.post('/update-user-filename', (req, res) => {
  const { fileId, name } = req.body || {};

  const filesService = new FilesService(getAccountDb());
  const file = verifyFileExists(fileId, filesService, res, 'file-not-found');

  if (!file) {
    return;
  }

  const fileAccessError = requireFileAccess(file, res.locals.user_id);
  if (fileAccessError) {
    res.status(403);
    res.send(fileAccessError);
    return;
  }

  filesService.update(file.id, new FileUpdate({ name }));
  res.send(OK_RESPONSE);
});

app.get('/list-user-files', (req, res) => {
  const fileService = new FilesService(getAccountDb());
  const rows = fileService.find({ userId: res.locals.user_id });
  res.send({
    status: 'ok',
    data: rows.map(row => ({
      deleted: boolToInt(row.deleted),
      fileId: row.id,
      groupId: row.groupId,
      name: row.name,
      encryptKeyId: row.encryptKeyId,
      owner: row.owner,
      usersWithAccess: fileService.findUsersWithAccess(row.id).map(access => ({
        ...access,
        owner: access.userId === row.owner,
      })),
    })),
  });
});

app.get('/get-user-file-info', (req, res) => {
  const fileId = req.headers['x-actual-file-id'];

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

  const fileAccessError = requireFileAccess(file, res.locals.user_id);
  if (fileAccessError) {
    res.status(403);
    res.send(fileAccessError);
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
      usersWithAccess: fileService.findUsersWithAccess(file.id).map(access => ({
        ...access,
        owner: access.userId === file.owner,
      })),
    },
  });
});

app.post('/delete-user-file', (req, res) => {
  const { fileId } = req.body || {};

  if (!fileId) {
    res.status(422).send({
      details: 'fileId-required',
      reason: 'unprocessable-entity',
      status: 'error',
    });
    return;
  }

  const filesService = new FilesService(getAccountDb());
  const file = verifyFileExists(fileId, filesService, res, 'file-not-found');
  if (!file) {
    return;
  }

  const fileAccessError = requireFileAccess(file, res.locals.user_id);
  if (fileAccessError) {
    res.status(403);
    res.send(fileAccessError);
    return;
  }

  filesService.update(file.id, new FileUpdate({ deleted: true }));

  res.send(OK_RESPONSE);
});
