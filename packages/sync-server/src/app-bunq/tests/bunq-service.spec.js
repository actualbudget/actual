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

  it('maps Bunq event category type into transactionCategory without mutating notes', () => {
    const tx = normalizeBunqPayment(
      {
        id: 1002,
        created: '2026-01-03T10:10:10+00:00',
        description: 'Salary payout',
        amount: { value: '2400.00', currency: 'EUR' },
        counterparty_alias: { display_name: 'Employer' },
      },
      'GENERAL',
    );

    expect(tx.notes).toBe('Salary payout');
    expect(tx.transactionCategory).toBe('General');
  });

  it('keeps notes empty when payment description is missing and category exists', () => {
    const tx = normalizeBunqPayment(
      {
        id: 1003,
        created: '2026-01-03T10:10:10+00:00',
        amount: { value: '-12.34', currency: 'EUR' },
      },
      'GENERAL',
    );

    expect(tx.notes).toBeNull();
    expect(tx.transactionCategory).toBe('General');
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
      olderUrl: '/v1/user/1/monetary-account/2/payment?older_id=111&count=200',
      newerUrl: '/v1/user/1/monetary-account/2/payment?newer_id=987&count=200',
      futureUrl: null,
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

    vi.spyOn(BunqClient.prototype, 'listEvents').mockResolvedValue({
      Response: [
        {
          Event: {
            id: 9001,
            object: { Payment: { id: 101 } },
            additional_transaction_information: {
              category: { type: 'GENERAL' },
            },
          },
        },
        {
          Event: {
            id: 9002,
            object_data_at_event: { Payment: { id: 106 } },
            additional_transaction_information: {
              category: { type: 'INCOME' },
            },
          },
        },
      ],
      Pagination: {
        older_url: null,
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
      paginationUrl: null,
    });
    expect(listPayments).toHaveBeenNthCalledWith(2, '44', 'acc-1', {
      count: undefined,
      newerId: undefined,
      paginationUrl:
        '/v1/user/44/monetary-account/acc-1/payment?count=200&newer_id=105',
    });
    expect(res.transactions.all).toHaveLength(3);
    expect(res.transactions.all.find(t => t.transactionId === '106')?.notes).toBe(
      'Groceries',
    );
    expect(
      res.transactions.all.find(t => t.transactionId === '106')?.transactionCategory,
    ).toBe('Income');
    expect(res.transactions.all.find(t => t.transactionId === '102')?.notes).toBe(
      'Train',
    );
    expect(res.transactions.all.find(t => t.transactionId === '101')?.notes).toBe('Lunch');
    expect(
      res.transactions.all.find(t => t.transactionId === '101')?.transactionCategory,
    ).toBe('General');
    expect(res.cursor).toEqual({ newerId: '106' });
  });

  it('uses pagination URL for event traversal after first listEvents page', async () => {
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

    vi.spyOn(BunqClient.prototype, 'listPayments').mockResolvedValue({
      Response: [
        {
          Payment: {
            id: 3001,
            created: '2026-01-05T12:00:00+00:00',
            description: 'Groceries',
            amount: { value: '-32.10', currency: 'EUR' },
            counterparty_alias: { display_name: 'Market' },
          },
        },
      ],
      Pagination: {
        newer_url: null,
      },
    });

    const listEvents = vi
      .spyOn(BunqClient.prototype, 'listEvents')
      .mockResolvedValueOnce({
        Response: [
          {
            Event: {
              id: 9101,
              object: { Payment: { id: 9999 } },
            },
          },
        ],
        Pagination: {
          older_url: '/v1/user/44/event?count=200&older_id=700',
        },
      })
      .mockResolvedValueOnce({
        Response: [
          {
            Event: {
              id: 9102,
              object: { Payment: { id: 3001 } },
              additional_transaction_information: {
                category: { type: 'GENERAL' },
              },
            },
          },
        ],
        Pagination: {
          older_url: null,
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
      cursor: { newerId: '3000' },
    });

    expect(res.transactions.all).toHaveLength(1);
    expect(listEvents).toHaveBeenNthCalledWith(1, '44', {
      count: 200,
      olderId: null,
      monetaryAccountId: 'acc-1',
      displayUserEvent: false,
      paginationUrl: null,
    });
    expect(listEvents).toHaveBeenNthCalledWith(2, '44', {
      count: undefined,
      olderId: undefined,
      monetaryAccountId: undefined,
      displayUserEvent: undefined,
      paginationUrl: '/v1/user/44/event?count=200&older_id=700',
    });
  });

  it('stops payments pagination when time budget is exceeded', async () => {
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

    let nowTick = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => nowTick);

    const listPayments = vi
      .spyOn(BunqClient.prototype, 'listPayments')
      .mockResolvedValue({
        Response: [
          {
            Payment: {
              id: 3201,
              created: '2026-01-05T12:00:00+00:00',
              description: 'Budget stop test',
              amount: { value: '-32.10', currency: 'EUR' },
              counterparty_alias: { display_name: 'Market' },
            },
          },
        ],
        Pagination: {
          newer_url:
            '/v1/user/44/monetary-account/acc-1/payment?count=200&newer_id=3202',
        },
      });

    listPayments.mockImplementationOnce(async () => {
      nowTick = 25_000;
      return {
        Response: [
          {
            Payment: {
              id: 3201,
              created: '2026-01-05T12:00:00+00:00',
              description: 'Budget stop test',
              amount: { value: '-32.10', currency: 'EUR' },
              counterparty_alias: { display_name: 'Market' },
            },
          },
        ],
        Pagination: {
          newer_url:
            '/v1/user/44/monetary-account/acc-1/payment?count=200&newer_id=3202',
        },
      };
    });

    vi.spyOn(BunqClient.prototype, 'listEvents').mockResolvedValue({
      Response: [],
      Pagination: {
        older_url: null,
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
      cursor: { newerId: '3200' },
    });

    expect(listPayments).toHaveBeenCalledTimes(1);
    expect(res.transactions.all).toHaveLength(1);
    expect(res.cursor).toEqual({ newerId: '3201' });
  });

  it('stops event pagination when category mapping progress stalls', async () => {
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

    vi.spyOn(BunqClient.prototype, 'listPayments').mockResolvedValue({
      Response: [
        {
          Payment: {
            id: 3301,
            created: '2026-01-05T12:00:00+00:00',
            description: 'Groceries',
            amount: { value: '-32.10', currency: 'EUR' },
            counterparty_alias: { display_name: 'Market' },
          },
        },
      ],
      Pagination: {
        newer_url: null,
      },
    });

    const listEvents = vi
      .spyOn(BunqClient.prototype, 'listEvents')
      .mockImplementation(async (_userId, pagination) => {
        const pageNumber = listEvents.mock.calls.length;
        return {
          Response: Array.from({ length: 200 }, (_, index) => ({
            Event: {
              id: 10_000 + pageNumber * 1_000 + index,
              created: '2026-01-05T12:00:00+00:00',
              object: {
                Payment: {
                  id: 90_000 + pageNumber * 1_000 + index,
                },
              },
              additional_transaction_information: {
                category: { type: 'GENERAL' },
              },
            },
          })),
          Pagination: {
            older_url:
              pageNumber >= 10
                ? null
                : `/v1/user/44/event?count=200&older_id=${1000 - pageNumber}`,
          },
        };
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
      cursor: { newerId: '3300' },
    });

    expect(listEvents).toHaveBeenCalledTimes(5);
    expect(
      res.transactions.all.find(t => t.transactionId === '3301')?.transactionCategory,
    ).toBeNull();
  });

  it('stops event pagination when event time budget is exceeded', async () => {
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

    let nowTick = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => nowTick);

    vi.spyOn(BunqClient.prototype, 'listPayments').mockResolvedValue({
      Response: [
        {
          Payment: {
            id: 3401,
            created: '2026-01-05T12:00:00+00:00',
            description: 'Groceries',
            amount: { value: '-32.10', currency: 'EUR' },
            counterparty_alias: { display_name: 'Market' },
          },
        },
      ],
      Pagination: {
        newer_url: null,
      },
    });

    const listEvents = vi
      .spyOn(BunqClient.prototype, 'listEvents')
      .mockImplementationOnce(async () => {
        nowTick = 35_000;
        return {
          Response: [
            {
              Event: {
                id: 9701,
                object: { Payment: { id: 9999 } },
                additional_transaction_information: {
                  category: { type: 'GENERAL' },
                },
              },
            },
          ],
          Pagination: {
            older_url: '/v1/user/44/event?count=200&older_id=700',
          },
        };
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

    await bunqService.listTransactions({
      accountId: 'acc-1',
      cursor: { newerId: '3400' },
    });

    expect(listEvents).toHaveBeenCalledTimes(1);
  });

  it('uses fallback composite matching when event payment id is missing and key is unique', async () => {
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

    vi.spyOn(BunqClient.prototype, 'listPayments').mockResolvedValue({
      Response: [
        {
          Payment: {
            id: 5001,
            created: '2026-01-03T12:00:00+00:00',
            description: 'Coffee',
            amount: { value: '-4.95', currency: 'EUR' },
            counterparty_alias: { display_name: 'Cafe One' },
          },
        },
        {
          Payment: {
            id: 5002,
            created: '2026-01-03T12:00:00+00:00',
            description: 'Coffee',
            amount: { value: '-4.95', currency: 'EUR' },
            counterparty_alias: { display_name: 'Cafe Two' },
          },
        },
      ],
      Pagination: {
        newer_url: null,
      },
    });

    vi.spyOn(BunqClient.prototype, 'listEvents').mockResolvedValue({
      Response: [
        {
          Event: {
            id: 9501,
            created: '2026-01-03T12:00:01+00:00',
            monetary_account_id: 'acc-1',
            object: {
              Payment: {
                created: '2026-01-03T12:00:00+00:00',
                amount: { value: '-4.95', currency: 'EUR' },
                counterparty_alias: { display_name: 'Cafe Two' },
              },
            },
            additional_transaction_information: {
              category: { type: 'GENERAL' },
            },
          },
        },
      ],
      Pagination: {
        older_url: null,
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
      cursor: { newerId: '5000' },
    });

    expect(
      res.transactions.all.find(t => t.transactionId === '5002')?.transactionCategory,
    ).toBe('General');
    expect(
      res.transactions.all.find(t => t.transactionId === '5001')?.transactionCategory,
    ).toBeNull();
  });

  it('does not assign category on ambiguous fallback composite matches', async () => {
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

    vi.spyOn(BunqClient.prototype, 'listPayments').mockResolvedValue({
      Response: [
        {
          Payment: {
            id: 6001,
            created: '2026-01-03T12:00:00+00:00',
            description: 'Transfer A',
            amount: { value: '-10.00', currency: 'EUR' },
          },
        },
        {
          Payment: {
            id: 6002,
            created: '2026-01-03T18:00:00+00:00',
            description: 'Transfer B',
            amount: { value: '-10.00', currency: 'EUR' },
          },
        },
      ],
      Pagination: {
        newer_url: null,
      },
    });

    vi.spyOn(BunqClient.prototype, 'listEvents').mockResolvedValue({
      Response: [
        {
          Event: {
            id: 9601,
            created: '2026-01-03T20:00:00+00:00',
            monetary_account_id: 'acc-1',
            object: {
              Payment: {
                created: '2026-01-03T00:00:00+00:00',
                amount: { value: '-10.00', currency: 'EUR' },
              },
            },
            additional_transaction_information: {
              category: { type: 'GENERAL' },
            },
          },
        },
      ],
      Pagination: {
        older_url: null,
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
      cursor: { newerId: '6000' },
    });

    expect(
      res.transactions.all.find(t => t.transactionId === '6001')?.transactionCategory,
    ).toBeNull();
    expect(
      res.transactions.all.find(t => t.transactionId === '6002')?.transactionCategory,
    ).toBeNull();
  });

  it('uses fallback composite matching for categorized MasterCardAction events', async () => {
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

    vi.spyOn(BunqClient.prototype, 'listPayments').mockResolvedValue({
      Response: [
        {
          Payment: {
            id: 8401,
            created: '2026-02-04T13:10:00+00:00',
            description: 'Card tx 1',
            amount: { value: '-18.90', currency: 'EUR' },
            counterparty_alias: { display_name: 'Card Merchant A' },
          },
        },
        {
          Payment: {
            id: 8402,
            created: '2026-02-04T13:10:00+00:00',
            description: 'Card tx 2',
            amount: { value: '-18.90', currency: 'EUR' },
            counterparty_alias: { display_name: 'Card Merchant B' },
          },
        },
      ],
      Pagination: {
        newer_url: null,
      },
    });

    vi.spyOn(BunqClient.prototype, 'listEvents').mockResolvedValue({
      Response: [
        {
          Event: {
            id: 9840,
            created: '2026-02-04T13:10:02+00:00',
            monetary_account_id: 'acc-1',
            object: {
              MasterCardAction: {
                created: '2026-02-04T13:10:00+00:00',
                amount_billing: { value: '-18.90', currency: 'EUR' },
                monetary_account_id: 'acc-1',
                counterparty_alias: { display_name: 'Card Merchant B' },
              },
            },
            additional_transaction_information: {
              category: { type: 'GENERAL' },
            },
          },
        },
      ],
      Pagination: {
        older_url: null,
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
      cursor: { newerId: '8400' },
    });

    expect(
      res.transactions.all.find(t => t.transactionId === '8402')?.transactionCategory,
    ).toBe('General');
    expect(
      res.transactions.all.find(t => t.transactionId === '8401')?.transactionCategory,
    ).toBeNull();
  });

  it('uses object_data_at_event.MasterCardAction when object.MasterCardAction is absent', async () => {
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

    vi.spyOn(BunqClient.prototype, 'listPayments').mockResolvedValue({
      Response: [
        {
          Payment: {
            id: 8501,
            created: '2026-02-05T08:20:00+00:00',
            description: 'Card tx fallback',
            amount: { value: '-7.50', currency: 'EUR' },
            counterparty_alias: { display_name: 'Card Merchant C' },
          },
        },
      ],
      Pagination: {
        newer_url: null,
      },
    });

    vi.spyOn(BunqClient.prototype, 'listEvents').mockResolvedValue({
      Response: [
        {
          Event: {
            id: 9850,
            created: '2026-02-05T08:20:03+00:00',
            monetary_account_id: 'acc-1',
            object_data_at_event: {
              MasterCardAction: {
                created: '2026-02-05T08:20:00+00:00',
                amount_billing: { value: '-7.50', currency: 'EUR' },
                monetary_account_id: 'acc-1',
                counterparty_alias: { display_name: 'Card Merchant C' },
              },
            },
            additional_transaction_information: {
              category: { type: 'INCOME' },
            },
          },
        },
      ],
      Pagination: {
        older_url: null,
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
      cursor: { newerId: '8500' },
    });

    expect(
      res.transactions.all.find(t => t.transactionId === '8501')?.transactionCategory,
    ).toBe('Income');
  });

  it('does not assign category on ambiguous MasterCardAction fallback matches', async () => {
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

    vi.spyOn(BunqClient.prototype, 'listPayments').mockResolvedValue({
      Response: [
        {
          Payment: {
            id: 8601,
            created: '2026-02-06T15:45:00+00:00',
            description: 'Card tx A',
            amount: { value: '-11.00', currency: 'EUR' },
          },
        },
        {
          Payment: {
            id: 8602,
            created: '2026-02-06T15:45:00+00:00',
            description: 'Card tx B',
            amount: { value: '-11.00', currency: 'EUR' },
          },
        },
      ],
      Pagination: {
        newer_url: null,
      },
    });

    vi.spyOn(BunqClient.prototype, 'listEvents').mockResolvedValue({
      Response: [
        {
          Event: {
            id: 9860,
            created: '2026-02-06T15:46:00+00:00',
            monetary_account_id: 'acc-1',
            object: {
              MasterCardAction: {
                created: '2026-02-06T15:45:00+00:00',
                amount_billing: { value: '-11.00', currency: 'EUR' },
                monetary_account_id: 'acc-1',
              },
            },
            additional_transaction_information: {
              category: { type: 'GENERAL' },
            },
          },
        },
      ],
      Pagination: {
        older_url: null,
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
      cursor: { newerId: '8600' },
    });

    expect(
      res.transactions.all.find(t => t.transactionId === '8601')?.transactionCategory,
    ).toBeNull();
    expect(
      res.transactions.all.find(t => t.transactionId === '8602')?.transactionCategory,
    ).toBeNull();
  });

  it('uses fallback matching for categorized RequestInquiry-like events without payment id', async () => {
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

    vi.spyOn(BunqClient.prototype, 'listPayments').mockResolvedValue({
      Response: [
        {
          Payment: {
            id: 8101,
            created: '2026-02-01T10:30:00+00:00',
            description: 'Request payment',
            amount: { value: '-15.00', currency: 'EUR' },
            counterparty_alias: { display_name: 'Alice' },
          },
        },
      ],
      Pagination: {
        newer_url: null,
      },
    });

    vi.spyOn(BunqClient.prototype, 'listEvents').mockResolvedValue({
      Response: [
        {
          Event: {
            id: 9810,
            created: '2026-02-01T10:31:00+00:00',
            object_data_at_event: {
              RequestInquiry: {
                amount_inquired: { value: '-15.00', currency: 'EUR' },
                monetary_account_id: 'acc-1',
                counterparty_alias: { display_name: 'Alice' },
              },
            },
            additional_transaction_information: {
              category: { type: 'GENERAL' },
            },
          },
        },
      ],
      Pagination: {
        older_url: null,
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
      cursor: { newerId: '8100' },
    });

    expect(
      res.transactions.all.find(t => t.transactionId === '8101')?.transactionCategory,
    ).toBe('General');
  });

  it('does not assign category for ambiguous RequestInquiry-like fallback candidates', async () => {
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

    vi.spyOn(BunqClient.prototype, 'listPayments').mockResolvedValue({
      Response: [
        {
          Payment: {
            id: 8201,
            created: '2026-02-02T09:00:00+00:00',
            description: 'Request A',
            amount: { value: '-9.99', currency: 'EUR' },
          },
        },
        {
          Payment: {
            id: 8202,
            created: '2026-02-02T17:00:00+00:00',
            description: 'Request B',
            amount: { value: '-9.99', currency: 'EUR' },
          },
        },
      ],
      Pagination: {
        newer_url: null,
      },
    });

    vi.spyOn(BunqClient.prototype, 'listEvents').mockResolvedValue({
      Response: [
        {
          Event: {
            id: 9820,
            created: '2026-02-02T20:00:00+00:00',
            object: {
              RequestInquiry: {
                amount_responded: { value: '-9.99', currency: 'EUR' },
                monetary_account_id: 'acc-1',
              },
            },
            additional_transaction_information: {
              category: { type: 'GENERAL' },
            },
          },
        },
      ],
      Pagination: {
        older_url: null,
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
      cursor: { newerId: '8200' },
    });

    expect(
      res.transactions.all.find(t => t.transactionId === '8201')?.transactionCategory,
    ).toBeNull();
    expect(
      res.transactions.all.find(t => t.transactionId === '8202')?.transactionCategory,
    ).toBeNull();
  });

  it('matches on sign-flipped amount when RequestInquiry amount perspective differs', async () => {
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

    vi.spyOn(BunqClient.prototype, 'listPayments').mockResolvedValue({
      Response: [
        {
          Payment: {
            id: 8301,
            created: '2026-02-03T08:15:00+00:00',
            description: 'Request settled',
            amount: { value: '-25.00', currency: 'EUR' },
            counterparty_alias: { display_name: 'Bob' },
          },
        },
      ],
      Pagination: {
        newer_url: null,
      },
    });

    vi.spyOn(BunqClient.prototype, 'listEvents').mockResolvedValue({
      Response: [
        {
          Event: {
            id: 9830,
            created: '2026-02-03T08:16:00+00:00',
            object_data_at_event: {
              RequestInquiry: {
                amount_responded: { value: '25.00', currency: 'EUR' },
                monetary_account_id: 'acc-1',
                counterparty_alias: { display_name: 'Bob' },
              },
            },
            additional_transaction_information: {
              category: { type: 'INCOME' },
            },
          },
        },
      ],
      Pagination: {
        older_url: null,
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
      cursor: { newerId: '8300' },
    });

    expect(
      res.transactions.all.find(t => t.transactionId === '8301')?.transactionCategory,
    ).toBe('Income');
  });

  it('keeps id-based event mapping as first phase when both id and fallback are possible', async () => {
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

    vi.spyOn(BunqClient.prototype, 'listPayments').mockResolvedValue({
      Response: [
        {
          Payment: {
            id: 7001,
            created: '2026-01-03T12:00:00+00:00',
            description: 'Primary',
            amount: { value: '-20.00', currency: 'EUR' },
            counterparty_alias: { display_name: 'Match Me' },
          },
        },
        {
          Payment: {
            id: 7002,
            created: '2026-01-03T12:00:00+00:00',
            description: 'Secondary',
            amount: { value: '-20.00', currency: 'EUR' },
            counterparty_alias: { display_name: 'Other' },
          },
        },
      ],
      Pagination: {
        newer_url: null,
      },
    });

    vi.spyOn(BunqClient.prototype, 'listEvents').mockResolvedValue({
      Response: [
        {
          Event: {
            id: 9701,
            created: '2026-01-03T12:00:01+00:00',
            monetary_account_id: 'acc-1',
            object: {
              Payment: {
                id: 7001,
                created: '2026-01-03T12:00:00+00:00',
                amount: { value: '-20.00', currency: 'EUR' },
                counterparty_alias: { display_name: 'Other' },
              },
            },
            additional_transaction_information: {
              category: { type: 'INCOME' },
            },
          },
        },
      ],
      Pagination: {
        older_url: null,
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
      cursor: { newerId: '7000' },
    });

    expect(
      res.transactions.all.find(t => t.transactionId === '7001')?.transactionCategory,
    ).toBe('Income');
    expect(
      res.transactions.all.find(t => t.transactionId === '7002')?.transactionCategory,
    ).toBeNull();
  });

  it('continues importing payments when event retrieval fails', async () => {
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

    vi.spyOn(BunqClient.prototype, 'listPayments').mockResolvedValue({
      Response: [
        {
          Payment: {
            id: 3001,
            created: '2026-01-05T12:00:00+00:00',
            description: 'Groceries',
            amount: { value: '-32.10', currency: 'EUR' },
            counterparty_alias: { display_name: 'Market' },
          },
        },
      ],
      Pagination: {
        newer_url: null,
      },
    });

    vi.spyOn(BunqClient.prototype, 'listEvents').mockRejectedValue(
      new Error('events unavailable'),
    );

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
      cursor: { newerId: '3000' },
    });

    expect(res.transactions.all).toHaveLength(1);
    expect(res.transactions.all[0].notes).toBe('Groceries');
    expect(res.cursor).toEqual({ newerId: '3001' });
  });

  it('skips loading bunq events when importCategory is disabled', async () => {
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

    vi.spyOn(BunqClient.prototype, 'listPayments').mockResolvedValue({
      Response: [
        {
          Payment: {
            id: 3001,
            created: '2026-01-05T12:00:00+00:00',
            description: 'Groceries',
            amount: { value: '-32.10', currency: 'EUR' },
            counterparty_alias: { display_name: 'Market' },
          },
        },
      ],
      Pagination: {
        newer_url: null,
      },
    });

    const listEventsSpy = vi
      .spyOn(BunqClient.prototype, 'listEvents')
      .mockRejectedValue(new Error('events unavailable'));

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

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const res = await bunqService.listTransactions({
      accountId: 'acc-1',
      cursor: { newerId: '3000' },
      importCategory: false,
    });

    expect(listEventsSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalledWith(
      'bunq: failed to fetch or map events; importing transactions without category tags',
      expect.any(Object),
    );
    expect(res.transactions.all).toHaveLength(1);
    expect(res.transactions.all[0].notes).toBe('Groceries');
    expect(res.transactions.all[0].transactionCategory).toBeNull();
    expect(res.cursor).toEqual({ newerId: '3001' });
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
    vi.spyOn(BunqClient.prototype, 'listEvents').mockResolvedValue({
      Response: [],
    });

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

  it('uses wildcard permitted IPs by default during auth bootstrap', async () => {
    const { privateKeyPem } = generateBunqKeyPair();

    const secretMap = new Map([
      [SecretName.bunq_apiKey, 'api-key'],
      [SecretName.bunq_environment, 'production'],
      [SecretName.bunq_clientPrivateKey, privateKeyPem],
      [SecretName.bunq_installationToken, 'installation-token'],
      [SecretName.bunq_serverPublicKey, 'server-public-key'],
      [SecretName.bunq_sessionToken, null],
      [SecretName.bunq_userId, null],
    ]);

    vi.spyOn(secretsService, 'get').mockImplementation(name => {
      return secretMap.get(name) ?? null;
    });
    vi.spyOn(secretsService, 'set').mockImplementation((name, value) => {
      secretMap.set(name, value);
      return { changes: 1 };
    });

    const registerDeviceSpy = vi
      .spyOn(BunqClient.prototype, 'registerDevice')
      .mockImplementation(async function () {
        expect(this.permittedIps).toEqual(['*']);
        return {};
      });

    vi.spyOn(BunqClient.prototype, 'createSession').mockResolvedValue({
      sessionToken: 'session-token',
      userId: '44',
    });

    const res = await bunqService.getStatus();

    expect(res).toMatchObject({
      configured: true,
      authContextReady: true,
      environment: 'production',
    });
    expect(registerDeviceSpy).toHaveBeenCalledTimes(1);
  });

  it('uses explicitly configured permitted IPs during auth bootstrap', async () => {
    const { privateKeyPem } = generateBunqKeyPair();

    const secretMap = new Map([
      [SecretName.bunq_apiKey, 'api-key'],
      [SecretName.bunq_permittedIps, '203.0.113.10, 198.51.100.1'],
      [SecretName.bunq_environment, 'production'],
      [SecretName.bunq_clientPrivateKey, privateKeyPem],
      [SecretName.bunq_installationToken, 'installation-token'],
      [SecretName.bunq_serverPublicKey, 'server-public-key'],
      [SecretName.bunq_sessionToken, null],
      [SecretName.bunq_userId, null],
    ]);

    vi.spyOn(secretsService, 'get').mockImplementation(name => {
      return secretMap.get(name) ?? null;
    });
    vi.spyOn(secretsService, 'set').mockImplementation((name, value) => {
      secretMap.set(name, value);
      return { changes: 1 };
    });

    const registerDeviceSpy = vi
      .spyOn(BunqClient.prototype, 'registerDevice')
      .mockImplementation(async function () {
        expect(this.permittedIps).toEqual(['203.0.113.10', '198.51.100.1']);
        return {};
      });

    vi.spyOn(BunqClient.prototype, 'createSession').mockResolvedValue({
      sessionToken: 'session-token',
      userId: '44',
    });

    const res = await bunqService.getStatus();

    expect(res).toMatchObject({
      configured: true,
      authContextReady: true,
      environment: 'production',
    });
    expect(registerDeviceSpy).toHaveBeenCalledTimes(1);
  });
});
