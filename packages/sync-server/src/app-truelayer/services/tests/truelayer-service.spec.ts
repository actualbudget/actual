import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  balanceInCents,
  isImportableTransaction,
  normalizeTransaction,
  trueLayerService,
} from '#app-truelayer/services/truelayer-service';
import { TrueLayerError } from '#app-truelayer/utils/errors';
import { secretsService } from '#services/secrets-service';

vi.mock('../../../services/secrets-service', () => ({
  SecretName: {
    truelayer_clientId: 'truelayer_clientId',
    truelayer_clientSecret: 'truelayer_clientSecret',
    truelayer_connection: 'truelayer_connection',
    truelayer_account: 'truelayer_account',
  },
  secretsService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

const mockFetch = vi.hoisted(() => vi.fn());
vi.mock('undici', () => ({ fetch: mockFetch }));

function mockFetchResponse(data: unknown, ok = true, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

const store = new Map<string, string>();

function key(name: string, id?: string | null) {
  return id == null ? name : `${name}:${id}`;
}

describe('trueLayerService', () => {
  beforeEach(() => {
    store.clear();
    store.set('truelayer_clientId', 'client-id');
    store.set('truelayer_clientSecret', 'client-secret');
    vi.mocked(secretsService.get).mockImplementation(
      (name: string, id?: string | null) => store.get(key(name, id)) ?? null,
    );
    vi.mocked(secretsService.set).mockImplementation(
      (name: string, value: string, id?: string | null) => {
        store.set(key(name, id), value);
        return {};
      },
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('#normalizeTransaction', () => {
    it('signs debits negative and uses the merchant name as payee', () => {
      const result = normalizeTransaction(
        {
          transaction_id: 'tx-1',
          timestamp: '2026-11-06T00:00:00Z',
          description: 'CARD PAYMENT TO TESCO',
          amount: -12.5,
          currency: 'GBP',
          transaction_type: 'DEBIT',
          meta: { provider_merchant_name: 'Tesco' },
        },
        true,
      );

      expect(result).toEqual({
        transactionId: 'tx-1',
        date: '2026-11-06',
        bookingDate: '2026-11-06',
        transactionAmount: { amount: '-12.50', currency: 'GBP' },
        payeeName: 'Tesco',
        notes: 'CARD PAYMENT TO TESCO',
        remittanceInformationUnstructured: 'CARD PAYMENT TO TESCO',
        booked: true,
      });
    });

    it('signs card purchases reported as positive debits negative', () => {
      const result = normalizeTransaction(
        {
          transaction_id: 'tx-2',
          timestamp: '2026-11-05T10:00:00Z',
          amount: 20,
          currency: 'GBP',
          transaction_type: 'DEBIT',
        },
        true,
      );

      expect(result.transactionAmount.amount).toBe('-20.00');
    });

    it('signs credits positive and falls back to the description', () => {
      const result = normalizeTransaction(
        {
          transaction_id: 'tx-3',
          timestamp: '2026-11-04T00:00:00Z',
          description: ' SALARY ',
          amount: 1000,
          currency: 'GBP',
          transaction_type: 'CREDIT',
        },
        false,
      );

      expect(result.payeeName).toBe('SALARY');
      expect(result.transactionAmount.amount).toBe('1000.00');
      expect(result.booked).toBe(false);
    });

    it('rejects transactions without a usable date or id', () => {
      const missingDate = normalizeTransaction(
        {
          transaction_id: 'tx-4',
          timestamp: '',
          amount: 1,
          currency: 'GBP',
        },
        true,
      );
      const missingId = normalizeTransaction(
        {
          transaction_id: '',
          timestamp: '2026-11-04T00:00:00Z',
          amount: 1,
          currency: 'GBP',
        },
        true,
      );

      expect(isImportableTransaction(missingDate)).toBe(false);
      expect(isImportableTransaction(missingId)).toBe(false);
    });
  });

  describe('#balanceInCents', () => {
    it('returns account balances as cents', () => {
      expect(
        balanceInCents({ currency: 'GBP', current: 123.45 }, 'accounts'),
      ).toBe(12345);
    });

    it('returns amounts owed on cards as negative cents', () => {
      expect(balanceInCents({ currency: 'GBP', current: 50 }, 'cards')).toBe(
        -5000,
      );
    });
  });

  describe('#validateCredentials', () => {
    it('accepts credentials when only the probe code is rejected', async () => {
      mockFetchResponse({ error: 'invalid_grant' }, false, 400);

      await expect(
        trueLayerService.validateCredentials('id', 'secret'),
      ).resolves.toBeUndefined();
    });

    it('rejects an invalid client', async () => {
      mockFetchResponse({ error: 'invalid_client' }, false, 400);

      await expect(
        trueLayerService.validateCredentials('id', 'wrong'),
      ).rejects.toMatchObject({ error_code: 'INVALID_CLIENT' });
    });
  });

  describe('#buildAuthUrl', () => {
    it('requests offline access for UK providers', () => {
      const url = new URL(
        trueLayerService.buildAuthUrl(
          'https://budget.example.com/truelayer/auth_callback',
          'state-1',
        ),
      );

      expect(url.origin).toBe('https://auth.truelayer.com');
      expect(url.searchParams.get('client_id')).toBe('client-id');
      expect(url.searchParams.get('scope')).toContain('offline_access');
      expect(url.searchParams.get('redirect_uri')).toBe(
        'https://budget.example.com/truelayer/auth_callback',
      );
      expect(url.searchParams.get('state')).toBe('state-1');
    });
  });

  describe('connections', () => {
    it('links accounts and cards to the connection', async () => {
      mockFetchResponse({
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        expires_in: 3600,
      });
      const connectionId = await trueLayerService.createConnection(
        'code',
        'https://budget.example.com/truelayer/auth_callback',
      );

      mockFetch.mockImplementation(async (url: string) => {
        const results = url.endsWith('/accounts')
          ? [
              {
                account_id: 'acc-1',
                display_name: 'Current Account',
                currency: 'GBP',
                provider: { display_name: 'Barclays' },
              },
            ]
          : url.endsWith('/cards')
            ? [{ account_id: 'card-1', partial_card_number: '1234' }]
            : [{ currency: 'GBP', current: 10 }];
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve({ results }),
        };
      });

      const accounts = await trueLayerService.listAccounts(connectionId);

      expect(accounts).toEqual([
        {
          account_id: 'acc-1',
          name: 'Current Account',
          institution: 'Barclays',
          currency: 'GBP',
          balance: 1000,
        },
        {
          account_id: 'card-1',
          name: 'Card 1234',
          institution: 'TrueLayer',
          currency: undefined,
          balance: -1000,
        },
      ]);
      expect(JSON.parse(store.get('truelayer_account:card-1')!)).toEqual({
        connectionId,
        kind: 'cards',
      });
    });

    it('refreshes an expired access token and keeps the refresh token', async () => {
      store.set(
        'truelayer_connection:conn-1',
        JSON.stringify({
          accessToken: 'old',
          refreshToken: 'refresh-1',
          expiresAt: Date.now() - 1000,
        }),
      );
      store.set(
        'truelayer_account:acc-1',
        JSON.stringify({ connectionId: 'conn-1', kind: 'accounts' }),
      );

      mockFetchResponse({ access_token: 'new', expires_in: 3600 });
      mockFetch.mockImplementation(async () => ({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [] }),
      }));

      await trueLayerService.getTransactions('acc-1', '2026-01-01');

      const refreshCall = mockFetch.mock.calls[0];
      expect(refreshCall[0]).toBe('https://auth.truelayer.com/connect/token');
      expect(String(refreshCall[1].body)).toContain('grant_type=refresh_token');
      expect(mockFetch.mock.calls[1][1].headers.Authorization).toBe(
        'Bearer new',
      );
      expect(
        JSON.parse(store.get('truelayer_connection:conn-1')!),
      ).toMatchObject({ accessToken: 'new', refreshToken: 'refresh-1' });
    });

    it('asks for re-authorisation when the refresh token is rejected', async () => {
      store.set(
        'truelayer_connection:conn-1',
        JSON.stringify({
          accessToken: 'old',
          refreshToken: 'expired',
          expiresAt: 0,
        }),
      );
      store.set(
        'truelayer_account:acc-1',
        JSON.stringify({ connectionId: 'conn-1', kind: 'accounts' }),
      );
      mockFetchResponse({ error: 'invalid_grant' }, false, 400);

      const error = await trueLayerService
        .getTransactions('acc-1', '2026-01-01')
        .catch(e => e);

      expect(error).toBeInstanceOf(TrueLayerError);
      expect(error.error_code).toBe('ITEM_LOGIN_REQUIRED');
    });

    it('asks for re-authorisation for an unknown account', async () => {
      await expect(
        trueLayerService.getTransactions('missing', '2026-01-01'),
      ).rejects.toMatchObject({ error_code: 'ITEM_LOGIN_REQUIRED' });
    });
  });
});
