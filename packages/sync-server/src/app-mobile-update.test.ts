import express, { type Express } from 'express';
import request from 'supertest';

import { handlers as router } from './app-mobile-update.js';
import { config } from './load-config.js';

// Basic tests for the mobile auto-update endpoint

describe('/mobile/auto-update endpoint', () => {
  const bundleUrl = 'https://example.com/app/update.zip';
  const checksum = 'abc123def456';

  // Build a test app wrapping the router because supertest with Express 5 types
  // does not accept a bare Router instance.
  let app: Express;
  beforeAll(() => {
    (config as unknown as { set: (path: string, value: string) => void }).set(
      'mobileUpdate.bundleUrl',
      bundleUrl,
    );
    (config as unknown as { set: (path: string, value: string) => void }).set(
      'mobileUpdate.checksum',
      checksum,
    );
    app = express();
    app.use(express.json());
    app.use(router); // router defines /auto-update path
  });

  it('returns update payload when client version mismatches', async () => {
    const res = await request(app)
      .post('/auto-update')
      .send({ version_name: '1.0.0' }); // Mismatch from server version

    expect(res.status).toBe(200);
    expect(res.body.version).toBeDefined();
    expect(res.body.url).toBe(bundleUrl);
    expect(res.body.checksum).toBe(checksum);
  });

  it('returns empty object when client version matches server version', async () => {
    // Get server version by hitting update endpoint first to extract version
    const versionRes = await request(app)
      .post('/auto-update')
      .send({ version_name: '0.0.0' }); // ensure we get version

    const serverVersion = versionRes.body.version;
    expect(serverVersion).toBeDefined();

    const res = await request(app)
      .post('/auto-update')
      .send({ version_name: serverVersion });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });
});
