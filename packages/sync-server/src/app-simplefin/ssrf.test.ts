import dns from 'dns';

import request from 'supertest';

import { SecretName, secretsService } from '#services/secrets-service';

import { handlers } from './app-simplefin';

vi.mock('dns', () => ({ default: { lookup: vi.fn() } }));

beforeEach(() => {
  secretsService.reset(SecretName.simplefin_token);
  secretsService.reset(SecretName.simplefin_accessKey);
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  secretsService.reset(SecretName.simplefin_token);
  secretsService.reset(SecretName.simplefin_accessKey);
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
