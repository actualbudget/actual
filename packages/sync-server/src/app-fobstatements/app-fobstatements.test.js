import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SecretName, secretsService } from '#services/secrets-service';

import { handlers as app } from './app-fobstatements';

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    headers: { get: () => null },
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

// Route the fetch mock by URL pathname. `routes` is an array of
// [regExp, body] pairs; the first matching route wins, so more specific
// patterns (e.g. the balance sub-resource) must come first.
function routeFetch(routes) {
  global.fetch = vi.fn().mockImplementation(url => {
    const { pathname } = new URL(String(url));
    for (const [match, body] of routes) {
      if (match.test(pathname)) {
        return Promise.resolve(jsonResponse(200, body));
      }
    }
    return Promise.resolve(
      jsonResponse(404, { error: { message: `no route for ${pathname}` } }),
    );
  });
}

const post = path =>
  request(app).post(path).set('x-actual-token', 'valid-token');

function configure() {
  secretsService.set(SecretName.fobstatements_apiKey, 'test-key');
  secretsService.set(SecretName.fobstatements_apiSecret, 'test-secret');
}

describe('app-fobstatements', () => {
  beforeEach(() => {
    secretsService.set(SecretName.fobstatements_apiKey, null);
    secretsService.set(SecretName.fobstatements_apiSecret, null);
    secretsService.set(SecretName.fobstatements_apiUrl, null);
    vi.spyOn(console, 'log').mockImplementation(vi.fn());
    vi.spyOn(console, 'error').mockImplementation(vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('/status', () => {
    it('reports configured when the API key and secret are stored', async () => {
      configure();

      const res = await post('/status');

      expect(res.body.data).toEqual({ configured: true, source: 'global' });
    });

    it('reports not configured when credentials are missing', async () => {
      const res = await post('/status');

      expect(res.body.data).toEqual({ configured: false, source: null });
    });
  });

  describe('/accounts', () => {
    it('maps accounts with the current balance and account-type label', async () => {
      configure();
      routeFetch([
        [/\/api\/v1\/accounts\/[^/]+\/balance$/, { data: { balance: 1000 } }],
        [
          /\/api\/v1\/accounts$/,
          {
            data: [
              {
                id: 'a1',
                name: 'ICICI 0006',
                category: 'credit_card',
                currency: 'INR',
                opening_balance: 5,
              },
            ],
            page_context: { has_more: false },
          },
        ],
      ]);

      const res = await post('/accounts');

      // FOB exposes no institution, so the account type is surfaced as the
      // institution/bank label and accounts are grouped by type.
      expect(res.body.data.accounts).toEqual([
        {
          account_id: 'a1',
          name: 'ICICI 0006',
          balance: 1000,
          category: 'credit_card',
          currency: 'INR',
          institution: 'Credit card',
          orgId: 'credit_card',
          orgDomain: null,
        },
      ]);
    });

    it('errors when credentials are not configured', async () => {
      const res = await post('/accounts');

      expect(res.status).toBe(400);
      expect(res.body.reason).toBe('not-configured');
    });
  });

  describe('/transactions', () => {
    it('converts x1000 amounts to decimals and marks everything booked', async () => {
      configure();
      routeFetch([
        [/\/api\/v1\/accounts\/[^/]+\/balance$/, { data: { balance: 100 } }],
        [
          /\/api\/v1\/accounts\/[^/]+$/,
          { data: { id: 'a1', category: 'bank', currency: 'INR' } },
        ],
        [
          /\/api\/v1\/transactions$/,
          {
            data: [
              {
                id: 't1',
                date: '2026-01-05',
                entity: 'Shop',
                particulars: 'Groceries',
                inflow: 0,
                outflow: 50000,
                balance: 100000,
              },
            ],
            page_context: { has_more: false },
          },
        ],
      ]);

      const res = await post('/transactions').send({
        accountId: 'a1',
        startDate: '2026-01-01',
      });

      const { data } = res.body;
      // 100 (decimal) -> 10000 cents.
      expect(data.startingBalance).toBe(10000);
      expect(data.transactions.pending).toEqual([]);
      expect(data.transactions.booked).toHaveLength(1);
      expect(data.transactions.all[0]).toMatchObject({
        booked: true,
        date: '2026-01-05',
        payeeName: 'Shop',
        notes: 'Groceries',
        transactionId: 't1',
        // (0 - 50000) / 1000 = -50 (an outflow / payment).
        transactionAmount: { amount: -50, currency: 'INR' },
      });
    });

    it('leaves the payee blank when FOB has not identified a counterparty', async () => {
      configure();
      routeFetch([
        [/\/api\/v1\/accounts\/[^/]+\/balance$/, { data: { balance: 100 } }],
        [
          /\/api\/v1\/accounts\/[^/]+$/,
          { data: { id: 'a1', category: 'bank', currency: 'INR' } },
        ],
        [
          /\/api\/v1\/transactions$/,
          {
            data: [
              {
                id: 't1',
                date: '2026-01-05',
                // No `entity` — FOB has not identified a counterparty.
                particulars: 'UPI/1234567890/GROCERY',
                inflow: 0,
                outflow: 50000,
                balance: 100000,
              },
            ],
            page_context: { has_more: false },
          },
        ],
      ]);

      const res = await post('/transactions').send({
        accountId: 'a1',
        startDate: '2026-01-01',
      });

      // The raw narration goes to notes only, never the payee.
      expect(res.body.data.transactions.all[0]).toMatchObject({
        payeeName: '',
        notes: 'UPI/1234567890/GROCERY',
      });
    });

    it('passes through credit-card values without flipping the sign', async () => {
      configure();
      routeFetch([
        // FOB already reports a credit-card balance as negative (a liability),
        // matching Actual's convention.
        [/\/api\/v1\/accounts\/[^/]+\/balance$/, { data: { balance: -100 } }],
        [
          /\/api\/v1\/accounts\/[^/]+$/,
          { data: { id: 'cc1', category: 'credit_card', currency: 'INR' } },
        ],
        [
          /\/api\/v1\/transactions$/,
          {
            data: [
              {
                id: 't1',
                date: '2026-01-05',
                entity: 'Shop',
                particulars: 'Groceries',
                inflow: 0,
                outflow: 50000,
                balance: -100000,
              },
            ],
            page_context: { has_more: false },
          },
        ],
      ]);

      const res = await post('/transactions').send({
        accountId: 'cc1',
        startDate: '2026-01-01',
      });

      const { data } = res.body;
      // Values are passed through unchanged: -100 -> -10000 cents, and a
      // purchase (outflow) stays negative.
      expect(data.startingBalance).toBe(-10000);
      expect(data.transactions.all[0].transactionAmount.amount).toBe(-50);
    });
  });

  describe('/balance', () => {
    it('returns the balance as of a day', async () => {
      configure();
      routeFetch([
        [/\/api\/v1\/accounts\/[^/]+\/balance$/, { data: { balance: 1234.5 } }],
      ]);

      const res = await post('/balance').send({
        accountId: 'a1',
        date: '2026-01-01',
      });

      expect(res.body.data.balance).toBe(1234.5);
    });

    it('returns a credit-card balance as-is (already negative in FOB)', async () => {
      configure();
      routeFetch([
        [
          /\/api\/v1\/accounts\/[^/]+\/balance$/,
          { data: { balance: -1234.5 } },
        ],
      ]);

      const res = await post('/balance').send({
        accountId: 'cc1',
        date: '2026-01-01',
      });

      expect(res.body.data.balance).toBe(-1234.5);
    });
  });
});
