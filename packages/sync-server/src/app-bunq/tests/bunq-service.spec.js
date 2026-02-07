import { SecretName, secretsService } from '../../services/secrets-service';
import { BunqRateLimitError } from '../errors';
import { BunqClient } from '../services/bunq-client';
import { generateBunqKeyPair } from '../services/bunq-crypto';
import {
  bunqService,
  extractPaginationCursor,
  normalizeBunqPayment,
} from '../services/bunq-service';

describe('bunq-service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes bunq payment into bank sync transaction shape', () => {
    const tx = normalizeBunqPayment({
      id: 1001,
      created: '2026-01-03T10:10:10+00:00',
      description: 'Coffee',
      amount: { value: '-4.95', currency: 'EUR' },
      counterparty_alias: { display_name: 'Cafe Bar' },
    });

    expect(tx).toMatchObject({
      booked: true,
      date: '2026-01-03',
      payeeName: 'Cafe Bar',
      notes: 'Coffee',
      transactionAmount: {
        amount: '-4.95',
        currency: 'EUR',
      },
      transactionId: '1001',
      internalTransactionId: '1001',
    });
  });

  it('extracts cursor semantics from pagination links', () => {
    const cursor = extractPaginationCursor({
      Pagination: {
        older_url:
          '/v1/user/1/monetary-account/2/payment?older_id=111&count=200',
        newer_url:
          '/v1/user/1/monetary-account/2/payment?newer_id=987&count=200',
      },
    });

    expect(cursor).toEqual({
      olderId: '111',
      newerId: '987',
      futureId: null,
    });
  });

  it('supports incremental cursor flow and advances newerId', async () => {
    const { privateKeyPem } = generateBunqKeyPair();

    const secretMap = new Map([
      [SecretName.bunq_apiKey, 'api-key'],
      [SecretName.bunq_environment, 'sandbox'],
      [SecretName.bunq_clientPrivateKey, privateKeyPem],
      [SecretName.bunq_installationToken, 'installation-token'],
      [SecretName.bunq_serverPublicKey, 'server-public-key'],
      [SecretName.bunq_sessionToken, 'session-token'],
      [SecretName.bunq_userId, '44'],
    ]);

    vi.spyOn(secretsService, 'get').mockImplementation(name => {
      return secretMap.get(name) ?? null;
    });
    vi.spyOn(secretsService, 'set').mockImplementation((name, value) => {
      secretMap.set(name, value);
      return { changes: 1 };
    });

    const listPayments = vi
      .spyOn(BunqClient.prototype, 'listPayments')
      .mockResolvedValueOnce({
        Response: [
          {
            Payment: {
              id: 101,
              created: '2026-01-03T12:00:00+00:00',
              description: 'Lunch',
              amount: { value: '-12.30', currency: 'EUR' },
              counterparty_alias: { display_name: 'Canteen' },
            },
          },
          {
            Payment: {
              id: 102,
              created: '2026-01-04T12:00:00+00:00',
              description: 'Train',
              amount: { value: '-6.70', currency: 'EUR' },
              counterparty_alias: { display_name: 'Railway' },
            },
          },
        ],
        Pagination: {
          newer_url:
            '/v1/user/44/monetary-account/acc-1/payment?count=200&newer_id=105',
        },
      })
      .mockResolvedValueOnce({
        Response: [
          {
            Payment: {
              id: 106,
              created: '2026-01-05T12:00:00+00:00',
              description: 'Groceries',
              amount: { value: '-32.10', currency: 'EUR' },
              counterparty_alias: { display_name: 'Market' },
            },
          },
        ],
        Pagination: {
          newer_url:
            '/v1/user/44/monetary-account/acc-1/payment?count=200&newer_id=105',
        },
      });

    vi.spyOn(BunqClient.prototype, 'listMonetaryAccounts').mockResolvedValue({
      Response: [
        {
          MonetaryAccountBank: {
            id: 'acc-1',
            description: 'Main account',
            currency: 'EUR',
            balance: { value: '345.67' },
            alias: [{ type: 'IBAN', value: 'NL00BUNQ1234567890' }],
          },
        },
      ],
    });

    const res = await bunqService.listTransactions({
      accountId: 'acc-1',
      cursor: { newerId: '100' },
    });

    expect(listPayments).toHaveBeenNthCalledWith(1, '44', 'acc-1', {
      count: 200,
      newerId: '100',
    });
    expect(listPayments).toHaveBeenNthCalledWith(2, '44', 'acc-1', {
      count: 200,
      newerId: '105',
    });
    expect(res.transactions.all).toHaveLength(3);
    expect(res.cursor).toEqual({ newerId: '106' });
  });

  it('maps transaction error path to provider error payload', async () => {
    const { privateKeyPem } = generateBunqKeyPair();

    const secretMap = new Map([
      [SecretName.bunq_apiKey, 'api-key'],
      [SecretName.bunq_environment, 'sandbox'],
      [SecretName.bunq_clientPrivateKey, privateKeyPem],
      [SecretName.bunq_installationToken, 'installation-token'],
      [SecretName.bunq_serverPublicKey, 'server-public-key'],
      [SecretName.bunq_sessionToken, 'session-token'],
      [SecretName.bunq_userId, '44'],
    ]);

    vi.spyOn(secretsService, 'get').mockImplementation(name => {
      return secretMap.get(name) ?? null;
    });
    vi.spyOn(secretsService, 'set').mockImplementation(() => ({ changes: 1 }));

    vi.spyOn(BunqClient.prototype, 'listPayments').mockRejectedValue(
      new BunqRateLimitError('Bunq rate limit exceeded'),
    );

    const res = await bunqService.listTransactions({
      accountId: 'acc-1',
      cursor: { newerId: '100' },
    });

    expect(res).toEqual({
      error_type: 'RATE_LIMIT_ERROR',
      error_code: 'RATE_LIMIT_ERROR',
      reason: 'Bunq rate limit exceeded',
    });
  });

  it('maps account listing error path to provider error payload', async () => {
    const { privateKeyPem } = generateBunqKeyPair();

    const secretMap = new Map([
      [SecretName.bunq_apiKey, 'api-key'],
      [SecretName.bunq_environment, 'sandbox'],
      [SecretName.bunq_clientPrivateKey, privateKeyPem],
      [SecretName.bunq_installationToken, 'installation-token'],
      [SecretName.bunq_serverPublicKey, 'server-public-key'],
      [SecretName.bunq_sessionToken, 'session-token'],
      [SecretName.bunq_userId, '44'],
    ]);

    vi.spyOn(secretsService, 'get').mockImplementation(name => {
      return secretMap.get(name) ?? null;
    });
    vi.spyOn(secretsService, 'set').mockImplementation(() => ({ changes: 1 }));

    vi.spyOn(BunqClient.prototype, 'listMonetaryAccounts').mockRejectedValue(
      new BunqRateLimitError('Bunq request failed'),
    );

    const res = await bunqService.listAccounts();

    expect(res).toEqual({
      error_type: 'RATE_LIMIT_ERROR',
      error_code: 'RATE_LIMIT_ERROR',
      reason: 'Bunq request failed',
    });
  });

  it('lists only active monetary accounts', async () => {
    const { privateKeyPem } = generateBunqKeyPair();

    const secretMap = new Map([
      [SecretName.bunq_apiKey, 'api-key'],
      [SecretName.bunq_environment, 'sandbox'],
      [SecretName.bunq_clientPrivateKey, privateKeyPem],
      [SecretName.bunq_installationToken, 'installation-token'],
      [SecretName.bunq_serverPublicKey, 'server-public-key'],
      [SecretName.bunq_sessionToken, 'session-token'],
      [SecretName.bunq_userId, '44'],
    ]);

    vi.spyOn(secretsService, 'get').mockImplementation(name => {
      return secretMap.get(name) ?? null;
    });
    vi.spyOn(secretsService, 'set').mockImplementation(() => ({ changes: 1 }));

    vi.spyOn(BunqClient.prototype, 'listMonetaryAccounts').mockResolvedValue({
      Response: [
        {
          MonetaryAccountBank: {
            id: 1,
            description: 'Main active',
            status: 'ACTIVE',
            currency: 'EUR',
            balance: { value: '100.00' },
            alias: [{ type: 'IBAN', value: 'NL00BUNQ0000000001' }],
          },
        },
        {
          MonetaryAccountBank: {
            id: 2,
            description: 'Old closed',
            status: 'CANCELLED',
            currency: 'EUR',
            balance: { value: '50.00' },
            alias: [{ type: 'IBAN', value: 'NL00BUNQ0000000002' }],
          },
        },
        {
          MonetaryAccountSavings: {
            id: 3,
            description: 'Savings active',
            status: 'ACTIVE',
            currency: 'EUR',
            balance: { value: '300.00' },
            alias: [{ type: 'IBAN', value: 'NL00BUNQ0000000003' }],
          },
        },
      ],
    });

    const res = await bunqService.listAccounts();

    expect(res.accounts).toHaveLength(2);
    expect(res.accounts.map(account => account.account_id)).toEqual(['1', '3']);
  });
});
