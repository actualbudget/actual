import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import * as api from './index';

let server: Server;
let serverURL: string;
let dataDir: string;
let logouts: unknown[];

beforeEach(async () => {
  global.IS_TESTING = true;
  dataDir = await mkdtemp(join(tmpdir(), 'actual-session-'));
  logouts = [];
  server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    if (req.url === '/account/logout') logouts.push(JSON.parse(body));
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        status: 'ok',
        data: req.url === '/account/login' ? { token: 'owned-session' } : {},
      }),
    );
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('No test server address');
  }
  serverURL = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  vi.restoreAllMocks();
  await api.shutdown();
  await new Promise<void>(resolve => server.close(() => resolve()));
  await rm(dataDir, { recursive: true, force: true });
});

it.each([false, true])(
  'revokes the API-created session on shutdown (close failure: %s)',
  async failClose => {
    const instance = await api.init({
      dataDir,
      serverURL,
      password: 'password',
    });
    if (failClose) {
      const send = instance.send;
      vi.spyOn(instance, 'send').mockImplementation((name, args) => {
        if (name === 'close-budget') {
          return Promise.reject(new Error('close failed'));
        }
        return send(name, args);
      });
      await expect(api.shutdown()).rejects.toThrow('close failed');
    } else {
      await api.shutdown();
    }
    await api.shutdown();
    expect(logouts).toEqual([{ token: 'owned-session' }]);
  },
);

it('does not revoke a caller-supplied token', async () => {
  await api.init({ dataDir, serverURL, sessionToken: 'borrowed-session' });
  await api.shutdown();
  expect(logouts).toEqual([]);
});

it('revokes the current token on explicit sign-out', async () => {
  const instance = await api.init({
    dataDir,
    serverURL,
    sessionToken: 'borrowed-session',
  });
  await instance.send('subscribe-sign-out');
  expect(logouts).toEqual([{ token: 'borrowed-session' }]);
  expect(await instance.send('subscribe-get-user')).toBeNull();
});

it('clears local credentials when the server is offline', async () => {
  const instance = await api.init({ dataDir, serverURL, password: 'password' });
  await new Promise<void>(resolve => server.close(() => resolve()));
  await expect(instance.send('subscribe-sign-out')).resolves.toBe('ok');
  expect(await instance.send('subscribe-get-user')).toBeNull();
});
