import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

const webRoot = mkdtempSync(join(tmpdir(), 'actual-root-web-'));
mkdirSync(join(webRoot, 'assets'));
writeFileSync(
  join(webRoot, 'index.html'),
  '<!doctype html><title>Actual</title>',
);
process.env.NODE_ENV = 'production';
process.env.ACTUAL_BASE_PATH = '/';
process.env.ACTUAL_WEB_ROOT = webRoot;

const { app } = await import('./app');

afterAll(() => rmSync(webRoot, { recursive: true, force: true }));

describe('root deployment routing', () => {
  it('keeps root API and SPA routes available without a prefix', async () => {
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'UP' });

    const route = await request(app).get('/budget');
    expect(route.status).toBe(200);
    expect(route.text).toContain('<title>Actual</title>');
  });
});
