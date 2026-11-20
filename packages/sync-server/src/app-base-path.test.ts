import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

const webRoot = mkdtempSync(join(tmpdir(), 'actual-web-root-'));
mkdirSync(join(webRoot, 'assets'));
writeFileSync(
  join(webRoot, 'index.html'),
  '<!doctype html><title>Actual</title>',
);
writeFileSync(join(webRoot, 'assets', 'app.js'), 'console.log("ok")');
process.env.NODE_ENV = 'production';
process.env.ACTUAL_BASE_PATH = '/finances/';
process.env.ACTUAL_WEB_ROOT = webRoot;

const { app } = await import('./app');

afterAll(() => rmSync(webRoot, { recursive: true, force: true }));

describe('configured base path HTTP routing', () => {
  it('redirects the bare prefix to its trailing-slash form', async () => {
    const response = await request(app).get('/finances');
    expect(response.status).toBe(301);
    expect(response.headers.location).toBe('/finances/');
  });

  it('serves API routes through the prefix', async () => {
    const response = await request(app).get('/finances/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'UP' });
  });

  it('serves static assets and direct SPA routes through the prefix', async () => {
    const asset = await request(app).get('/finances/assets/app.js');
    expect(asset.status).toBe(200);
    expect(asset.text).toContain('console.log');

    const route = await request(app).get('/finances/budget');
    expect(route.status).toBe(200);
    expect(route.text).toContain('<title>Actual</title>');
  });

  it.each(['/health', '/account', '/sync', '/budget'])(
    'returns 404 for an unprefixed %s request',
    async path => {
      const response = await request(app).get(path);
      expect(response.status).toBe(404);
    },
  );

  it('returns 404 for a near-prefix request', async () => {
    const response = await request(app).get('/finances-old/health');
    expect(response.status).toBe(404);
  });
});
