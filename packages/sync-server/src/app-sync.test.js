import fs from 'node:fs';
import request from 'supertest';
import { handlers as app } from './app-sync.js';
import { getPathForUserFile } from './util/paths.js';
import getAccountDb from './account-db.js';
import { SyncProtoBuf } from '@actual-app/crdt';
import crypto from 'node:crypto';

const ADMIN_ROLE = 'ADMIN';

const createUser = (userId, userName, role, owner = 0, enabled = 1) => {
  getAccountDb().mutate(
    'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, userName, `${userName} display`, enabled, owner, role],
  );
};

describe('/user-get-key', () => {
  it('returns 401 if the user is not authenticated', async () => {
    const res = await request(app).post('/user-get-key');

    expect(res.statusCode).toEqual(401);
    expect(res.body).toEqual({
      details: 'token-not-found',
      reason: 'unauthorized',
      status: 'error',
    });
  });

  it('returns encryption key details for a given fileId', async () => {
    const fileId = crypto.randomBytes(16).toString('hex');
    const encrypt_salt = 'test-salt';
    const encrypt_keyid = 'test-key-id';
    const encrypt_test = 'test-encrypt-test';

    getAccountDb().mutate(
      'INSERT INTO files (id, encrypt_salt, encrypt_keyid, encrypt_test, owner) VALUES (?, ?, ?, ?, ?)',
      [fileId, encrypt_salt, encrypt_keyid, encrypt_test, 'genericAdmin'],
    );

    const res = await request(app)
      .post('/user-get-key')
      .set('x-actual-token', 'valid-token')
      .send({ fileId });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({
      status: 'ok',
      data: {
        id: encrypt_keyid,
        salt: encrypt_salt,
        test: encrypt_test,
      },
    });
  });

  it('returns 400 if the file is not found', async () => {
    const res = await request(app)
      .post('/user-get-key')
      .set('x-actual-token', 'valid-token')
      .send({ fileId: 'non-existent-file-id' });

    expect(res.statusCode).toEqual(400);
    expect(res.text).toBe('file-not-found');
  });
});

describe('/user-create-key', () => {
  it('returns 401 if the user is not authenticated', async () => {
    const res = await request(app).post('/user-create-key');

    expect(res.statusCode).toEqual(401);
    expect(res.body).toEqual({
      details: 'token-not-found',
      reason: 'unauthorized',
      status: 'error',
    });
  });

  it('returns 400 if the file is not found', async () => {
    const res = await request(app)
      .post('/user-create-key')
      .set('x-actual-token', 'valid-token')
      .send({ fileId: 'non-existent-file-id' });

    expect(res.statusCode).toEqual(400);
    expect(res.text).toBe('file not found');
  });

  it('creates a new encryption key for the file', async () => {
    const fileId = crypto.randomBytes(16).toString('hex');

    const old_encrypt_salt = 'old-salt';
    const old_encrypt_keyid = 'old-key';
    const old_encrypt_test = 'old-encrypt-test';
    const encrypt_salt = 'test-salt';
    const encrypt_keyid = 'test-key-id';
    const encrypt_test = 'test-encrypt-test';

    getAccountDb().mutate(
      'INSERT INTO files (id, encrypt_salt, encrypt_keyid, encrypt_test) VALUES (?, ?, ?, ?)',
      [fileId, old_encrypt_salt, old_encrypt_keyid, old_encrypt_test],
    );

    const res = await request(app)
      .post('/user-create-key')
      .set('x-actual-token', 'valid-token')
      .send({
        fileId,
        keyId: encrypt_keyid,
        keySalt: encrypt_salt,
        testContent: encrypt_test,
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ status: 'ok' });

    const rows = getAccountDb().all(
      'SELECT encrypt_salt, encrypt_keyid, encrypt_test FROM files WHERE id = ?',
      [fileId],
    );

    expect(rows[0].encrypt_salt).toEqual(encrypt_salt);
    expect(rows[0].encrypt_keyid).toEqual(encrypt_keyid);
    expect(rows[0].encrypt_test).toEqual(encrypt_test);
  });
});

describe('/reset-user-file', () => {
  it('returns 401 if the user is not authenticated', async () => {
    const res = await request(app).post('/reset-user-file');

    expect(res.statusCode).toEqual(401);
    expect(res.body).toEqual({
      details: 'token-not-found',
      reason: 'unauthorized',
      status: 'error',
    });
  });

  it('resets the user file and deletes the group file', async () => {
    const fileId = crypto.randomBytes(16).toString('hex');
    const groupId = 'test-group-id';

    // Use addMockFile to insert a mock file into the database
    getAccountDb().mutate(
      'INSERT INTO files (id, group_id, deleted, owner) VALUES (?, ?, FALSE, ?)',
      [fileId, groupId, 'genericAdmin'],
    );

    getAccountDb().mutate(
      'INSERT INTO user_access (file_id, user_id) VALUES (?, ?)',
      [fileId, 'genericAdmin'],
    );

    const res = await request(app)
      .post('/reset-user-file')
      .set('x-actual-token', 'valid-token')
      .send({ fileId });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ status: 'ok' });

    // Verify that the file is marked as deleted
    const rows = getAccountDb().all('SELECT group_id FROM files WHERE id = ?', [
      fileId,
    ]);

    expect(rows[0].group_id).toBeNull();
  });

  it('returns 400 if the file is not found', async () => {
    const res = await request(app)
      .post('/reset-user-file')
      .set('x-actual-token', 'valid-token')
      .send({ fileId: 'non-existent-file-id' });

    expect(res.statusCode).toEqual(400);
    expect(res.text).toBe('User or file not found');
  });
});

describe('/upload-user-file', () => {
  it('returns 401 if the user is not authenticated', async () => {
    const res = await request(app).post('/upload-user-file');

    expect(res.statusCode).toEqual(401);
    expect(res.body).toEqual({
      details: 'token-not-found',
      reason: 'unauthorized',
      status: 'error',
    });
  });

  it('returns 400 if x-actual-name header is missing', async () => {
    const res = await request(app)
      .post('/upload-user-file')
      .set('x-actual-token', 'valid-token')
      .set('x-actual-file-id', 'test-file-id')
      .send('file content');

    expect(res.statusCode).toEqual(400);
    expect(res.text).toBe('single x-actual-name is required');
  });

  it('returns 400 if fileId is missing', async () => {
    const content = Buffer.from('file content');
    const res = await request(app)
      .post('/upload-user-file')
      .set('Content-Type', 'application/encrypted-file')
      .set('x-actual-token', 'valid-token')
      .set('x-actual-name', 'test-file')
      .send(content);

    expect(res.statusCode).toEqual(400);
    expect(res.text).toBe('fileId is required');
  });

  it('uploads a new file successfully', async () => {
    const fileId = crypto.randomBytes(16).toString('hex');
    const fileName = 'test-file.txt';
    const fileContent = 'test file content';
    const fileContentBuffer = Buffer.from(fileContent);
    const syncVersion = 2;
    const encryptMeta = JSON.stringify({ keyId: 'key-id' });

    // Verify that the file does not exist before upload
    const rowsBefore = getAccountDb().all('SELECT * FROM files WHERE id = ?', [
      fileId,
    ]);

    expect(rowsBefore.length).toBe(0);

    const res = await request(app)
      .post('/upload-user-file')
      .set('Content-Type', 'application/encrypted-file')
      .set('x-actual-token', 'valid-token')
      .set('x-actual-name', fileName)
      .set('x-actual-file-id', fileId)
      .set('x-actual-format', syncVersion.toString())
      .set('x-actual-encrypt-meta', encryptMeta)
      .send(fileContentBuffer);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ status: 'ok', groupId: expect.any(String) });

    const receivedGroupid = res.body.groupId;
    // Verify that the file exists in the accountDb
    const rowsAfter = getAccountDb().all('SELECT * FROM files WHERE id = ?', [
      fileId,
    ]);
    expect(rowsAfter.length).toBe(1);
    expect(rowsAfter[0].id).toEqual(fileId);
    expect(rowsAfter[0].group_id).toEqual(receivedGroupid);
    expect(rowsAfter[0].sync_version).toEqual(syncVersion);
    expect(rowsAfter[0].name).toEqual(fileName);
    expect(rowsAfter[0].encrypt_meta).toEqual(encryptMeta);

    // Verify that the file was written to the file system
    const filePath = getPathForUserFile(fileId);
    const writtenContent = await fs.promises.readFile(filePath, 'utf8');
    expect(writtenContent).toEqual(fileContent);

    // Clean up the file
    await fs.promises.unlink(filePath);
  });

  it('uploads and updates an existing file successfully', async () => {
    const fileId = crypto.randomBytes(16).toString('hex');
    const oldGroupId = null; //sync state was reset
    const oldFileName = 'old-test-file.txt';
    const newFileName = 'new-test-file.txt';
    const oldFileContent = 'old file content';
    const newFileContent = 'new file content';
    const oldSyncVersion = 1;
    const newSyncVersion = 2;
    const oldKeyId = 'old-key-id';
    const oldEncryptMeta = JSON.stringify({ keyId: oldKeyId });
    const newEncryptMeta = JSON.stringify({
      keyId: oldKeyId,
      sentinelValue: 1,
    }); //keep the same key, but change other things

    // Create the old file version
    getAccountDb().mutate(
      'INSERT INTO files (id, group_id, sync_version, name, encrypt_meta, encrypt_keyid) VALUES (?, ?, ?, ?, ?, ?)',
      [
        fileId,
        oldGroupId,
        oldSyncVersion,
        oldFileName,
        oldEncryptMeta,
        oldKeyId,
      ],
    );

    await fs.writeFile(getPathForUserFile(fileId), oldFileContent, (err) => {
      if (err) throw err;
    });

    const res = await request(app)
      .post('/upload-user-file')
      .set('Content-Type', 'application/encrypted-file')
      .set('x-actual-token', 'valid-token')
      .set('x-actual-file-id', fileId)
      .set('x-actual-name', newFileName)
      .set('x-actual-format', newSyncVersion.toString())
      .set('x-actual-encrypt-meta', newEncryptMeta)
      .send(Buffer.from(newFileContent));

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ status: 'ok', groupId: expect.any(String) });

    const receivedGroupid = res.body.groupId;

    // Verify that the file was updated in the accountDb
    const rowsAfter = getAccountDb().all('SELECT * FROM files WHERE id = ?', [
      fileId,
    ]);
    expect(rowsAfter.length).toBe(1);
    expect(rowsAfter[0].id).toEqual(fileId);
    expect(rowsAfter[0].group_id).toEqual(receivedGroupid);
    expect(rowsAfter[0].sync_version).toEqual(newSyncVersion);
    expect(rowsAfter[0].name).toEqual(newFileName);
    expect(rowsAfter[0].encrypt_meta).toEqual(newEncryptMeta);

    // Verify that the file was written to the file system
    const filePath = getPathForUserFile(fileId);
    const writtenContent = await fs.promises.readFile(filePath, 'utf8');
    expect(writtenContent).toEqual(newFileContent);

    // Clean up the file
    await fs.promises.unlink(filePath);
  });

  it('returns 400 if the file is part of an old group', async () => {
    const fileId = crypto.randomBytes(16).toString('hex');
    const groupId = 'old-group-id';
    const fileName = 'test-file.txt';
    const keyId = 'key-id';
    const syncVersion = 2;

    // Add a mock file with the old group ID
    addMockFile(
      fileId,
      'current-group-id',
      keyId,
      JSON.stringify({ keyId }),
      syncVersion,
    );

    const res = await request(app)
      .post('/upload-user-file')
      .set('Content-Type', 'application/encrypted-file')
      .set('x-actual-token', 'valid-token')
      .set('x-actual-file-id', fileId)
      .set('x-actual-group-id', groupId)
      .set('x-actual-name', fileName);

    expect(res.statusCode).toEqual(400);
    expect(res.text).toEqual('file-has-reset');
  });

  it('returns 400 if the file has a new encryption key', async () => {
    const fileId = crypto.randomBytes(16).toString('hex');
    const groupId = 'group-id';
    const fileName = 'test-file.txt';
    const oldKeyId = 'old-key-id';
    const newKeyId = 'new-key-id';
    const syncVersion = 2;

    // Add a mock file with the new key
    addMockFile(
      fileId,
      groupId,
      newKeyId,
      JSON.stringify({ newKeyId }),
      syncVersion,
    );

    const res = await request(app)
      .post('/upload-user-file')
      .set('Content-Type', 'application/encrypted-file')
      .set('x-actual-token', 'valid-token')
      .set('x-actual-file-id', fileId)
      .set('x-actual-group-id', groupId)
      .set('x-actual-name', fileName)
      .set('x-actual-encrypt-meta', JSON.stringify({ keyId: oldKeyId }));

    expect(res.statusCode).toEqual(400);
    expect(res.text).toEqual('file-has-new-key');
  });
});

describe('/download-user-file', () => {
  describe('default version', () => {
    it('returns 401 if the user is not authenticated', async () => {
      const res = await request(app).get('/download-user-file');

      expect(res.statusCode).toEqual(401);
      expect(res.body).toEqual({
        details: 'token-not-found',
        reason: 'unauthorized',
        status: 'error',
      });
    });

    it('returns 401 if the user is invalid', async () => {
      const res = await request(app)
        .get('/download-user-file')
        .set('x-actual-token', 'invalid-token');

      expect(res.statusCode).toEqual(401);
      expect(res.body).toEqual({
        details: 'token-not-found',
        reason: 'unauthorized',
        status: 'error',
      });
    });

    it('returns 400 error if the file does not exist in the database', async () => {
      const res = await request(app)
        .get('/download-user-file')
        .set('x-actual-token', 'valid-token')
        .set('x-actual-file-id', 'non-existing-file-id');

      expect(res.statusCode).toEqual(400);
      expect(res.text).toBe('User or file not found');
    });

    it('returns 500 error if the file does not exist on the filesystem', async () => {
      getAccountDb().mutate(
        'INSERT INTO files (id, deleted) VALUES (?, FALSE)',
        ['missing-fs-file'],
      );

      const res = await request(app)
        .get('/download-user-file')
        .set('x-actual-token', 'valid-token')
        .set('x-actual-file-id', 'missing-fs-file');

      expect(res.statusCode).toEqual(404);
    });

    it('returns an attachment file', async () => {
      const fileContent = 'content';
      fs.writeFileSync(getPathForUserFile('file-id'), fileContent);
      getAccountDb().mutate(
        'INSERT INTO files (id, deleted) VALUES (?, FALSE)',
        ['file-id'],
      );

      const res = await request(app)
        .get('/download-user-file')
        .set('x-actual-token', 'valid-token')
        .set('x-actual-file-id', 'file-id');

      expect(res.statusCode).toEqual(200);
      expect(res.headers).toEqual(
        expect.objectContaining({
          'content-disposition': 'attachment;filename=file-id',
          'content-type': 'application/octet-stream',
        }),
      );

      expect(res.body).toBeInstanceOf(Buffer);
      expect(res.body.toString('utf8')).toEqual(fileContent);
    });
  });
});

describe('/update-user-filename', () => {
  it('returns 401 if the user is not authenticated', async () => {
    const res = await request(app).post('/update-user-filename');

    expect(res.statusCode).toEqual(401);
    expect(res.body).toEqual({
      details: 'token-not-found',
      reason: 'unauthorized',
      status: 'error',
    });
  });

  it('returns 400 if the file is not found', async () => {
    const res = await request(app)
      .post('/update-user-filename')
      .set('x-actual-token', 'valid-token')
      .send({ fileId: 'non-existent-file-id', name: 'new-filename' });

    expect(res.statusCode).toEqual(400);
    expect(res.text).toBe('file not found');
  });

  it('successfully updates the filename', async () => {
    const fileId = crypto.randomBytes(16).toString('hex');
    const oldName = 'old-filename';
    const newName = 'new-filename';

    // Insert a mock file into the database
    getAccountDb().mutate(
      'INSERT INTO files (id, name, deleted) VALUES (?, ?, FALSE)',
      [fileId, oldName],
    );

    const res = await request(app)
      .post('/update-user-filename')
      .set('x-actual-token', 'valid-token')
      .send({ fileId, name: newName });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ status: 'ok' });

    // Verify that the filename was updated
    const rows = getAccountDb().all('SELECT name FROM files WHERE id = ?', [
      fileId,
    ]);

    expect(rows[0].name).toEqual(newName);
  });
});

describe('/list-user-files', () => {
  it('returns 401 if the user is not authenticated', async () => {
    const res = await request(app).get('/list-user-files');

    expect(res.statusCode).toEqual(401);
    expect(res.body).toEqual({
      details: 'token-not-found',
      reason: 'unauthorized',
      status: 'error',
    });
  });

  it('returns a list of user files for an authenticated user', async () => {
    createUser('fileListAdminId', 'admin', ADMIN_ROLE, 1);
    const fileId1 = crypto.randomBytes(16).toString('hex');
    const fileId2 = crypto.randomBytes(16).toString('hex');
    const fileName1 = 'file1.txt';
    const fileName2 = 'file2.txt';

    // Insert mock files into the database
    getAccountDb().mutate(
      'INSERT INTO files (id, name, deleted, owner) VALUES (?, ?, FALSE, ?)',
      [fileId1, fileName1, ''],
    );
    getAccountDb().mutate(
      'INSERT INTO files (id, name, deleted, owner) VALUES (?, ?, FALSE, ?)',
      [fileId2, fileName2, ''],
    );

    const res = await request(app)
      .get('/list-user-files')
      .set('x-actual-token', 'valid-token');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'ok',
        data: expect.arrayContaining([
          expect.objectContaining({
            deleted: 0,
            fileId: fileId1,
            groupId: null,
            name: fileName1,
            encryptKeyId: null,
          }),
          expect.objectContaining({
            deleted: 0,
            fileId: fileId2,
            groupId: null,
            name: fileName2,
            encryptKeyId: null,
          }),
        ]),
      }),
    );
  });
});

describe('/get-user-file-info', () => {
  it('returns file info for a valid fileId', async () => {
    const fileId = crypto.randomBytes(16).toString('hex');
    const groupId = 'test-group-id';
    const fileInfo = {
      id: fileId,
      group_id: groupId,
      name: 'test-file',
      encrypt_meta: JSON.stringify({ key: 'value' }),
      deleted: 0,
    };

    getAccountDb().mutate(
      'INSERT INTO files (id, group_id, name, encrypt_meta, deleted) VALUES (?, ?, ?, ?, ?)',
      [
        fileInfo.id,
        fileInfo.group_id,
        fileInfo.name,
        fileInfo.encrypt_meta,
        fileInfo.deleted,
      ],
    );

    const res = await request(app)
      .get('/get-user-file-info')
      .set('x-actual-token', 'valid-token')
      .set('x-actual-file-id', fileId)
      .send();

    expect(res.statusCode).toEqual(200);

    expect(res.body).toEqual({
      status: 'ok',
      data: {
        deleted: fileInfo.deleted,
        fileId: fileInfo.id,
        groupId: fileInfo.group_id,
        name: fileInfo.name,
        encryptMeta: { key: 'value' },
        usersWithAccess: [],
      },
    });
  });

  it('returns error if the file is not found', async () => {
    const fileId = 'non-existent-file-id';

    const res = await request(app)
      .get('/get-user-file-info')
      .set('x-actual-token', 'valid-token')
      .set('x-actual-file-id', fileId);

    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({ status: 'error', reason: 'file-not-found' });
  });

  it('returns error if the user is not authenticated', async () => {
    // Simulate an unauthenticated request by not setting the necessary headers
    const res = await request(app).get('/get-user-file-info');

    expect(res.statusCode).toEqual(401);
    expect(res.body).toEqual({
      status: 'error',
      reason: 'unauthorized',
      details: 'token-not-found',
    });
  });
});

describe('/delete-user-file', () => {
  it('returns 401 if the user is not authenticated', async () => {
    const res = await request(app).post('/delete-user-file');

    expect(res.statusCode).toEqual(401);
    expect(res.body).toEqual({
      details: 'token-not-found',
      reason: 'unauthorized',
      status: 'error',
    });
  });

  // it returns 422 if the fileId is not provided
  it('returns 422 if the fileId is not provided', async () => {
    const res = await request(app)
      .post('/delete-user-file')
      .set('x-actual-token', 'valid-token');

    expect(res.statusCode).toEqual(422);
    expect(res.body).toEqual({
      details: 'fileId-required',
      reason: 'unprocessable-entity',
      status: 'error',
    });
  });

  it('returns 400 if the file does not exist', async () => {
    const res = await request(app)
      .post('/delete-user-file')
      .set('x-actual-token', 'valid-token')
      .send({ fileId: 'non-existing-file-id' });

    expect(res.statusCode).toEqual(400);
    expect(res.text).toEqual('file-not-found');
  });

  it('marks the file as deleted', async () => {
    const accountDb = getAccountDb();
    const fileId = crypto.randomBytes(16).toString('hex');

    // Insert a file into the database
    accountDb.mutate(
      'INSERT OR IGNORE INTO files (id, deleted) VALUES (?, FALSE)',
      [fileId],
    );

    const res = await request(app)
      .post('/delete-user-file')
      .set('x-actual-token', 'valid-token')
      .send({ fileId });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ status: 'ok' });

    // Verify that the file is marked as deleted
    const rows = accountDb.all('SELECT deleted FROM files WHERE id = ?', [
      fileId,
    ]);
    expect(rows[0].deleted).toBe(1);
  });
});

describe('/sync', () => {
  it('returns 401 if the user is not authenticated', async () => {
    const res = await request(app).post('/sync');

    expect(res.statusCode).toEqual(401);
    expect(res.body).toEqual({
      details: 'token-not-found',
      reason: 'unauthorized',
      status: 'error',
    });
  });

  it('returns 200 and syncs successfully with correct file attributes', async () => {
    const fileId = crypto.randomBytes(16).toString('hex');
    const groupId = 'group-id';
    const keyId = 'key-id';
    const syncVersion = 2;
    const encryptMeta = JSON.stringify({ keyId });

    addMockFile(fileId, groupId, keyId, encryptMeta, syncVersion);

    const syncRequest = createMinimalSyncRequest(fileId, groupId, keyId);

    const res = await sendSyncRequest(syncRequest);

    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toEqual('application/actual-sync');
    expect(res.headers['x-actual-sync-method']).toEqual('simple');
  });

  it('returns 500 if the request body is invalid', async () => {
    const res = await request(app)
      .post('/sync')
      .set('x-actual-token', 'valid-token')
      // Content-Type is set correctly, but the body cannot be deserialized
      .set('Content-Type', 'application/actual-sync')
      .send('invalid-body');

    expect(res.statusCode).toEqual(500);
    expect(res.body).toEqual({
      status: 'error',
      reason: 'internal-error',
    });
  });

  it('returns 422 if since is not provided', async () => {
    const syncRequest = createMinimalSyncRequest(
      'file-id',
      'group-id',
      'key-id',
    );
    syncRequest.setSince(undefined);

    const res = await sendSyncRequest(syncRequest);

    expect(res.statusCode).toEqual(422);
    expect(res.body).toEqual({
      status: 'error',
      reason: 'unprocessable-entity',
      details: 'since-required',
    });
  });

  it('returns 400 if the file does not exist in the database', async () => {
    const syncRequest = createMinimalSyncRequest(
      'non-existant-file-id',
      'group-id',
      'key-id',
    );

    // We do not insert the file into the database, so it does not exist

    const res = await sendSyncRequest(syncRequest);

    expect(res.statusCode).toEqual(400);
    expect(res.text).toEqual('file-not-found');
  });

  it('returns 400 if the file sync version is old', async () => {
    const fileId = crypto.randomBytes(16).toString('hex');
    const groupId = 'group-id';
    const keyId = 'key-id';
    const oldSyncVersion = 1; // Assuming SYNC_FORMAT_VERSION is 2

    // Add a mock file with an old sync version
    addMockFile(
      fileId,
      groupId,
      keyId,
      JSON.stringify({ keyId }),
      oldSyncVersion,
    );

    const syncRequest = createMinimalSyncRequest(fileId, groupId, keyId);

    const res = await sendSyncRequest(syncRequest);

    expect(res.statusCode).toEqual(400);
    expect(res.text).toEqual('file-old-version');
  });

  it('returns 400 if the file needs to be uploaded (no group_id)', async () => {
    const fileId = crypto.randomBytes(16).toString('hex');
    const groupId = null; // No group ID
    const keyId = 'key-id';
    const syncVersion = 2;

    addMockFile(fileId, groupId, keyId, JSON.stringify({ keyId }), syncVersion);

    const syncRequest = createMinimalSyncRequest(fileId, groupId, keyId);

    const res = await sendSyncRequest(syncRequest);

    expect(res.statusCode).toEqual(400);
    expect(res.text).toEqual('file-needs-upload');
  });

  it('returns 400 if the file has a new encryption key', async () => {
    const fileId = crypto.randomBytes(16).toString('hex');
    const groupId = 'group-id';
    const keyId = 'old-key-id';
    const newKeyId = 'new-key-id';
    const syncVersion = 2;

    // Add a mock file with the old key
    addMockFile(fileId, groupId, keyId, JSON.stringify({ keyId }), syncVersion);

    // Create a sync request with the new key
    const syncRequest = createMinimalSyncRequest(fileId, groupId, newKeyId);
    const res = await sendSyncRequest(syncRequest);

    expect(res.statusCode).toEqual(400);
    expect(res.text).toEqual('file-has-new-key');
  });
});

function addMockFile(fileId, groupId, keyId, encryptMeta, syncVersion) {
  getAccountDb().mutate(
    'INSERT INTO files (id, group_id, encrypt_keyid, encrypt_meta, sync_version, owner) VALUES (?, ?, ?,?, ?, ?)',
    [fileId, groupId, keyId, encryptMeta, syncVersion, 'genericAdmin'],
  );
}

function createMinimalSyncRequest(fileId, groupId, keyId) {
  const syncRequest = new SyncProtoBuf.SyncRequest();
  syncRequest.setFileid(fileId);
  syncRequest.setGroupid(groupId);
  syncRequest.setKeyid(keyId);
  syncRequest.setSince('2024-01-01T00:00:00.000Z');
  syncRequest.setMessagesList([]);
  return syncRequest;
}

async function sendSyncRequest(syncRequest) {
  const serializedRequest = syncRequest.serializeBinary();
  // Convert Uint8Array to Buffer
  const bufferRequest = Buffer.from(serializedRequest);

  const res = await request(app)
    .post('/sync')
    .set('x-actual-token', 'valid-token')
    .set('Content-Type', 'application/actual-sync')
    .send(bufferRequest);
  return res;
}
