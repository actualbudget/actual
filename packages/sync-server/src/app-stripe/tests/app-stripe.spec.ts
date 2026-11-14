import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => new Map<string, string>());

vi.mock('../../services/secrets-service', () => ({
  SecretName: {
    stripe_key: 'stripe_key',
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

const { handlers } = await import('../app-stripe');

const app = express();
app.use('/stripe', handlers);

function respond(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  };
}

const BALANCE = {
  available: [{ amount: 0, currency: 'gbp' }],
  pending: [{ amount: 460, currency: 'gbp' }],
};

describe('Stripe app', () => {
  beforeEach(() => {
    store.clear();
    store.set('stripe_key', 'rk_test_key');
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  it('reports configuration status', async () => {
    const res = await request(app).post('/stripe/status').send({});

    expect(res.body.data.configured).toBe(true);
  });

  it('stores the key only after Stripe accepts it', async () => {
    store.clear();
    mockFetch.mockResolvedValueOnce(
      respond({ error: { message: 'Invalid API Key provided' } }, false, 401),
    );

    const res = await request(app)
      .post('/stripe/configure')
      .send({ key: 'rk_live_wrong' });

    expect(res.body.data.error_code).toBe('CONFIGURATION_FAILED');
    expect(store.has('stripe_key')).toBe(false);

    mockFetch.mockResolvedValueOnce(respond(BALANCE));
    const ok = await request(app)
      .post('/stripe/configure')
      .send({ key: 'rk_live_right' });

    expect(ok.body.data.configured).toBe(true);
    expect(store.get('stripe_key')).toBe('rk_live_right');
  });

  it('lists the balance currencies as accounts', async () => {
    mockFetch.mockResolvedValueOnce(respond(BALANCE));

    const res = await request(app).post('/stripe/accounts').send({});

    expect(res.body.data.accounts).toEqual([
      {
        account_id: 'stripe-gbp',
        name: 'Stripe GBP',
        institution: 'Stripe',
        currency: 'GBP',
        balance: 460,
      },
    ]);
  });

  it('returns transactions newest first with the balance', async () => {
    mockFetch.mockImplementation(async (url: string) =>
      url.includes('/balance_transactions')
        ? respond({
            data: [
              {
                id: 'txn_charge',
                amount: 500,
                fee: 40,
                net: 460,
                currency: 'gbp',
                created: Date.parse('2026-10-25T10:00:00Z') / 1000,
                description: 'Subscription creation',
                status: 'pending',
                type: 'charge',
              },
              {
                id: 'txn_old',
                amount: 100,
                fee: 0,
                net: 100,
                currency: 'gbp',
                created: Date.parse('2026-10-20T10:00:00Z') / 1000,
                description: null,
                status: 'available',
                type: 'adjustment',
              },
            ],
            has_more: false,
          })
        : respond(BALANCE),
    );

    const res = await request(app)
      .post('/stripe/transactions')
      .send({ accountId: 'stripe-gbp', startDate: '2026-10-01' });

    const { transactions, balances, startingBalance } = res.body.data;
    expect(
      transactions.all.map((tx: { transactionId: string }) => tx.transactionId),
    ).toEqual(['txn_charge', 'txn_charge-fee', 'txn_old']);
    expect(transactions.pending).toHaveLength(2);
    expect(transactions.booked).toHaveLength(1);
    expect(balances).toEqual([
      {
        balanceAmount: { amount: 460, currency: 'GBP' },
        balanceType: 'current',
      },
    ]);
    expect(startingBalance).toBe(460);
  });

  it('passes Stripe errors to the client as bank sync errors', async () => {
    mockFetch.mockResolvedValueOnce(respond({}, false, 429));

    const res = await request(app)
      .post('/stripe/transactions')
      .send({ accountId: 'stripe-gbp', startDate: '2026-10-01' });

    expect(res.body.data).toEqual({
      error_type: 'RATE_LIMIT_EXCEEDED',
      error_code: 'RATE_LIMIT_EXCEEDED',
    });
  });

  it('rejects a request without an account', async () => {
    const res = await request(app).post('/stripe/transactions').send({});

    expect(res.body.data.error_code).toBe('INVALID_INPUT');
  });
});
