import fs from 'node:fs';
import request from 'supertest';
import { handlers as app } from './app-sync.js';
import getAccountDb from './account-db.js';
import { getPathForUserFile } from './util/paths.js';

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
