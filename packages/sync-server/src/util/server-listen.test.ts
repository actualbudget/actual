import { createServer } from 'node:net';
import type { Server } from 'node:net';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { listen } from './server-listen';

describe('listen', () => {
  let server: Server;

  afterEach(() => new Promise(resolve => server.close(resolve)));

  it.each([
    { hostname: '::', host: undefined, addresses: ['::', '0.0.0.0'] },
    { hostname: '127.0.0.1', host: '127.0.0.1', addresses: ['127.0.0.1'] },
  ])(
    'reports the bound address for $hostname',
    async ({ hostname, host, addresses }) => {
      server = createServer();
      const listenSpy = vi.spyOn(server, 'listen');

      const address = await new Promise<string>(resolve =>
        listen(server, 0, hostname, resolve),
      );

      expect(listenSpy).toHaveBeenCalledExactlyOnceWith(
        0,
        host,
        expect.any(Function),
      );
      expect(addresses).toContain(address);
    },
  );
});
