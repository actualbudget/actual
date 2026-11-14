import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => new Map<string, string>());

vi.mock('../../services/secrets-service', () => ({
  SecretName: {
    paypal_clientId: 'paypal_clientId',
    paypal_clientSecret: 'paypal_clientSecret',
  },
  secretsService: {
    get: vi.fn((name: string) => store.get(name) ?? null),
    set: vi.fn((name: string, value: string) => {
      store.set(name, value);
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

const { handlers } = await import('../app-paypal');

const app = express();
app.use('/paypal', handlers);

function respond(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  };
}

const BALANCES = {
  balances: [
    {
      currency: 'GBP',
      primary: true,
      total_balance: { currency_code: 'GBP', value: '4.49' },
    },
    {
      currency: 'USD',
      primary: false,
      total_balance: { currency_code: 'USD', value: '0.00' },
    },
  ],
};

function api(transactions: unknown[]) {
  return async (url: string) => {
    if (url.endsWith('/v1/oauth2/token')) {
      return respond({ access_token: 'token', expires_in: 3600 });
    }
    if (url.includes('/v1/reporting/balances')) {
      return respond(BALANCES);
    }
    return respond({
      transaction_details: transactions,
      total_pages: 1,
      page: 1,
    });
  };
}

describe('PayPal app', () => {
  beforeEach(() => {
    store.clear();
    store.set('paypal_clientId', 'client-id');
    store.set('paypal_clientSecret', 'client-secret');
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  it('reports configuration status', async () => {
    const res = await request(app).post('/paypal/status').send({});

    expect(res.body.data.configured).toBe(true);
  });

  it('stores credentials only after PayPal accepts them', async () => {
    store.clear();
    mockFetch.mockResolvedValueOnce(
      respond({ error: 'invalid_client' }, false, 401),
    );

    const res = await request(app)
      .post('/paypal/configure')
      .send({ clientId: 'id', clientSecret: 'wrong' });

    expect(res.body.data.error_code).toBe('CONFIGURATION_FAILED');
    expect(store.has('paypal_clientSecret')).toBe(false);

    mockFetch.mockImplementation(api([]));
    const ok = await request(app)
      .post('/paypal/configure')
      .send({ clientId: 'id', clientSecret: 'right' });

    expect(ok.body.data.configured).toBe(true);
    expect(store.get('paypal_clientSecret')).toBe('right');
  });

  it('lists the primary currency and any currency holding money', async () => {
    mockFetch.mockImplementation(api([]));

    const res = await request(app).post('/paypal/accounts').send({});

    expect(res.body.data.accounts).toEqual([
      {
        account_id: 'paypal-gbp',
        name: 'PayPal GBP',
        institution: 'PayPal',
        currency: 'GBP',
        balance: 449,
      },
    ]);
  });

  it('returns transactions newest first with the balance', async () => {
    mockFetch.mockImplementation(
      api([
        {
          transaction_info: {
            transaction_id: 'OLD',
            transaction_event_code: 'T0403',
            transaction_initiation_date: '2026-11-01T10:00:00Z',
            transaction_amount: { currency_code: 'GBP', value: '-50.00' },
            transaction_status: 'S',
          },
        },
        {
          transaction_info: {
            transaction_id: 'NEW',
            transaction_event_code: 'T0002',
            transaction_initiation_date: '2026-11-10T10:00:00Z',
            transaction_amount: { currency_code: 'GBP', value: '5.00' },
            fee_amount: { currency_code: 'GBP', value: '-0.45' },
            transaction_status: 'P',
          },
        },
      ]),
    );

    const res = await request(app)
      .post('/paypal/transactions')
      .send({ accountId: 'paypal-gbp', startDate: '2026-11-01' });

    const { transactions, balances, startingBalance } = res.body.data;
    expect(
      transactions.all.map((tx: { transactionId: string }) => tx.transactionId),
    ).toEqual(['NEW', 'NEW-fee', 'OLD']);
    expect(transactions.pending).toHaveLength(2);
    expect(balances[0].balanceAmount).toEqual({ amount: 449, currency: 'GBP' });
    expect(startingBalance).toBe(449);
  });

  it('passes PayPal errors to the client as bank sync errors', async () => {
    mockFetch.mockImplementation(async (url: string) =>
      url.endsWith('/v1/oauth2/token')
        ? respond({ access_token: 'token', expires_in: 3600 })
        : respond({ name: 'NOT_AUTHORIZED', message: 'denied' }, false, 403),
    );

    const res = await request(app)
      .post('/paypal/transactions')
      .send({ accountId: 'paypal-gbp', startDate: '2026-11-01' });

    expect(res.body.data).toEqual({
      error_type: 'INVALID_INPUT',
      error_code: 'INVALID_ACCESS_TOKEN',
    });
  });
});
