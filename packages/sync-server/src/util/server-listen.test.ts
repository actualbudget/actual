import { createServer } from 'node:net';
import type { Server } from 'node:net';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { listen } from './server-listen';

describe('listen', () => {
  let server: Server;

  afterEach(() => new Promise(resolve => server.close(resolve)));

  it.each([
    { hostname: '::', addresses: ['::', '0.0.0.0'] },
    { hostname: '127.0.0.1', addresses: ['127.0.0.1'] },
  ])(
    'reports the bound address once for $hostname',
    async ({ hostname, addresses }) => {
      server = createServer();
      const onListening = vi.fn();

      await new Promise<void>(resolve => {
        server.once('listening', () => setImmediate(resolve));
        listen(server, 0, hostname, onListening);
      });

      expect(onListening).toHaveBeenCalledOnce();
      expect(addresses).toContain(onListening.mock.calls[0][0]);
    },
  );
});
