import fs from 'node:fs';

import request from 'supertest';

import {
  bundleMetadataFsPath,
  getBundleConfig,
  handlers as app,
} from './app-mobile-update.js';

const mockedReadFileSync = vi.fn();
const originalFs = await vi.importActual<typeof import('node:fs')>('node:fs');
vi.spyOn(fs, 'readFileSync').mockImplementation((path, ...args) => {
  if (path === bundleMetadataFsPath) {
    return mockedReadFileSync();
  }
  return originalFs.readFileSync(path, ...args);
});

describe('/mobile/auto-update endpoint', () => {
  const mockedChecksum = 'abc123def456';
  const mockedVersion = '9.9.9';
  const serverBase = 'https://example.com';

  beforeAll(() => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        bundle: mockedVersion,
        checksum: mockedChecksum,
      }),
    );
  });

  it('returns update payload when server and request are correctly configured', async () => {
    const res = await request(app)
      .post('/auto-update')
      .send({ version_name: '1.0.0', custom_id: serverBase });

    expect(res.status).toBe(200);
    expect(res.body.version).toBeDefined();
    expect(res.body.url).toBe(`${serverBase}/mobile/bundle.zip`);
    expect(res.body.checksum).toBe(mockedChecksum);
  });

  it('returns 400 when request body is missing', async () => {
    const res = await request(app).post('/auto-update');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'bad-request' });
  });

  it('returns 400 when custom_id is invalid or missing', async () => {
    const res = await request(app)
      .post('/auto-update')
      .send({ version_name: '1.0.0' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'bad-request' });
    expect(res.body.message).toMatch(/could not determine server hostname/i);
  });

  it('constructs URL without double slash when custom_id has trailing slash', async () => {
    const res = await request(app)
      .post('/auto-update')
      .send({ version_name: '1.0.0', custom_id: `${serverBase}/` });

    expect(res.status).toBe(200);
    expect(res.body.url).toBe(`${serverBase}/mobile/bundle.zip`);
  });

  it('returns not-configured message if bundle is not set on server', async () => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        bundle: null,
        checksum: null,
      }),
    );
    getBundleConfig.clear(); // Reset cached value

    const res = await request(app)
      .post('/auto-update')
      .send({ version_name: '1.0.0', custom_id: serverBase });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      error: 'not-configured',
      message: expect.stringMatching(/not configured/i),
    });
  });
});
