import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  balanceInCents,
  normalizeTransactions,
  payPalService,
  windows,
} from '#app-paypal/services/paypal-service';
import { secretsService } from '#services/secrets-service';

vi.mock('../../../services/secrets-service', () => ({
  SecretName: {
    paypal_clientId: 'paypal_clientId',
    paypal_clientSecret: 'paypal_clientSecret',
  },
  secretsService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

const mockFetch = vi.hoisted(() => vi.fn());
vi.mock('undici', () => ({ fetch: mockFetch }));

function respond(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  };
}

const SUBSCRIPTION = {
  transaction_info: {
    transaction_id: '6CK50549957730345',
    transaction_event_code: 'T0002',
    transaction_initiation_date: '2024-09-01T10:29:46Z',
    transaction_amount: { currency_code: 'GBP', value: '5.00' },
    fee_amount: { currency_code: 'GBP', value: '-0.45' },
    transaction_status: 'S',
    transaction_subject: 'Monthly ',
  },
  payer_info: {
    email_address: 'payer@example.com',
    payer_name: { alternate_full_name: 'Jane Doe' },
  },
};

const DAY = 24 * 60 * 60 * 1000;

describe('payPalService', () => {
  beforeEach(() => {
    vi.mocked(secretsService.get).mockImplementation((name: string) =>
      name === 'paypal_clientId'
        ? 'client-id'
        : name === 'paypal_clientSecret'
          ? 'client-secret'
          : null,
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('#normalizeTransactions', () => {
    it('imports the gross amount and the fee as a separate outflow', () => {
      expect(normalizeTransactions(SUBSCRIPTION)).toEqual([
        {
          transactionId: '6CK50549957730345',
          date: '2024-09-01',
          bookingDate: '2024-09-01',
          transactionAmount: { amount: '5.00', currency: 'GBP' },
          payeeName: 'Jane Doe',
          notes: 'T0002: Monthly',
          remittanceInformationUnstructured: 'T0002: Monthly',
          booked: true,
        },
        {
          transactionId: '6CK50549957730345-fee',
          date: '2024-09-01',
          bookingDate: '2024-09-01',
          transactionAmount: { amount: '-0.45', currency: 'GBP' },
          payeeName: 'PayPal',
          notes: 'PayPal fee for 6CK50549957730345',
          remittanceInformationUnstructured: 'PayPal fee for 6CK50549957730345',
          booked: true,
        },
      ]);
    });

    it('falls back to the payer email, then the subject, for the payee', () => {
      const [byEmail] = normalizeTransactions({
        ...SUBSCRIPTION,
        payer_info: { email_address: 'payer@example.com' },
      });
      const [bySubject] = normalizeTransactions({
        transaction_info: SUBSCRIPTION.transaction_info,
      });

      expect(byEmail.payeeName).toBe('payer@example.com');
      expect(bySubject.payeeName).toBe('Monthly');
    });

    it('keeps holds and their releases so the balance adds up', () => {
      const hold = normalizeTransactions({
        transaction_info: {
          transaction_id: 'HOLD',
          transaction_event_code: 'T1501',
          transaction_initiation_date: '2025-01-10T09:00:00Z',
          transaction_amount: { currency_code: 'GBP', value: '-142.08' },
          transaction_status: 'S',
        },
      });

      expect(hold).toHaveLength(1);
      expect(hold[0].transactionAmount.amount).toBe('-142.08');
    });

    it('marks pending payments and drops denied ones', () => {
      const [pending] = normalizeTransactions({
        ...SUBSCRIPTION,
        transaction_info: {
          ...SUBSCRIPTION.transaction_info,
          transaction_status: 'P',
        },
      });
      const denied = normalizeTransactions({
        ...SUBSCRIPTION,
        transaction_info: {
          ...SUBSCRIPTION.transaction_info,
          transaction_status: 'D',
        },
      });

      expect(pending.booked).toBe(false);
      expect(denied).toEqual([]);
    });
  });

  describe('#windows', () => {
    it('splits the range into windows of at most 31 days', () => {
      const now = Date.parse('2026-03-15T12:00:00Z');
      const result = windows('2026-01-01', now);

      expect(result).toHaveLength(3);
      expect(new Date(result[0][0]).toISOString()).toBe(
        '2026-01-01T00:00:00.000Z',
      );
      for (const [start, end] of result) {
        expect(end - start).toBeLessThan(31 * DAY);
      }
      expect(result[1][0] - result[0][1]).toBe(1000);
      expect(result.at(-1)?.[1]).toBe(now);
    });

    it('does not ask for more than three years of history', () => {
      const now = Date.parse('2026-11-14T00:00:00Z');
      const [[start]] = windows('2020-01-01', now);

      expect(now - start).toBeLessThan(3 * 365 * DAY);
    });
  });

  describe('#getTransactions', () => {
    it('fetches every page of every window for the account currency', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.endsWith('/v1/oauth2/token')) {
          return respond({ access_token: 'token', expires_in: 3600 });
        }
        if (url.includes('/v1/reporting/balances')) {
          return respond({
            balances: [
              {
                currency: 'GBP',
                primary: true,
                total_balance: { currency_code: 'GBP', value: '4.49' },
              },
            ],
          });
        }
        const page = new URL(url).searchParams.get('page');
        return respond({
          transaction_details:
            page === '1' ? [SUBSCRIPTION] : [{ ...SUBSCRIPTION }],
          total_pages: 2,
          page: Number(page),
        });
      });

      const now = Date.parse('2026-02-10T00:00:00Z');
      const result = await payPalService.getTransactions(
        'paypal-gbp',
        '2026-01-01',
        now,
      );

      const searches = mockFetch.mock.calls
        .map(([url]) => String(url))
        .filter(url => url.includes('/v1/reporting/transactions'))
        .map(url => new URL(url).searchParams);
      expect(searches).toHaveLength(4);
      expect(searches.map(params => params.get('page'))).toEqual([
        '1',
        '2',
        '1',
        '2',
      ]);
      expect(searches[0].get('transaction_currency')).toBe('GBP');
      expect(searches[0].get('fields')).toBe('all');
      expect(searches[0].get('start_date')).toBe('2026-01-01T00:00:00-0000');
      expect(result.details).toHaveLength(4);
      expect(balanceInCents(result.balances, 'GBP')).toBe(449);
    });

    it('reports rejected credentials as an invalid access token', async () => {
      mockFetch.mockResolvedValueOnce(
        respond(
          {
            error: 'invalid_client',
            error_description: 'Client Authentication failed',
          },
          false,
          401,
        ),
      );

      await expect(
        payPalService.getTransactions('paypal-gbp', '2026-01-01'),
      ).rejects.toMatchObject({
        error_code: 'INVALID_ACCESS_TOKEN',
        message: 'Client Authentication failed',
      });
    });

    it('refuses an account that is not a PayPal balance', async () => {
      await expect(
        payPalService.getTransactions('other-gbp', '2026-01-01'),
      ).rejects.toMatchObject({ error_code: 'ACCOUNT_MISSING' });
    });
  });
});
