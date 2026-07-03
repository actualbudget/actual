import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SecretName, secretsService } from '#services/secrets-service';

import {
  mockAccount,
  mockDebitTransaction,
  mockPendingTransaction,
  mockPendingTransactionNoDate,
} from './services/tests/fixtures';

// The SDK is not installed in this environment (and would require live
// credentials anyway), so stub it. The factory prevents Vitest from resolving
// the real module.
const { mockGetAccounts, mockGetTransactions, mockFromBundle } = vi.hoisted(
  () => ({
    mockGetAccounts: vi.fn(),
    mockGetTransactions: vi.fn(),
    mockFromBundle: vi.fn(),
  }),
);

vi.mock('@open-banking-io/client', () => ({
  OpenBankingClient: {
    fromBundle: mockFromBundle,
  },
}));

const VALID_CREDS = JSON.stringify({
  bundle: 'abc',
  keys: [],
  apiBaseUrl: 'https://api.open-banking.io',
});

const post = path =>
  request(app).post(path).set('x-actual-token', 'valid-token');

const ids = txns => txns.map(t => t.transactionId);

// Import after the mock is registered.
const { handlers: app } = await import('./app-openbankingio');

describe('app-openbankingio', () => {
  beforeEach(() => {
    mockFromBundle.mockReturnValue({
      getAccounts: mockGetAccounts,
      getTransactions: mockGetTransactions,
    });
    secretsService.set(SecretName.openbankingio_credentials, null);
    vi.spyOn(console, 'log').mockImplementation(vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('/status', () => {
    it('reports configured when credentials are stored', async () => {
      secretsService.set(SecretName.openbankingio_credentials, VALID_CREDS);

      const res = await post('/status');

      expect(res.body.data.configured).toBe(true);
    });

    it('reports not configured when no credentials are stored', async () => {
      const res = await post('/status');

      expect(res.body.data.configured).toBe(false);
    });
  });

  describe('/accounts', () => {
    it('returns normalized accounts', async () => {
      secretsService.set(SecretName.openbankingio_credentials, VALID_CREDS);
      mockGetAccounts.mockResolvedValue([mockAccount]);

      const res = await post('/accounts');

      expect(res.body.status).toBe('ok');
      expect(res.body.data.accounts).toEqual([
        {
          account_id: '07cc67f4-45d6-494b-adac-09b5cbc7e2b5',
          name: 'Current Account',
          institution: 'Nordea',
          balance: 123456,
        },
      ]);
    });

    it('surfaces SDK errors through handleError as INTERNAL_ERROR', async () => {
      secretsService.set(SecretName.openbankingio_credentials, VALID_CREDS);
      mockGetAccounts.mockRejectedValue(new Error('decrypt failed'));

      const res = await post('/accounts');

      expect(res.body.data.error_code).toBe('INTERNAL_ERROR');
      expect(res.body.data.error_type).toBe('decrypt failed');
    });

    it('rejects an apiBaseUrl outside the open-banking.io domain (SSRF guard)', async () => {
      secretsService.set(
        SecretName.openbankingio_credentials,
        JSON.stringify({
          bundle: 'abc',
          keys: [],
          apiBaseUrl: 'http://169.254.169.254/latest/meta-data/',
        }),
      );

      const res = await post('/accounts');

      // The SDK is never reached once the URL is rejected.
      expect(mockGetAccounts).not.toHaveBeenCalled();
      expect(res.body.data.error_code).toBe('INTERNAL_ERROR');
    });
  });

  describe('/transactions', () => {
    it('returns INVALID_INPUT when accountId or startDate is missing', async () => {
      secretsService.set(SecretName.openbankingio_credentials, VALID_CREDS);

      const res = await post('/transactions').send({ accountId: 'acc-1' });

      expect(res.body.data.error_code).toBe('INVALID_INPUT');
    });

    it('returns balances, startingBalance from ITBD, and bucketed transactions', async () => {
      secretsService.set(SecretName.openbankingio_credentials, VALID_CREDS);
      mockGetAccounts.mockResolvedValue([mockAccount]);
      mockGetTransactions.mockResolvedValue({
        items: [mockDebitTransaction, mockPendingTransaction],
        total: 2,
      });

      const res = await post('/transactions').send({
        accountId: '07cc67f4-45d6-494b-adac-09b5cbc7e2b5',
        startDate: '2026-03-01',
      });

      expect(res.body.status).toBe('ok');
      expect(res.body.data.startingBalance).toBe(123456);
      expect(res.body.data.balances[0].balanceType).toBe('ITBD');
      expect(res.body.data.balances[0].balanceAmount).toEqual({
        amount: 123456,
        currency: 'EUR',
      });

      const { all, booked, pending } = res.body.data.transactions;
      expect(ids(all)).toEqual(['ref-002', 'tx-003']);
      expect(ids(booked)).toEqual(['ref-002']);
      expect(ids(pending)).toEqual(['tx-003']);
    });

    it('skips a date-less pending transaction that would abort the sync', async () => {
      secretsService.set(SecretName.openbankingio_credentials, VALID_CREDS);
      mockGetAccounts.mockResolvedValue([mockAccount]);
      mockGetTransactions.mockResolvedValue({
        items: [
          mockDebitTransaction,
          mockPendingTransaction,
          mockPendingTransactionNoDate,
        ],
        total: 3,
      });

      const res = await post('/transactions').send({
        accountId: '07cc67f4-45d6-494b-adac-09b5cbc7e2b5',
        startDate: '2026-03-01',
      });

      const { all } = res.body.data.transactions;
      expect(ids(all)).toEqual(['ref-002', 'tx-003']);
      expect(ids(all)).not.toContain('tx-no-date');
    });

    it('keeps paginating while pages are full and stops on a short page (no reliance on total)', async () => {
      secretsService.set(SecretName.openbankingio_credentials, VALID_CREDS);
      mockGetAccounts.mockResolvedValue([mockAccount]);
      // A full page (=== the page limit) means "there may be more". Note: no
      // `total` field is returned, proving pagination doesn't depend on it.
      const fullPage = Array.from({ length: 500 }, (_, i) => ({
        ...mockDebitTransaction,
        id: `p1-${i}`,
      }));
      mockGetTransactions
        .mockResolvedValueOnce({ items: fullPage })
        .mockResolvedValueOnce({ items: [mockPendingTransaction] });

      const res = await post('/transactions').send({
        accountId: '07cc67f4-45d6-494b-adac-09b5cbc7e2b5',
        startDate: '2026-03-01',
      });

      expect(mockGetTransactions).toHaveBeenCalledTimes(2);
      expect(mockGetTransactions).toHaveBeenNthCalledWith(
        1,
        '07cc67f4-45d6-494b-adac-09b5cbc7e2b5',
        { from: '2026-03-01', limit: 500, offset: 0 },
      );
      expect(mockGetTransactions).toHaveBeenNthCalledWith(
        2,
        '07cc67f4-45d6-494b-adac-09b5cbc7e2b5',
        { from: '2026-03-01', limit: 500, offset: 500 },
      );
      expect(res.body.data.transactions.all).toHaveLength(501);
    });
  });
});
