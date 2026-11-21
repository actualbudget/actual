import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => new Map<string, string>());

vi.mock('../../services/secrets-service', () => ({
  SecretName: {
    truelayer_clientId: 'truelayer_clientId',
    truelayer_clientSecret: 'truelayer_clientSecret',
    truelayer_connection: 'truelayer_connection',
    truelayer_account: 'truelayer_account',
  },
  secretsService: {
    get: vi.fn(
      (name: string, id?: string | null) =>
        store.get(id == null ? name : `${name}:${id}`) ?? null,
    ),
    set: vi.fn((name: string, value: string, id?: string | null) => {
      store.set(id == null ? name : `${name}:${id}`, value);
      return {};
    }),
  },
}));

vi.mock('../../account-db', () => ({
  isAdmin: vi.fn(() => true),
}));

vi.mock('../../util/middlewares', () => ({
  requestLoggerMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
  validateSessionMiddleware: (
    _req: unknown,
    res: { locals: { user_id?: string } },
    next: () => void,
  ) => {
    res.locals.user_id = 'genericAdmin';
    next();
  },
}));

const mockFetch = vi.hoisted(() => vi.fn());
vi.mock('undici', () => ({ fetch: mockFetch }));

const { handlers } = await import('../app-truelayer');

const app = express();
app.set('trust proxy', true);
app.use('/truelayer', handlers);

const REDIRECT = 'https://budget.example.com/truelayer/auth_callback';

function respond(results: unknown) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(results),
  };
}

describe('TrueLayer app', () => {
  beforeEach(() => {
    store.clear();
    store.set('truelayer_clientId', 'client-id');
    store.set('truelayer_clientSecret', 'client-secret');
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  it('reports configuration status', async () => {
    const res = await request(app).post('/truelayer/status').send({});

    expect(res.body.data.configured).toBe(true);
  });

  it('stores credentials only after validating them', async () => {
    store.clear();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'invalid_client' }),
    });

    const res = await request(app)
      .post('/truelayer/configure')
      .send({ clientId: 'id', clientSecret: 'wrong' });

    expect(res.body.data.error_code).toBe('CONFIGURATION_FAILED');
    expect(store.has('truelayer_clientSecret')).toBe(false);
  });

  it('hands linked accounts from the bank callback to the poller', async () => {
    const start = await request(app)
      .post('/truelayer/start-auth')
      .send({ redirectUrl: REDIRECT });
    const { url, state } = start.body.data;
    expect(new URL(url).searchParams.get('state')).toBe(state);

    mockFetch.mockImplementation(async (target: string) => {
      if (target.endsWith('/connect/token')) {
        return respond({
          access_token: 'access',
          refresh_token: 'refresh',
          expires_in: 3600,
        });
      }
      if (target.endsWith('/accounts')) {
        return respond({
          results: [
            {
              account_id: 'acc-1',
              display_name: 'Premier Current Account',
              currency: 'GBP',
              provider: { display_name: 'Barclays' },
            },
          ],
        });
      }
      if (target.endsWith('/cards')) {
        return respond({ results: [] });
      }
      return respond({ results: [{ currency: 'GBP', current: 25.5 }] });
    });

    const poll = request(app).post('/truelayer/poll-auth').send({ state });
    const callback = await request(app)
      .get('/truelayer/auth_callback')
      .query({ code: 'code-1', state });

    expect(callback.status).toBe(200);
    const polled = await poll;
    expect(polled.body.data.accounts).toEqual([
      {
        account_id: 'acc-1',
        name: 'Premier Current Account',
        institution: 'Barclays',
        currency: 'GBP',
        balance: 2550,
      },
    ]);

    const tokenCall = mockFetch.mock.calls.find(([target]) =>
      String(target).endsWith('/connect/token'),
    );
    expect(String(tokenCall?.[1].body)).toContain(
      `redirect_uri=${encodeURIComponent(REDIRECT)}`,
    );
  });

  it('rejects a callback for an unknown state', async () => {
    const res = await request(app)
      .get('/truelayer/auth_callback')
      .query({ code: 'code-1', state: 'unknown' });

    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns booked and pending transactions with the balance', async () => {
    store.set(
      'truelayer_connection:conn-1',
      JSON.stringify({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3_600_000,
      }),
    );
    store.set(
      'truelayer_account:acc-1',
      JSON.stringify({ connectionId: 'conn-1', kind: 'accounts' }),
    );

    mockFetch.mockImplementation(async (target: string) => {
      if (target.includes('/transactions/pending')) {
        return respond({
          results: [
            {
              transaction_id: 'p-1',
              timestamp: '2026-11-07T00:00:00Z',
              description: 'PENDING SHOP',
              amount: -3,
              currency: 'GBP',
              transaction_type: 'DEBIT',
            },
          ],
        });
      }
      if (target.includes('/transactions')) {
        return respond({
          results: [
            {
              transaction_id: 'b-1',
              timestamp: '2026-11-06T00:00:00Z',
              description: 'TESCO',
              amount: -10,
              currency: 'GBP',
              transaction_type: 'DEBIT',
              meta: { provider_merchant_name: 'Tesco' },
            },
          ],
        });
      }
      return respond({ results: [{ currency: 'GBP', current: 100 }] });
    });

    const res = await request(app)
      .post('/truelayer/transactions')
      .send({ accountId: 'acc-1', startDate: '2026-11-01' });

    expect(res.body.data.startingBalance).toBe(10000);
    expect(
      res.body.data.transactions.all.map(
        (t: { transactionId: string }) => t.transactionId,
      ),
    ).toEqual(['p-1', 'b-1']);
    expect(res.body.data.transactions.booked[0]).toMatchObject({
      payeeName: 'Tesco',
      transactionAmount: { amount: '-10.00', currency: 'GBP' },
      booked: true,
    });
    expect(res.body.data.transactions.pending[0].booked).toBe(false);
  });

  it('passes a public client IP to TrueLayer and skips a private one', async () => {
    store.set(
      'truelayer_connection:conn-1',
      JSON.stringify({
        accessToken: 'access',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3_600_000,
      }),
    );
    store.set(
      'truelayer_account:acc-1',
      JSON.stringify({ connectionId: 'conn-1', kind: 'accounts' }),
    );
    mockFetch.mockImplementation(async () => respond({ results: [] }));

    await request(app)
      .post('/truelayer/transactions')
      .set('X-Forwarded-For', '2a00:1450:4009:81f::200e')
      .send({ accountId: 'acc-1', startDate: '2026-11-01' });
    const publicHeaders = mockFetch.mock.calls.map(([, o]) => o.headers);
    mockFetch.mockClear();

    await request(app)
      .post('/truelayer/transactions')
      .set('X-Forwarded-For', '192.168.1.20')
      .send({ accountId: 'acc-1', startDate: '2026-11-01' });
    const privateHeaders = mockFetch.mock.calls.map(([, o]) => o.headers);

    expect(publicHeaders).toHaveLength(3);
    for (const headers of publicHeaders) {
      expect(headers['X-PSU-IP']).toBe('2a00:1450:4009:81f::200e');
    }
    expect(privateHeaders).toHaveLength(3);
    for (const headers of privateHeaders) {
      expect(headers).not.toHaveProperty('X-PSU-IP');
    }
  });

  it('asks for re-authorisation when the account is not linked', async () => {
    const res = await request(app)
      .post('/truelayer/transactions')
      .send({ accountId: 'missing', startDate: '2026-11-01' });

    expect(res.body.data).toEqual({
      error_type: 'ITEM_ERROR',
      error_code: 'ITEM_LOGIN_REQUIRED',
    });
  });
});
