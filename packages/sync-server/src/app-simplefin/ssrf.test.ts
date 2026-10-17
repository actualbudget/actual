import dns from 'dns';

import request from 'supertest';

import type * as LoadConfig from '#load-config';
import { SecretName, secretsService } from '#services/secrets-service';

import { handlers } from './app-simplefin';

const allowedNetworks = vi.hoisted(() => [] as string[]);
vi.mock('#load-config', async importOriginal => {
  const original = await importOriginal<typeof LoadConfig>();
  const get = original.config.get.bind(original.config);
  vi.spyOn(original.config, 'get').mockImplementation(name =>
    name === 'simplefinAllowedNetworks' ? allowedNetworks : get(name),
  );
  return original;
});

vi.mock('dns', () => ({ default: { lookup: vi.fn() } }));

beforeEach(() => {
  secretsService.reset(SecretName.simplefin_token);
  secretsService.reset(SecretName.simplefin_accessKey);
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  secretsService.reset(SecretName.simplefin_token);
  secretsService.reset(SecretName.simplefin_accessKey);
  allowedNetworks.length = 0;
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

it('does not fetch a claim URL using a transition address', async () => {
  secretsService.set(
    SecretName.simplefin_token,
    Buffer.from('http://[64:ff9b::a9fe:a9fe]/claim').toString('base64'),
  );
  const response = await request(handlers)
    .post('/accounts')
    .set('x-actual-token', 'valid-token');
  expect(response.body.data.error_code).toBe('SERVER_DOWN');
  expect(fetch).not.toHaveBeenCalled();
});

it('does not fetch accounts on a host resolving to a transition address', async () => {
  vi.mocked(dns.lookup).mockImplementation((...args: unknown[]) => {
    const callback = args[args.length - 1];
    if (typeof callback === 'function') {
      callback(null, [{ address: '2002:a9fe:a9fe::', family: 6 }]);
    }
  });
  secretsService.set(
    SecretName.simplefin_accessKey,
    'https://user:pass@bridge.example',
  );
  const response = await request(handlers)
    .post('/accounts')
    .set('x-actual-token', 'valid-token');
  expect(response.body.data.error_code).toBe('SERVER_DOWN');
  expect(fetch).not.toHaveBeenCalled();
});

it('rejects an unsafe redirect before fetching the next hop', async () => {
  secretsService.set(
    SecretName.simplefin_accessKey,
    'https://user:pass@8.8.8.8',
  );
  vi.mocked(fetch).mockResolvedValue(
    new Response(null, {
      status: 302,
      headers: { Location: 'http://[ff02::1]/accounts' },
    }),
  );
  const response = await request(handlers)
    .post('/accounts')
    .set('x-actual-token', 'valid-token');
  expect(response.body.data.error_code).toBe('SERVER_DOWN');
  expect(fetch).toHaveBeenCalledTimes(1);
});

it.each([
  'http://127.0.0.1/claim',
  'http://192.168.1.20/claim',
  'http://[::1]/claim',
])('blocks private claim destinations by default: %s', async url => {
  secretsService.set(
    SecretName.simplefin_token,
    Buffer.from(url).toString('base64'),
  );
  const response = await request(handlers)
    .post('/accounts')
    .set('x-actual-token', 'valid-token');
  expect(response.body.data.error_code).toBe('SERVER_DOWN');
  expect(fetch).not.toHaveBeenCalled();
});

it('blocks a private account destination even with an existing access key', async () => {
  secretsService.set(
    SecretName.simplefin_accessKey,
    'http://user:pass@127.0.0.1',
  );
  const response = await request(handlers)
    .post('/accounts')
    .set('x-actual-token', 'valid-token');
  expect(response.body.data.error_code).toBe('SERVER_DOWN');
  expect(fetch).not.toHaveBeenCalled();
});

it('blocks a redirect from a public bridge into a private network', async () => {
  secretsService.set(
    SecretName.simplefin_accessKey,
    'https://user:pass@8.8.8.8',
  );
  vi.mocked(fetch).mockResolvedValue(
    new Response(null, {
      status: 302,
      headers: { Location: 'http://192.168.1.20/accounts' },
    }),
  );
  const response = await request(handlers)
    .post('/accounts')
    .set('x-actual-token', 'valid-token');
  expect(response.body.data.error_code).toBe('SERVER_DOWN');
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('uses the configured exception for claims, accounts, and redirects', async () => {
  allowedNetworks.push('192.168.1.20');
  secretsService.set(
    SecretName.simplefin_token,
    Buffer.from('http://192.168.1.20/claim').toString('base64'),
  );
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response('http://user:pass@192.168.1.20'))
    .mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { Location: 'http://192.168.1.20/redirected' },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ accounts: [{ id: 'test-account' }] })),
    );
  const response = await request(handlers)
    .post('/accounts')
    .set('x-actual-token', 'valid-token');
  expect(response.body.data.accounts).toEqual([{ id: 'test-account' }]);
  expect(fetch).toHaveBeenCalledTimes(3);
});
