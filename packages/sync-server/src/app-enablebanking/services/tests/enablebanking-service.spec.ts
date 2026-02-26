import { generateKeyPairSync } from 'node:crypto';

import {
  checkStatus,
  completeSession,
  createSession,
  getBanks,
  getTransactions,
} from '../enablebanking-service';

import {
  mockAccountsResponse,
  mockAppId,
  mockAspspsResponse,
  mockBalancesResponse,
  mockBalancesResponseClosingBooked,
  mockSessionResponse,
  mockTransactionsPage1,
  mockTransactionsPage2,
} from './fixtures';

// Generate a real RSA key pair once for the suite — generateJwt uses
// crypto.createSign which requires a valid private key.
const { privateKey: privateKeyObject } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const testPrivateKey = privateKeyObject
  .export({ type: 'pkcs1', format: 'pem' })
  .toString();

function mockOkResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response;
}

function mockErrorResponse(status = 400, body = 'Bad Request') {
  return {
    ok: false,
    status,
    statusText: body,
    text: vi.fn().mockResolvedValue(body),
    json: vi.fn().mockResolvedValue({}),
  } as unknown as Response;
}

describe('enableBankingService', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('#checkStatus', () => {
    it('returns configured: true when API responds successfully', async () => {
      fetchSpy.mockResolvedValue(mockOkResponse({ status: 'ok' }));

      const result = await checkStatus(mockAppId, testPrivateKey);

      expect(result).toEqual({ configured: true });
      expect(fetchSpy).toBeCalledTimes(1);
    });

    it('returns configured: false when API returns an error', async () => {
      fetchSpy.mockResolvedValue(mockErrorResponse(401, 'Unauthorized'));

      const result = await checkStatus(mockAppId, testPrivateKey);

      expect(result).toEqual({ configured: false });
    });

    it('returns configured: false when fetch throws (network error)', async () => {
      fetchSpy.mockRejectedValue(new Error('Network failure'));

      const result = await checkStatus(mockAppId, testPrivateKey);

      expect(result).toEqual({ configured: false });
    });
  });

  describe('#getBanks', () => {
    it('maps aspsps to the expected shape with id, name, logo, countries', async () => {
      fetchSpy.mockResolvedValue(mockOkResponse(mockAspspsResponse));

      const result = await getBanks(mockAppId, testPrivateKey, 'FI');

      expect(result).toEqual([
        {
          id: 'Nordea',
          name: 'Nordea',
          logo: 'https://cdn.example.com/nordea.png',
          countries: ['FI'],
        },
        {
          id: 'OP',
          name: 'OP',
          logo: '',
          countries: ['FI'],
        },
      ]);
    });

    it('falls back to empty string for missing logo', async () => {
      fetchSpy.mockResolvedValue(
        mockOkResponse({ aspsps: [{ name: 'TestBank' }] }),
      );

      const result = await getBanks(mockAppId, testPrivateKey, 'FI');

      expect(result[0].logo).toBe('');
    });

    it('returns empty array when aspsps is absent from response', async () => {
      fetchSpy.mockResolvedValue(mockOkResponse({}));

      const result = await getBanks(mockAppId, testPrivateKey, 'FI');

      expect(result).toEqual([]);
    });
  });

  describe('#createSession', () => {
    it('returns the redirect url from the API', async () => {
      fetchSpy.mockResolvedValue(mockOkResponse(mockSessionResponse));

      const result = await createSession(
        mockAppId,
        testPrivateKey,
        'Nordea',
        'http://localhost:5006/enablebanking-callback',
        'FI',
      );

      expect(result).toEqual({ url: mockSessionResponse.url });
    });

    it('sends correct body shape to POST /auth', async () => {
      fetchSpy.mockResolvedValue(mockOkResponse(mockSessionResponse));

      await createSession(
        mockAppId,
        testPrivateKey,
        'Nordea',
        'http://localhost:5006/enablebanking-callback',
        'FI',
      );

      const [, options] = fetchSpy.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body).toMatchObject({
        aspsp: { name: 'Nordea', country: 'FI' },
        redirect_url: 'http://localhost:5006/enablebanking-callback',
        psu_type: 'personal',
      });
      // state must be present and be a UUID
      expect(body.state).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('#completeSession', () => {
    it('calls GET /sessions/{code}/accounts directly (code is the session_id)', async () => {
      fetchSpy.mockResolvedValueOnce(mockOkResponse(mockAccountsResponse));

      await completeSession(mockAppId, testPrivateKey, 'sess-001');

      expect(fetchSpy).toBeCalledTimes(1);
      const url: string = fetchSpy.mock.calls[0][0];
      expect(url).toContain('/sessions/sess-001/accounts');
    });

    it('maps accounts to the expected shape', async () => {
      fetchSpy.mockResolvedValueOnce(mockOkResponse(mockAccountsResponse));

      const result = await completeSession(mockAppId, testPrivateKey, 'sess-001');

      expect(result.sessionId).toBe('sess-001');
      expect(result.accounts).toEqual([
        {
          account_id: 'acc-001',
          name: 'Checking',
          institution: 'Nordea',
          mask: '0785',
          iban: 'FI2112345600000785',
          orgId: 'Nordea',
          orgDomain: '',
        },
        {
          account_id: 'acc-002',
          name: 'FI2112345600000786', // falls back to iban when account_name is empty
          institution: 'Nordea',
          mask: '0786',
          iban: 'FI2112345600000786',
          orgId: 'Nordea',
          orgDomain: '',
        },
      ]);
    });
  });

  describe('#getTransactions', () => {
    it('paginates until continuation_key is null and concatenates all transactions', async () => {
      fetchSpy
        .mockResolvedValueOnce(mockOkResponse(mockTransactionsPage1))
        .mockResolvedValueOnce(mockOkResponse(mockTransactionsPage2))
        .mockResolvedValueOnce(mockOkResponse(mockBalancesResponse));

      const result = await getTransactions(
        mockAppId,
        testPrivateKey,
        'acc-001',
        '2024-01-01',
      );

      expect(result.transactions.all).toHaveLength(3);
    });

    it('splits transactions into booked and pending correctly', async () => {
      fetchSpy
        .mockResolvedValueOnce(mockOkResponse(mockTransactionsPage1))
        .mockResolvedValueOnce(mockOkResponse(mockTransactionsPage2))
        .mockResolvedValueOnce(mockOkResponse(mockBalancesResponse));

      const result = await getTransactions(
        mockAppId,
        testPrivateKey,
        'acc-001',
        '2024-01-01',
      );

      expect(result.transactions.booked).toHaveLength(2);
      expect(result.transactions.pending).toHaveLength(1);
      expect(result.transactions.pending[0].transactionId).toBe('tx-003');
    });

    it('uses creditor_name as payee, falls back to debtor_name then remittance_information', async () => {
      fetchSpy
        .mockResolvedValueOnce(mockOkResponse(mockTransactionsPage1))
        .mockResolvedValueOnce(mockOkResponse({ transactions: [], continuation_key: null }))
        .mockResolvedValueOnce(mockOkResponse(mockBalancesResponse));

      const result = await getTransactions(
        mockAppId,
        testPrivateKey,
        'acc-001',
        '2024-01-01',
      );

      const [first, second] = result.transactions.booked;
      expect(first.payeeName).toBe('Supermarket'); // from creditor_name
      expect(second.payeeName).toBe('Employer'); // from debtor_name
    });

    it('calculates startingBalance in cents from expected balance type', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          mockOkResponse({ transactions: [], continuation_key: null }),
        )
        .mockResolvedValueOnce(mockOkResponse(mockBalancesResponse));

      const result = await getTransactions(
        mockAppId,
        testPrivateKey,
        'acc-001',
        '2024-01-01',
      );

      // 2345.67 EUR → 234567 cents
      expect(result.startingBalance).toBe(234567);
    });

    it('falls back to closingBooked balance when expected is absent', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          mockOkResponse({ transactions: [], continuation_key: null }),
        )
        .mockResolvedValueOnce(mockOkResponse(mockBalancesResponseClosingBooked));

      const result = await getTransactions(
        mockAppId,
        testPrivateKey,
        'acc-001',
        '2024-01-01',
      );

      // 1000.00 EUR → 100000 cents
      expect(result.startingBalance).toBe(100000);
    });

    it('returns startingBalance of 0 when no balances are returned', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          mockOkResponse({ transactions: [], continuation_key: null }),
        )
        .mockResolvedValueOnce(mockOkResponse({ balances: [] }));

      const result = await getTransactions(
        mockAppId,
        testPrivateKey,
        'acc-001',
        '2024-01-01',
      );

      expect(result.startingBalance).toBe(0);
    });

    it('uses entry_reference as transactionId, falls back to composed key', async () => {
      const txWithNoRef = {
        transactions: [
          {
            transaction_amount: { amount: '-1.00', currency: 'EUR' },
            booking_date: '2024-01-15',
            entry_status: 'BOOK',
            remittance_information: ['coffee'],
          },
        ],
        continuation_key: null,
      };

      fetchSpy
        .mockResolvedValueOnce(mockOkResponse(txWithNoRef))
        .mockResolvedValueOnce(mockOkResponse(mockBalancesResponse));

      const result = await getTransactions(
        mockAppId,
        testPrivateKey,
        'acc-001',
        '2024-01-01',
      );

      // No entry_reference or transaction_id → composed key
      expect(result.transactions.all[0].transactionId).toBe(
        '2024-01-15--1.00-coffee',
      );
    });
  });
});
