// @ts-strict-ignore
import { Buffer } from 'node:buffer';
import fs from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

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
import { SecretName, secretsService } from './services/secrets-service';
import * as UserService from './services/user-service';
import * as simpleSync from './sync-simple';
import { atomicWriteFile } from './util/atomic-write';
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
import type { FileId, GroupId } from './util/paths';

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

const fileOperations = new Map<string, Promise<void>>();

function validFileId(value: unknown): FileId | null {
  return typeof value === 'string' && isValidFileId(value) ? value : null;
}

function fileOperation(
  handler: (req: Request, res: Response) => void | Promise<void>,
) {
  return async (req: Request, res: Response) => {
    const endpoint: string = req.route.path;
    let fileId = [
      '/amount-encoding-transition',
      '/upload-user-file',
      '/download-user-file',
    ].includes(endpoint)
      ? req.headers['x-actual-file-id']
      : req.body?.fileId;
    if (endpoint === '/sync') {
      try {
        fileId = fromBinary(SyncRequestSchema, req.body).fileId;
      } catch {
        await handler(req, res);
        return;
      }
    }
    const checkedFileId = validFileId(fileId);
    if (!checkedFileId) {
      await handler(req, res);
      return;
    }
    const previous = fileOperations.get(checkedFileId);
    let complete: () => void = () => undefined;
    const operation = new Promise<void>(resolve => {
      complete = resolve;
    });
    fileOperations.set(checkedFileId, operation);
    // Serialize publication and readers without rejecting normal multi-device sync.
    await previous;
    try {
      const file = getAccountDb().first('SELECT * FROM files WHERE id = ?', [
        checkedFileId,
      ]);
      if (
        file?.amount_encoding !== 0 &&
        file?.amount_encoding != null &&
        req.headers['x-actual-amount-encoding'] !== '1'
      ) {
        res.status(400).send('amount-encoding-unsupported');
        return;
      }
      if (
        file?.amount_encoding === 1 &&
        endpoint === '/user-create-key' &&
        file.group_id != null &&
        (req.headers['x-actual-group-id'] || null) !== file.group_id
      ) {
        res.status(400).send('file-has-reset');
        return;
      }
      await handler(req, res);
    } finally {
      complete();
      if (fileOperations.get(checkedFileId) === operation) {
        fileOperations.delete(checkedFileId);
      }
    }
  };
}

async function stageFile(fileId: FileId, body: Buffer) {
  const path = `${getPathForUserFile(fileId)}.${uuidv4()}`;
  const handle = await fs.open(path, 'wx');
  try {
    await handle.writeFile(body);
    await handle.sync();
  } finally {
    await handle.close();
  }
  const directory = await fs.open(dirname(path), 'r');
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
  return path;
}

app.get('/amount-encoding-capabilities', (_req, res) => {
  res.send({ status: 'ok', data: { amountEncodingVersion: 1 } });
});

app.post(
  '/amount-encoding-transition',
  fileOperation(async (req, res) => {
    const fileId = req.headers['x-actual-file-id'];
    const sourceGroup = req.headers['x-actual-group-id'];
    const transitionId = req.headers['x-actual-transition-id'];
    const target = req.headers['x-actual-target-encoding'];
    if (req.headers['x-actual-amount-encoding'] !== '1') {
      res.status(400).send('amount-encoding-unsupported');
      return;
    }
    if (
      typeof sourceGroup !== 'string' ||
      !isValidGroupId(sourceGroup) ||
      typeof transitionId !== 'string' ||
      !isValidGroupId(transitionId) ||
      (target !== '0' && target !== '1') ||
      typeof req.headers['x-actual-name'] !== 'string' ||
      !Buffer.isBuffer(req.body) ||
      req.body.length === 0
    ) {
      res.status(400).send('invalid-amount-encoding-transition');
      return;
    }
    const db = getAccountDb();
    const files = new FilesService(db);
    const file = verifyFileExists(fileId, files, res, 'file-not-found');
    if (!file) return;
    const accessError = requireFileOwner(file, res.locals.user_id);
    if (accessError) {
      res.status(403).send(accessError);
      return;
    }
    const completed = db.first(
      'SELECT * FROM amount_encoding_transitions WHERE file_id = ? AND transition_id = ?',
      [file.id, transitionId],
    );
    if (completed) {
      if (
        completed.source_group !== sourceGroup ||
        completed.target_encoding !== Number(target) ||
        completed.group_id !== file.groupId
      ) {
        res.status(400).send('file-has-reset');
        return;
      }
      res.send({ status: 'ok', groupId: completed.group_id });
      return;
    }
    const encryptMeta = extractSingleHeader(req, res, 'x-actual-encrypt-meta');
    const syncVersion = extractSingleHeader(req, res, 'x-actual-format');
    if (res.headersSent) return;
    let keyId;
    let name;
    try {
      keyId = encryptMeta ? JSON.parse(encryptMeta).keyId : null;
      name = decodeURIComponent(req.headers['x-actual-name']);
    } catch {
      res.status(400).send('invalid-amount-encoding-transition');
      return;
    }
    const validationError = validateUploadedFile(sourceGroup, keyId, file);
    if (validationError) {
      res.status(400).send(validationError);
      return;
    }
    const groupId = generateGroupId();
    let publishedPath: string | null = null;
    try {
      const path = await stageFile(file.id, req.body);
      publishedPath = path;
      const oldPath = db.first('SELECT file_path FROM files WHERE id = ?', [
        file.id,
      ])?.file_path;
      db.transaction(() => {
        const updated = db.mutate(
          `UPDATE files SET file_path = ?, amount_encoding = ?, group_id = ?,
         name = ?, encrypt_meta = ?, sync_version = ? WHERE id = ? AND group_id = ?`,
          [
            path,
            Number(target),
            groupId,
            name,
            encryptMeta,
            syncVersion,
            file.id,
            sourceGroup,
          ],
        );
        if (updated.changes !== 1) throw new Error('file-has-reset');
        db.mutate(
          `INSERT INTO amount_encoding_transitions
         (file_id, transition_id, source_group, target_encoding, group_id) VALUES (?, ?, ?, ?, ?)`,
          [file.id, transitionId, sourceGroup, Number(target), groupId],
        );
      });
      if (oldPath && oldPath !== path) {
        await fs.unlink(oldPath).catch(() => undefined);
      }
    } catch (error) {
      if (publishedPath) await fs.unlink(publishedPath).catch(() => undefined);
      console.log('Unable to publish amount encoding transition', error);
      res.status(500).send({ status: 'error', reason: 'internal-error' });
      return;
    }
    res.send({ status: 'ok', groupId });
  }),
);

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

function requireFileOwner(file: File, userId: string) {
  const isOwner = file.owner === userId;
  const isServerAdmin = isAdmin(userId);
  if (isOwner || isServerAdmin) {
    return null;
  }
  return 'file-access-not-allowed';
}

function requireFileAccess(file: File, userId: string) {
  if (requireFileOwner(file, userId) === null) {
    return null;
  }
  if (UserService.countUserAccess(file.id, userId) > 0) {
    return null;
  }
  return 'file-access-not-allowed';
}

app.post(
  '/sync',
  fileOperation(async (req, res): Promise<void> => {
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
  }),
);

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

app.post(
  '/user-create-key',
  fileOperation((req, res) => {
    const { fileId, keyId, keySalt, testContent } = req.body || {};

    const filesService = new FilesService(getAccountDb());
    const file = verifyFileExists(fileId, filesService, res, 'file-not-found');

    if (!file) {
      return;
    }

    const fileAccessError = requireFileOwner(file, res.locals.user_id);
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
  }),
);

app.post(
  '/reset-user-file',
  fileOperation(async (req, res) => {
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

    const fileAccessError = requireFileOwner(file, res.locals.user_id);
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
  }),
);

app.post(
  '/upload-user-file',
  fileOperation(async (req, res) => {
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

    const groupIdHeader = req.headers['x-actual-group-id'];
    const encryptMeta = extractSingleHeader(req, res, 'x-actual-encrypt-meta');
    if (res.headersSent) return;
    const syncFormatVersion = extractSingleHeader(req, res, 'x-actual-format');
    if (res.headersSent) return;
    const targetEncoding =
      req.headers['x-actual-amount-encoding'] === '1'
        ? req.headers['x-actual-target-encoding']
        : '0';
    if (targetEncoding !== '0' && targetEncoding !== '1') {
      res.status(400).send('invalid-amount-encoding');
      return;
    }

    let groupId: GroupId | null = null;
    if (groupIdHeader !== undefined) {
      if (typeof groupIdHeader !== 'string' || !isValidGroupId(groupIdHeader)) {
        res.status(400).send('invalid groupId');
        return;
      }
      groupId = groupIdHeader;
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

    if (currentFile) {
      const storedEncoding = getAccountDb().first(
        'SELECT amount_encoding FROM files WHERE id = ?',
        [fileId],
      )?.amount_encoding;
      if (Number(targetEncoding) !== (storedEncoding ?? 0)) {
        res.status(400).send('amount-encoding-mismatch');
        return;
      }
    }

    const errorMessage = validateUploadedFile(groupId, keyId, currentFile);
    if (errorMessage) {
      res.status(400).send(errorMessage);
      return;
    }

    let stagedPath: string | null = null;
    let previousPath: string | null = null;
    try {
      const published = getAccountDb().first(
        'SELECT file_path FROM files WHERE id = ?',
        [fileId],
      );
      previousPath = published?.file_path ?? null;
      if (published?.file_path) {
        stagedPath = await stageFile(fileId, req.body);
      } else {
        await atomicWriteFile(getPathForUserFile(fileId), req.body);
      }
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
      getAccountDb().mutate(
        'UPDATE files SET amount_encoding = ? WHERE id = ?',
        [Number(targetEncoding), fileId],
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

    if (stagedPath) {
      getAccountDb().mutate('UPDATE files SET file_path = ? WHERE id = ?', [
        stagedPath,
        fileId,
      ]);
      if (previousPath && previousPath !== stagedPath) {
        await fs.unlink(previousPath).catch(() => undefined);
      }
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
  }),
);

app.get(
  '/download-user-file',
  fileOperation(async (req, res) => {
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

    const published = getAccountDb().first(
      'SELECT file_path FROM files WHERE id = ?',
      [fileId],
    );
    const path = published?.file_path || getPathForUserFile(fileId);

    if (!path.startsWith(resolve(config.get('userFiles')))) {
      //Ensure the user doesn't try to access files outside of the user files directory
      res.status(403).send('Access denied');
      return;
    }

    res.setHeader('Content-Disposition', `attachment;filename=${fileId}`);
    await new Promise<void>((resolve, reject) => {
      res.sendFile(path, { dotfiles: 'allow' }, error =>
        error ? reject(error) : resolve(),
      );
    });
  }),
);

app.post(
  '/update-user-filename',
  fileOperation((req, res) => {
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
  }),
);

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

app.post(
  '/delete-user-file',
  fileOperation((req, res) => {
    const { fileId } = req.body || {};

    if (!fileId) {
      res.status(422).send({
        details: 'fileId-required',
        reason: 'unprocessable-entity',
        status: 'error',
      });
      return;
    }

    const accountDb = getAccountDb();
    const filesService = new FilesService(accountDb);
    const file = verifyFileExists(fileId, filesService, res, 'file-not-found');
    if (!file) {
      return;
    }

    const fileAccessError = requireFileOwner(file, res.locals.user_id);
    if (fileAccessError) {
      res.status(403);
      res.send(fileAccessError);
      return;
    }

    accountDb.transaction(() => {
      filesService.update(file.id, new FileUpdate({ deleted: true }));
      for (const name of Object.values(SecretName)) {
        secretsService.reset(name, file.id);
      }
    });

    res.send(OK_RESPONSE);
  }),
);
