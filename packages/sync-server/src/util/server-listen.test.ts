import { createServer } from 'node:net';
import type { Server } from 'node:net';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { listen } from './server-listen';

const servers: Server[] = [];

function makeServer() {
  const server = createServer();
  servers.push(server);
  return server;
}

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .filter(server => server.listening)
      .map(server => new Promise(resolve => server.close(resolve))),
  );
});

describe('listen', () => {
  it.each([
    { hostname: '::', host: undefined, addresses: ['::', '0.0.0.0'] },
    { hostname: '127.0.0.1', host: '127.0.0.1', addresses: ['127.0.0.1'] },
  ])(
    'reports the bound address for $hostname',
    async ({ hostname, host, addresses }) => {
      const server = makeServer();
      const listenSpy = vi.spyOn(server, 'listen');

      const address = await listen(server, 0, hostname);

      expect(listenSpy).toHaveBeenCalledExactlyOnceWith(
        0,
        host,
        expect.any(Function),
      );
      expect(addresses).toContain(address);
      expect(server.listening).toBe(true);
    },
  );

  it('rejects when the port is already in use', async () => {
    const taken = makeServer();
    await listen(taken, 0, '127.0.0.1');
    const address = taken.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Expected a TCP address');
    }

    const server = makeServer();

    await expect(
      listen(server, address.port, '127.0.0.1'),
    ).rejects.toMatchObject({
      code: 'EADDRINUSE',
    });
    expect(server.listening).toBe(false);
  });

  it('stops watching for errors once listening', async () => {
    const server = makeServer();
    const before = server.listenerCount('error');

    await listen(server, 0, '127.0.0.1');

    expect(server.listenerCount('error')).toBe(before);
  });
});
