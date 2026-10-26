import { format } from 'node:util';

import createDebug from 'debug';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAccountDb } from '#account-db';
import { SecretName, secretsService } from '#services/secrets-service';
import { assertUrlAllowed } from '#util/ssrf';

import { handlers as app } from './app-simplefin';

vi.mock('#util/ssrf', async importOriginal => ({
  ...(await importOriginal()),
  assertUrlAllowed: vi.fn().mockResolvedValue(undefined),
  createSsrfDispatcher: vi.fn(),
}));

const VALID_ACCESS_KEY = 'https://user:pass@bridge.example.com/simplefin';
const SETUP_TOKEN = Buffer.from(
  'https://bridge.example.com/claim/abc',
).toString('base64');

const statusResponse = (status, body = '') => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  text: () => Promise.resolve(body),
});

const okResponse = body => statusResponse(200, body);

// The claim is a POST to the bridge; listing accounts is a GET. Route the mock
// by method so a test can stub one or both.
function mockFetch({ claim, accounts }) {
  global.fetch = vi
    .fn()
    .mockImplementation((url, options) =>
      Promise.resolve(options?.method === 'POST' ? claim : accounts),
    );
}

const post = path =>
  request(app).post(path).set('x-actual-token', 'valid-token');

describe('app-simplefin', () => {
  beforeEach(() => {
    secretsService.set(SecretName.simplefin_token, null);
    secretsService.set(SecretName.simplefin_accessKey, null);
    vi.spyOn(console, 'log').mockImplementation(vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves format sequences in sensitive provider diagnostics', async () => {
    const previous = createDebug.disable();
    createDebug.enable('actual-sensitive:simplefin');
    const log = vi
      .spyOn(createDebug, 'log')
      .mockImplementation(() => undefined);
    const response = 'Rejected: %O %s %%';
    mockFetch({ claim: okResponse(response) });
    secretsService.set(SecretName.simplefin_token, SETUP_TOKEN);
    try {
      await post('/accounts');
      expect(log.mock.calls.map(args => format(...args)).join('\n')).toContain(
        response,
      );
      expect(JSON.stringify(vi.mocked(console.log).mock.calls)).not.toContain(
        response,
      );
    } finally {
      createDebug.enable(previous);
    }
  });

  describe('/status', () => {
    it('reports configured when a real token is stored', async () => {
      secretsService.set(SecretName.simplefin_token, SETUP_TOKEN);

      const res = await post('/status');

      expect(res.body.data.configured).toBe(true);
    });

    it('reports not configured when the stored token is a Forbidden message', async () => {
      secretsService.set(
        SecretName.simplefin_token,
        'Forbidden (was it already claimed?)',
      );

      const res = await post('/status');

      expect(res.body.data.configured).toBe(false);
    });
  });

  describe('/accounts', () => {
    it('claims the token, trims the access key and returns accounts', async () => {
      secretsService.set(SecretName.simplefin_token, SETUP_TOKEN);
      mockFetch({
        claim: okResponse(`${VALID_ACCESS_KEY}\n`),
        accounts: okResponse(
          JSON.stringify({ accounts: [{ id: 'account-1' }] }),
        ),
      });

      const res = await post('/accounts');

      expect(res.body.data.accounts).toEqual([{ id: 'account-1' }]);
      expect(secretsService.get(SecretName.simplefin_accessKey)).toBe(
        VALID_ACCESS_KEY,
      );
    });

    it('treats a "Forbidden (was it already claimed?)" claim response as invalid and does not persist it', async () => {
      secretsService.set(SecretName.simplefin_token, SETUP_TOKEN);
      mockFetch({ claim: okResponse('Forbidden (was it already claimed?)') });

      const res = await post('/accounts');

      expect(res.body.data.error_code).toBe('INVALID_ACCESS_TOKEN');
      expect(secretsService.get(SecretName.simplefin_accessKey)).toBeNull();
    });

    it('treats a blank claim response as invalid and does not persist it', async () => {
      secretsService.set(SecretName.simplefin_token, SETUP_TOKEN);
      mockFetch({ claim: okResponse('   \n') });

      const res = await post('/accounts');

      expect(res.body.data.error_code).toBe('INVALID_ACCESS_TOKEN');
      expect(secretsService.get(SecretName.simplefin_accessKey)).toBeNull();
    });

    it('re-claims when a stale Forbidden access key is cached', async () => {
      secretsService.set(SecretName.simplefin_token, SETUP_TOKEN);
      secretsService.set(
        SecretName.simplefin_accessKey,
        'Forbidden (was it already claimed?)',
      );
      mockFetch({
        claim: okResponse(VALID_ACCESS_KEY),
        accounts: okResponse(
          JSON.stringify({ accounts: [{ id: 'account-1' }] }),
        ),
      });

      const res = await post('/accounts');

      expect(res.body.data.accounts).toEqual([{ id: 'account-1' }]);
      expect(secretsService.get(SecretName.simplefin_accessKey)).toBe(
        VALID_ACCESS_KEY,
      );
    });

    it('re-claims when a stale empty access key is cached', async () => {
      secretsService.set(SecretName.simplefin_token, SETUP_TOKEN);
      secretsService.set(SecretName.simplefin_accessKey, '');
      mockFetch({
        claim: okResponse(VALID_ACCESS_KEY),
        accounts: okResponse(
          JSON.stringify({ accounts: [{ id: 'account-1' }] }),
        ),
      });

      const res = await post('/accounts');

      expect(res.body.data.accounts).toEqual([{ id: 'account-1' }]);
      expect(secretsService.get(SecretName.simplefin_accessKey)).toBe(
        VALID_ACCESS_KEY,
      );
    });

    it('re-claims when a stale non-URL access key is cached', async () => {
      secretsService.set(SecretName.simplefin_token, SETUP_TOKEN);
      secretsService.set(
        SecretName.simplefin_accessKey,
        '<html>Bad Gateway</html>',
      );
      mockFetch({
        claim: okResponse(VALID_ACCESS_KEY),
        accounts: okResponse(
          JSON.stringify({ accounts: [{ id: 'account-1' }] }),
        ),
      });

      const res = await post('/accounts');

      expect(res.body.data.accounts).toEqual([{ id: 'account-1' }]);
      expect(secretsService.get(SecretName.simplefin_accessKey)).toBe(
        VALID_ACCESS_KEY,
      );
    });

    it('treats a claim response that is not an access URL as invalid and does not persist it', async () => {
      secretsService.set(SecretName.simplefin_token, SETUP_TOKEN);
      mockFetch({ claim: okResponse('<html>Service unavailable</html>') });

      const res = await post('/accounts');

      expect(res.body.data.error_code).toBe('INVALID_ACCESS_TOKEN');
      expect(secretsService.get(SecretName.simplefin_accessKey)).toBeNull();
    });

    it('rejects a token that does not decode to a claim URL without contacting SimpleFIN', async () => {
      secretsService.set(
        SecretName.simplefin_token,
        Buffer.from('not a claim url').toString('base64'),
      );
      global.fetch = vi.fn();

      const res = await post('/accounts');

      expect(res.body.data.error_code).toBe('INVALID_ACCESS_TOKEN');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('treats a 403 Forbidden claim as an invalid token and does not persist it', async () => {
      secretsService.set(SecretName.simplefin_token, SETUP_TOKEN);
      mockFetch({
        claim: statusResponse(403, 'Forbidden (was it already claimed?)'),
      });

      const res = await post('/accounts');

      expect(res.body.data.error_code).toBe('INVALID_ACCESS_TOKEN');
      expect(secretsService.get(SecretName.simplefin_accessKey)).toBeNull();
    });

    it('reports SERVER_DOWN when the claim response is a redirect', async () => {
      secretsService.set(SecretName.simplefin_token, SETUP_TOKEN);
      mockFetch({ claim: statusResponse(302) });

      const res = await post('/accounts');

      expect(res.body.data.error_code).toBe('SERVER_DOWN');
      expect(secretsService.get(SecretName.simplefin_accessKey)).toBeNull();
    });

    it('reports SERVER_DOWN when the claim fails with a server error', async () => {
      secretsService.set(SecretName.simplefin_token, SETUP_TOKEN);
      mockFetch({
        claim: statusResponse(502, '<html>Bad Gateway</html>'),
      });

      const res = await post('/accounts');

      expect(res.body.data.error_code).toBe('SERVER_DOWN');
      expect(secretsService.get(SecretName.simplefin_accessKey)).toBeNull();
    });

    it('reports SERVER_DOWN when the claim request fails at the network level', async () => {
      secretsService.set(SecretName.simplefin_token, SETUP_TOKEN);
      global.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

      const res = await post('/accounts');

      expect(res.body.data.error_code).toBe('SERVER_DOWN');
      expect(secretsService.get(SecretName.simplefin_accessKey)).toBeNull();
    });

    it('reports SERVER_DOWN when the claim URL fails the SSRF preflight', async () => {
      secretsService.set(SecretName.simplefin_token, SETUP_TOKEN);
      assertUrlAllowed.mockRejectedValueOnce(
        new Error('Unable to resolve host: bridge.example.com'),
      );
      global.fetch = vi.fn();

      const res = await post('/accounts');

      expect(res.body.data.error_code).toBe('SERVER_DOWN');
      expect(global.fetch).not.toHaveBeenCalled();
      expect(secretsService.get(SecretName.simplefin_accessKey)).toBeNull();
    });
  });

  describe('/transactions', () => {
    it('reports an invalid token when the cached access key is not an access URL', async () => {
      secretsService.set(
        SecretName.simplefin_accessKey,
        '<html>Bad Gateway</html>',
      );
      global.fetch = vi.fn();

      const res = await post('/transactions').send({
        accountId: 'account-1',
        startDate: '2026-07-01',
      });

      expect(res.body.data.error_code).toBe('INVALID_ACCESS_TOKEN');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});

describe('per-budget credentials', () => {
  const fileA = 'simplefin-budget-a';
  const fileB = 'simplefin-budget-b';
  const keyB = 'https://other:password@bridge.example.com/simplefin';
  const keyC = 'https://third:secret@bridge.example.com/simplefin';

  beforeEach(() => {
    for (const fileId of [fileA, fileB]) {
      getAccountDb().mutate(
        'INSERT INTO files (id, deleted, owner) VALUES (?, FALSE, ?)',
        [fileId, 'genericAdmin'],
      );
    }
    for (const fileId of [null, fileA, fileB]) {
      secretsService.reset(SecretName.simplefin_token, fileId);
      secretsService.reset(SecretName.simplefin_accessKey, fileId);
    }
    secretsService.set(SecretName.simplefin_token, SETUP_TOKEN);
    secretsService.set(SecretName.simplefin_accessKey, VALID_ACCESS_KEY);
  });

  afterEach(() => {
    for (const fileId of [fileA, fileB]) {
      getAccountDb().mutate('DELETE FROM files WHERE id = ?', [fileId]);
    }
    for (const fileId of [null, fileA, fileB]) {
      secretsService.reset(SecretName.simplefin_token, fileId);
      secretsService.reset(SecretName.simplefin_accessKey, fileId);
    }
    vi.restoreAllMocks();
  });

  it('claims and stores the budget key without using or replacing global credentials', async () => {
    secretsService.set(SecretName.simplefin_token, SETUP_TOKEN, fileA);
    secretsService.set(SecretName.simplefin_accessKey, keyC, fileB);
    mockFetch({
      claim: okResponse(keyB),
      accounts: okResponse(JSON.stringify({ accounts: [], errors: [] })),
    });

    await post('/accounts').set('X-Actual-File-Id', fileA).expect(200);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://bridge.example.com/claim/abc',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          Authorization: `Basic ${Buffer.from('other:password').toString('base64')}`,
        },
      }),
    );
    expect(secretsService.get(SecretName.simplefin_accessKey, fileA)).toBe(
      keyB,
    );
    expect(secretsService.get(SecretName.simplefin_accessKey, fileB)).toBe(
      keyC,
    );
    expect(secretsService.get(SecretName.simplefin_accessKey)).toBe(
      VALID_ACCESS_KEY,
    );
  });

  it('uses the selected budget key for individual and batch transactions', async () => {
    secretsService.set(SecretName.simplefin_accessKey, VALID_ACCESS_KEY, fileA);
    secretsService.set(SecretName.simplefin_accessKey, keyB, fileB);
    mockFetch({
      accounts: okResponse(
        JSON.stringify({
          accounts: [
            {
              id: 'account',
              org: { name: 'Bank' },
              balance: '0.00',
              'balance-date': 1704067200,
              transactions: [],
            },
          ],
          errors: [],
        }),
      ),
    });

    for (const [fileId, credentials] of [
      [fileA, 'user:pass'],
      [fileB, 'other:password'],
    ]) {
      for (const batch of [false, true]) {
        const res = await post('/transactions')
          .set('X-Actual-File-Id', fileId)
          .send({
            accountId: batch ? ['account'] : 'account',
            startDate: batch ? ['2024-01-01'] : '2024-01-01',
          });
        expect(res.body.data).not.toHaveProperty('error_code');
        expect(global.fetch).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: {
              Authorization: `Basic ${Buffer.from(credentials).toString('base64')}`,
            },
          }),
        );
      }
    }
  });

  it('does not fall back to global credentials when a budget token is invalid', async () => {
    secretsService.set(SecretName.simplefin_token, 'Forbidden', fileA);
    const fetch = vi.spyOn(global, 'fetch');
    const status = await post('/status').set('X-Actual-File-Id', fileA);
    expect(status.body.data).toEqual({
      configured: false,
      source: 'per-budget-file',
    });
    for (const path of ['/accounts', '/transactions']) {
      const res = await post(path).set('X-Actual-File-Id', fileA);
      expect(res.body.data.error_code).toBe('INVALID_ACCESS_TOKEN');
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('falls back to global credentials after clearing only the budget credentials', async () => {
    secretsService.set(SecretName.simplefin_token, SETUP_TOKEN, fileA);
    expect(
      (await post('/status').set('X-Actual-File-Id', fileA)).body.data.source,
    ).toBe('per-budget-file');
    secretsService.set(SecretName.simplefin_token, null, fileA);
    expect(
      (await post('/status').set('X-Actual-File-Id', fileA)).body.data.source,
    ).toBe('global');
    expect((await post('/status')).body.data.source).toBe('global');
  });

  it.each(['/status', '/accounts', '/transactions'])(
    'rejects deleted budgets before %s even with retained credentials',
    async path => {
      secretsService.set(
        SecretName.simplefin_accessKey,
        VALID_ACCESS_KEY,
        fileA,
      );
      getAccountDb().mutate('UPDATE files SET deleted = 1 WHERE id = ?', [
        fileA,
      ]);
      const fetch = vi.spyOn(global, 'fetch');
      for (const token of ['valid-token', 'valid-token-user']) {
        for (const fileId of [fileA, 'missing-budget']) {
          await request(app)
            .post(path)
            .set('x-actual-token', token)
            .set('X-Actual-File-Id', fileId)
            .expect(403);
        }
      }
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each(['/status', '/accounts', '/transactions'])(
    'checks budget access before %s',
    async path => {
      const fetch = vi.spyOn(global, 'fetch');
      await post(path).set('X-Actual-File-Id', '../invalid').expect(400);
      await request(app)
        .post(path)
        .set('x-actual-token', 'valid-token-user')
        .set('X-Actual-File-Id', fileA)
        .expect(403);
      expect(fetch).not.toHaveBeenCalled();

      getAccountDb().mutate(
        'INSERT INTO user_access (file_id, user_id) VALUES (?, ?)',
        [fileA, 'genericUser'],
      );
      try {
        await request(app)
          .post('/status')
          .set('x-actual-token', 'valid-token-user')
          .set('X-Actual-File-Id', fileA)
          .expect(200);
      } finally {
        getAccountDb().mutate('DELETE FROM user_access WHERE file_id = ?', [
          fileA,
        ]);
      }
    },
  );
});
