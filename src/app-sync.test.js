import fs from 'node:fs';
import request from 'supertest';
import { handlers as app } from './app-sync.js';
import getAccountDb from './account-db.js';
import { getPathForUserFile } from './util/paths.js';
import { SyncProtoBuf } from '@actual-app/crdt';
import crypto from 'node:crypto';

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
      fs.writeFileSync(getPathForUserFile('file-id'), 'content');
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
    const fileId = 'existing-file-id';

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
    'INSERT INTO files (id, group_id, encrypt_keyid, encrypt_meta, sync_version) VALUES (?, ?, ?,?, ?)',
    [fileId, groupId, keyId, encryptMeta, syncVersion],
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
