import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  balanceCurrencies,
  balanceInCents,
  normalizeTransactions,
  stripeService,
} from '#app-stripe/services/stripe-service';
import { secretsService } from '#services/secrets-service';

vi.mock('../../../services/secrets-service', () => ({
  SecretName: {
    stripe_key: 'stripe_key',
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

const CHARGE = {
  id: 'txn_1',
  amount: 500,
  fee: 40,
  net: 460,
  currency: 'gbp',
  created: Date.parse('2026-10-25T12:00:00Z') / 1000,
  description: 'Subscription creation',
  source: 'ch_1',
  status: 'available',
  type: 'charge',
};

describe('stripeService', () => {
  beforeEach(() => {
    vi.mocked(secretsService.get).mockImplementation((name: string) =>
      name === 'stripe_key' ? 'rk_test_key' : null,
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('#normalizeTransactions', () => {
    it('imports the gross amount and the fee as a separate outflow', () => {
      expect(normalizeTransactions(CHARGE)).toEqual([
        {
          transactionId: 'txn_1',
          date: '2026-10-25',
          bookingDate: '2026-10-25',
          transactionAmount: { amount: '5.00', currency: 'GBP' },
          payeeName: 'Subscription creation',
          notes: 'charge: Subscription creation',
          remittanceInformationUnstructured: 'charge: Subscription creation',
          booked: true,
        },
        {
          transactionId: 'txn_1-fee',
          date: '2026-10-25',
          bookingDate: '2026-10-25',
          transactionAmount: { amount: '-0.40', currency: 'GBP' },
          payeeName: 'Stripe',
          notes: 'Stripe fee for charge',
          remittanceInformationUnstructured: 'Stripe fee for charge',
          booked: true,
        },
      ]);
    });

    it('names payouts after the bank they go to', () => {
      const [payout] = normalizeTransactions({
        ...CHARGE,
        id: 'txn_2',
        amount: -460,
        fee: 0,
        description: 'STRIPE PAYOUT',
        type: 'payout',
      });

      expect(payout.payeeName).toBe('Stripe payout');
      expect(payout.transactionAmount.amount).toBe('-4.60');
    });

    it('leaves out a fee line when there is no fee', () => {
      expect(normalizeTransactions({ ...CHARGE, fee: 0 })).toHaveLength(1);
    });

    it('marks transactions that are not yet available as pending', () => {
      const [main, fee] = normalizeTransactions({
        ...CHARGE,
        status: 'pending',
      });

      expect(main.booked).toBe(false);
      expect(fee.booked).toBe(false);
    });
  });

  describe('#balanceInCents', () => {
    it('adds available and pending funds of one currency', () => {
      const balance = {
        available: [
          { amount: 1000, currency: 'gbp' },
          { amount: 700, currency: 'usd' },
        ],
        pending: [{ amount: 250, currency: 'gbp' }],
      };

      expect(balanceInCents(balance, 'GBP')).toBe(1250);
      expect(balanceCurrencies(balance)).toEqual(['gbp', 'usd']);
    });
  });

  describe('#getTransactions', () => {
    it('pages through balance transactions of the account currency', async () => {
      mockFetch
        .mockResolvedValueOnce(respond({ data: [CHARGE], has_more: true }))
        .mockResolvedValueOnce(
          respond({ data: [{ ...CHARGE, id: 'txn_0' }], has_more: false }),
        )
        .mockResolvedValueOnce(
          respond({ available: [{ amount: 0, currency: 'gbp' }], pending: [] }),
        );

      const result = await stripeService.getTransactions(
        'stripe-gbp',
        '2026-10-01',
      );

      expect(result.transactions.map(tx => tx.id)).toEqual(['txn_1', 'txn_0']);
      const first = new URL(mockFetch.mock.calls[0][0]);
      expect(first.pathname).toBe('/v1/balance_transactions');
      expect(first.searchParams.get('currency')).toBe('gbp');
      expect(first.searchParams.get('created[gte]')).toBe(
        String(Date.parse('2026-10-01T00:00:00Z') / 1000),
      );
      expect(
        new URL(mockFetch.mock.calls[1][0]).searchParams.get('starting_after'),
      ).toBe('txn_1');
      expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe(
        `Basic ${Buffer.from('rk_test_key:').toString('base64')}`,
      );
    });

    it('refuses an account that is not a Stripe balance', async () => {
      await expect(
        stripeService.getTransactions('acc-1', '2026-10-01'),
      ).rejects.toMatchObject({ error_code: 'ACCOUNT_MISSING' });
    });

    it('reports a revoked key as an invalid access token', async () => {
      mockFetch.mockResolvedValueOnce(
        respond({ error: { message: 'Invalid API Key provided' } }, false, 401),
      );

      await expect(
        stripeService.getTransactions('stripe-gbp', '2026-10-01'),
      ).rejects.toMatchObject({
        error_type: 'INVALID_INPUT',
        error_code: 'INVALID_ACCESS_TOKEN',
        message: 'Invalid API Key provided',
      });
    });

    it('fails when no key is stored', async () => {
      vi.mocked(secretsService.get).mockReturnValue(null);

      await expect(
        stripeService.getTransactions('stripe-gbp', '2026-10-01'),
      ).rejects.toMatchObject({ error_code: 'NOT_CONFIGURED' });
    });
  });

  describe('#listAccounts', () => {
    it('offers one account per balance currency', async () => {
      mockFetch.mockResolvedValueOnce(
        respond({
          available: [{ amount: 1200, currency: 'gbp' }],
          pending: [{ amount: 300, currency: 'gbp' }],
        }),
      );

      expect(await stripeService.listAccounts()).toEqual([
        {
          account_id: 'stripe-gbp',
          name: 'Stripe GBP',
          institution: 'Stripe',
          currency: 'GBP',
          balance: 1500,
        },
      ]);
    });
  });
});
