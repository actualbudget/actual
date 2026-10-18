import http from 'node:http';

import { listen } from './listen';

const servers: http.Server[] = [];

function createServer() {
  const server = http.createServer();
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
  it('resolves once the server is listening', async () => {
    const server = createServer();

    await listen(server, 0, '127.0.0.1');

    expect(server.listening).toBe(true);
  });

  it('rejects when the port is already in use', async () => {
    const taken = createServer();
    await listen(taken, 0, '127.0.0.1');
    const address = taken.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Expected a TCP address');
    }

    const server = createServer();

    await expect(
      listen(server, address.port, '127.0.0.1'),
    ).rejects.toMatchObject({
      code: 'EADDRINUSE',
    });
    expect(server.listening).toBe(false);
  });

  it('stops watching for errors once listening', async () => {
    const server = createServer();
    const before = server.listenerCount('error');

    await listen(server, 0, '127.0.0.1');

    expect(server.listenerCount('error')).toBe(before);
  });
});
