import { once } from 'node:events';
import { createServer } from 'node:http';

import request from 'supertest';

import type * as LoadConfig from '#load-config';
import { SecretName, secretsService } from '#services/secrets-service';

import { handlers } from './app-simplefin';

vi.mock('#load-config', async importOriginal => {
  const original = await importOriginal<typeof LoadConfig>();
  const get = original.config.get.bind(original.config);
  vi.spyOn(original.config, 'get').mockImplementation(name =>
    name === 'simplefinAllowedNetworks' ? ['127.0.0.1'] : get(name),
  );
  return original;
});

it('claims a token and lists accounts through the real SSRF dispatcher', async () => {
  const calls: { method?: string; url?: string; authorization?: string }[] = [];
  const server = createServer((req, res) => {
    calls.push({
      method: req.method,
      url: req.url,
      authorization: req.headers.authorization,
    });
    if (req.url === '/claim') {
      res.end(`http://user:password@${req.headers.host}`);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ accounts: [{ id: 'demo-account' }] }));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing port');

  secretsService.reset(SecretName.simplefin_accessKey);
  secretsService.set(
    SecretName.simplefin_token,
    Buffer.from(`http://127.0.0.1:${address.port}/claim`).toString('base64'),
  );
  try {
    const response = await request(handlers)
      .post('/accounts')
      .set('x-actual-token', 'valid-token');
    expect(response.body.data.accounts).toEqual([{ id: 'demo-account' }]);
    expect(calls).toEqual([
      { method: 'POST', url: '/claim', authorization: undefined },
      {
        method: 'GET',
        url: '/accounts?balances-only=1',
        authorization: `Basic ${Buffer.from('user:password').toString('base64')}`,
      },
    ]);
  } finally {
    secretsService.reset(SecretName.simplefin_token);
    secretsService.reset(SecretName.simplefin_accessKey);
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve())),
    );
  }
});
