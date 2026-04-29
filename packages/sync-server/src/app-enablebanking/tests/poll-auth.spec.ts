import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all external dependencies before importing the app
vi.mock('../../services/secrets-service', () => ({
  SecretName: {
    enablebanking_applicationId: 'enablebanking_applicationId',
    enablebanking_secretKey: 'enablebanking_secretKey',
  },
  secretsService: {
    get: vi.fn(() => 'test-value'),
    set: vi.fn(),
  },
}));

vi.mock('../utils/jwt', () => ({
  getJWT: vi.fn(() => 'mock-jwt-token'),
}));

vi.mock('../../util/middlewares', () => ({
  requestLoggerMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
  validateSessionMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
}));

vi.mock('../../app-gocardless/util/handle-error', () => ({
  handleError:
    (fn: Function) =>
    (req: unknown, res: { send: (data: unknown) => void }) => {
      Promise.resolve(fn(req, res)).catch((err: Error) => {
        res.send({
          status: 'ok',
          data: {
            error_code: 'INTERNAL_ERROR',
            error_type: err.message || 'internal-error',
          },
        });
      });
    },
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// We need to dynamically import the handlers after mocks are set up
const { handlers } = await import('../app-enablebanking');

const app = express();
// Mirror the production sync-server trust-proxy setup so req.ip honors
// X-Forwarded-For from trusted upstreams.
app.set('trust proxy', true);
app.use(express.json());
app.use('/', handlers);

function mockFetchResponse(data: unknown, ok = true, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe('Enable Banking Express routes', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /status', () => {
    it('returns configured: true when secrets are set', async () => {
      const res = await request(app).post('/status').send({});

      expect(res.body.status).toBe('ok');
      expect(res.body.data.configured).toBe(true);
    });
  });

  describe('POST /configure', () => {
    it('returns error when applicationId is missing', async () => {
      const res = await request(app)
        .post('/configure')
        .send({ secretKey: 'key' });

      expect(res.body.data.error_code).toBe('INVALID_INPUT');
    });

    it('returns error when secretKey is missing', async () => {
      const res = await request(app)
        .post('/configure')
        .send({ applicationId: 'id' });

      expect(res.body.data.error_code).toBe('INVALID_INPUT');
    });

    it('validates credentials by calling getApplication', async () => {
      mockFetchResponse({ name: 'Test App' });

      const res = await request(app)
        .post('/configure')
        .send({ applicationId: 'test-id', secretKey: 'test-key' });

      expect(res.body.data.configured).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.enablebanking.com/application',
        expect.anything(),
      );
    });

    it('returns error when getApplication fails', async () => {
      mockFetchResponse({ message: 'Invalid credentials' }, false, 401);

      const res = await request(app)
        .post('/configure')
        .send({ applicationId: 'bad-id', secretKey: 'bad-key' });

      expect(res.body.data.error_code).toBe('CONFIGURATION_FAILED');
    });
  });

  describe('POST /aspsps', () => {
    it('returns ASPSP list for a country', async () => {
      mockFetchResponse([
        { name: 'Nordea', country: 'FI' },
        { name: 'OP', country: 'FI' },
      ]);

      const res = await request(app).post('/aspsps').send({ country: 'FI' });

      expect(res.body.status).toBe('ok');
      expect(res.body.data).toHaveLength(2);
    });

    it('handles API errors gracefully', async () => {
      mockFetchResponse({ message: 'Server error' }, false, 500);

      const res = await request(app).post('/aspsps').send({ country: 'XX' });

      expect(res.body.data.error).toBeDefined();
    });
  });

  describe('POST /start-auth', () => {
    it('returns error when aspsp is missing', async () => {
      const res = await request(app)
        .post('/start-auth')
        .send({ redirectUrl: 'https://app.example.com/callback' });

      expect(res.body.data.error_code).toBe('INVALID_INPUT');
    });

    it('returns error when redirectUrl is missing', async () => {
      const res = await request(app)
        .post('/start-auth')
        .send({ aspsp: { name: 'Nordea', country: 'FI' } });

      expect(res.body.data.error_code).toBe('INVALID_INPUT');
    });

    it('returns url and state on success', async () => {
      mockFetchResponse({
        url: 'https://enablebanking.com/auth/redirect',
        authorization_id: 'auth-123',
      });

      const res = await request(app)
        .post('/start-auth')
        .send({
          aspsp: { name: 'Nordea', country: 'FI' },
          redirectUrl: 'https://app.example.com/callback',
        });

      expect(res.body.data.url).toBe('https://enablebanking.com/auth/redirect');
      expect(res.body.data.state).toBeDefined();
      expect(typeof res.body.data.state).toBe('string');
    });
  });

  describe('POST /complete-auth', () => {
    it('returns error when code is missing', async () => {
      const res = await request(app).post('/complete-auth').send({});

      expect(res.body.data.error_code).toBe('INVALID_INPUT');
    });

    it('creates session and normalizes accounts', async () => {
      // Mock createSession response
      mockFetchResponse({
        session_id: 'session-123',
        accounts: [
          {
            account_id: { iban: 'FI0455231152453547' },
            account_servicer: { name: 'Nordea' },
            name: 'Current Account',
            currency: 'EUR',
            uid: 'account-uid-1',
          },
        ],
        aspsp: { name: 'Nordea', country: 'FI' },
      });
      // Mock getBalances for the account
      mockFetchResponse({
        balances: [
          {
            balance_amount: { currency: 'EUR', amount: '1000.00' },
            balance_type: 'CLAV',
          },
        ],
      });

      const res = await request(app)
        .post('/complete-auth')
        .send({ code: 'auth-code-123' });

      expect(res.body.data.session_id).toBe('session-123');
      expect(res.body.data.accounts).toHaveLength(1);
      expect(res.body.data.accounts[0].account_id).toBe('account-uid-1');
      expect(res.body.data.accounts[0].name).toBe('Current Account');
      expect(res.body.data.accounts[0].institution).toBe('Nordea');
    });

    it('handles balance fetch failure gracefully per account', async () => {
      // Mock createSession response with 2 accounts
      mockFetchResponse({
        session_id: 'session-123',
        accounts: [
          { uid: 'acct-1', name: 'Account 1' },
          { uid: 'acct-2', name: 'Account 2' },
        ],
        aspsp: { name: 'TestBank' },
      });
      // First account balance succeeds
      mockFetchResponse({
        balances: [
          {
            balance_amount: { currency: 'EUR', amount: '500.00' },
            balance_type: 'CLAV',
          },
        ],
      });
      // Second account balance fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
        text: () => Promise.resolve('Not found'),
      });

      const res = await request(app)
        .post('/complete-auth')
        .send({ code: 'auth-code' });

      // Both accounts should be returned, second with empty balances
      expect(res.body.data.accounts).toHaveLength(2);
      expect(res.body.data.accounts[0].balances).toHaveLength(1);
      expect(res.body.data.accounts[1].balances).toHaveLength(0);
    });
  });

  describe('POST /poll-auth and complete-auth coordination', () => {
    it('poll resolves when complete-auth is called with matching state', async () => {
      // First start-auth to get a state
      mockFetchResponse({
        url: 'https://enablebanking.com/auth',
        authorization_id: 'auth-1',
      });

      const startRes = await request(app)
        .post('/start-auth')
        .send({
          aspsp: { name: 'Nordea', country: 'FI' },
          redirectUrl: 'https://app.example.com/callback',
        });

      const state = startRes.body.data.state;

      // Start poll-auth (non-blocking) and complete-auth after a short delay
      const pollPromise = request(app).post('/poll-auth').send({ state });

      // Schedule complete-auth after poll registers
      const completePromise = new Promise<void>(resolve => {
        setTimeout(async () => {
          // Mock createSession response
          mockFetchResponse({
            session_id: 'session-abc',
            accounts: [{ uid: 'uid-1', name: 'Account' }],
            aspsp: { name: 'Nordea' },
          });
          // Mock getBalances for the account
          mockFetchResponse({
            balances: [
              {
                balance_amount: { currency: 'EUR', amount: '100.00' },
                balance_type: 'CLAV',
              },
            ],
          });

          await request(app)
            .post('/complete-auth')
            .send({ code: 'the-auth-code', state });

          resolve();
        }, 100);
      });

      // Wait for both to finish
      const [pollRes] = await Promise.all([pollPromise, completePromise]);

      expect(pollRes.body.status).toBe('ok');
      expect(pollRes.body.data.session_id).toBe('session-abc');
      expect(pollRes.body.data.accounts).toHaveLength(1);
    }, 10000);

    it('poll returns error when state is missing', async () => {
      const res = await request(app).post('/poll-auth').send({});

      expect(res.body.data.error_code).toBe('INVALID_INPUT');
    });

    it('does not write to the response after the client disconnects', async () => {
      // The /poll-auth handler attaches `res.on('close', ...)` to clean up
      // the pending waiter and reject its internal promise. After that, the
      // handler must not call res.send() — that would log a "write after end"
      // warning and (in stricter Node setups) throw.
      const noop = () => undefined;
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(noop);

      const state = 'disconnect-test-state';
      const req = request(app).post('/poll-auth').send({ state });

      // Abort once the handler has had time to register the close listener.
      setTimeout(() => req.abort(), 50);

      await req.catch(() => {
        // supertest rejects on aborted requests; that's expected.
      });

      // Give the server a tick to process 'close' and unwind the promise.
      await new Promise(resolve => setTimeout(resolve, 100));

      const writeAfterEndCalls = errorSpy.mock.calls.filter(args =>
        args.some(
          arg =>
            (typeof arg === 'string' && arg.includes('write after')) ||
            (arg instanceof Error && arg.message.includes('write after')),
        ),
      );
      expect(writeAfterEndCalls).toHaveLength(0);

      errorSpy.mockRestore();
    });
  });

  describe('POST /transactions', () => {
    it('returns error when accountId is missing', async () => {
      const res = await request(app)
        .post('/transactions')
        .send({ startDate: '2026-01-01' });

      expect(res.body.data.error_code).toBe('INVALID_INPUT');
    });

    it('returns error when startDate is missing', async () => {
      const res = await request(app)
        .post('/transactions')
        .send({ accountId: 'uid-1' });

      expect(res.body.data.error_code).toBe('INVALID_INPUT');
    });

    it('fetches balances and transactions, returns BankSyncResponse format', async () => {
      // Mock getBalances
      mockFetchResponse({
        balances: [
          {
            balance_amount: { currency: 'EUR', amount: '1234.56' },
            balance_type: 'CLAV',
            reference_date: '2026-03-24',
          },
        ],
      });
      // Mock getAllTransactions (single page)
      mockFetchResponse({
        transactions: [
          {
            entry_reference: 'ref-1',
            transaction_amount: { currency: 'EUR', amount: '100.00' },
            creditor: { name: 'My Account' },
            debtor: { name: 'Employer' },
            credit_debit_indicator: 'CRDT',
            status: 'BOOK',
            booking_date: '2026-03-01',
            value_date: '2026-03-01',
          },
          {
            entry_reference: 'ref-2',
            transaction_amount: { currency: 'EUR', amount: '-25.00' },
            creditor: { name: 'Shop' },
            debtor: { name: 'My Account' },
            credit_debit_indicator: 'DBIT',
            status: 'PDNG',
            value_date: '2026-03-02',
          },
        ],
      });

      const res = await request(app)
        .post('/transactions')
        .send({ accountId: 'uid-1', startDate: '2026-01-01' });

      expect(res.body.status).toBe('ok');

      const data = res.body.data;
      expect(data.transactions.all).toHaveLength(2);
      expect(data.transactions.booked).toHaveLength(1);
      expect(data.transactions.pending).toHaveLength(1);
      expect(data.transactions.booked[0].payeeName).toBe('Employer');
      expect(data.transactions.booked[0].booked).toBe(true);
      expect(data.transactions.booked[0].transactionAmount.amount).toBe(
        '100.00',
      );
      expect(data.transactions.booked[0].date).toBe('2026-03-01');
      expect(data.transactions.pending[0].payeeName).toBe('Shop');
      expect(data.transactions.pending[0].booked).toBe(false);
      expect(data.transactions.pending[0].transactionAmount.amount).toBe(
        '-25.00',
      );
      expect(data.transactions.pending[0].date).toBe('2026-03-02');

      expect(data.balances).toHaveLength(1);
      expect(data.balances[0].balanceAmount.amount).toBe(123456);

      expect(data.startingBalance).toBe(123456);
    });

    it('handles pagination via continuation_key', async () => {
      // Mock getBalances
      mockFetchResponse({ balances: [] });
      // Mock first page
      mockFetchResponse({
        transactions: [
          {
            entry_reference: 'tx-1',
            transaction_amount: { currency: 'EUR', amount: '10.00' },
            status: 'BOOK',
          },
        ],
        continuation_key: 'page-2',
      });
      // Mock second page
      mockFetchResponse({
        transactions: [
          {
            entry_reference: 'tx-2',
            transaction_amount: { currency: 'EUR', amount: '20.00' },
            status: 'BOOK',
          },
        ],
      });

      const res = await request(app)
        .post('/transactions')
        .send({ accountId: 'uid-1', startDate: '2026-01-01' });

      expect(res.body.data.transactions.all).toHaveLength(2);
      // 3 fetch calls: 1 for balances + 2 for paginated transactions
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('returns startingBalance 0 when no balances available', async () => {
      mockFetchResponse({ balances: [] });
      mockFetchResponse({ transactions: [] });

      const res = await request(app)
        .post('/transactions')
        .send({ accountId: 'uid-1', startDate: '2026-01-01' });

      expect(res.body.data.startingBalance).toBe(0);
    });

    it('handles API error gracefully', async () => {
      mockFetchResponse({ message: 'Session expired' }, false, 401);

      const res = await request(app)
        .post('/transactions')
        .send({ accountId: 'uid-1', startDate: '2026-01-01' });

      // 401 maps to ITEM_ERROR / ITEM_LOGIN_REQUIRED (expired session)
      expect(res.body.data.error_type).toBe('ITEM_ERROR');
      expect(res.body.data.error_code).toBe('ITEM_LOGIN_REQUIRED');
    });

    it('returns structured error for rate limit (429)', async () => {
      mockFetchResponse({ message: 'Rate limit exceeded' }, false, 429);

      const res = await request(app)
        .post('/transactions')
        .send({ accountId: 'uid-1', startDate: '2026-01-01' });

      // error_type carries the bank-sync category (matched by AccountSyncCheck).
      expect(res.body.data.error_type).toBe('RATE_LIMIT_EXCEEDED');
      expect(res.body.data.error_code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('maps 404 to INVALID_INPUT category in error_type', async () => {
      mockFetchResponse({ message: 'Account not found' }, false, 404);

      const res = await request(app)
        .post('/transactions')
        .send({ accountId: 'uid-1', startDate: '2026-01-01' });

      expect(res.body.data.error_type).toBe('INVALID_INPUT');
      expect(res.body.data.error_code).toBe('NOT_FOUND');
    });

    it('forwards PSU headers from the incoming request to the API', async () => {
      // Mock getBalances
      mockFetchResponse({ balances: [] });
      // Mock getTransactions
      mockFetchResponse({ transactions: [] });

      await request(app)
        .post('/transactions')
        .set('X-Forwarded-For', '203.0.113.42, 10.0.0.1')
        .set('User-Agent', 'TestBrowser/1.0')
        .send({ accountId: 'uid-1', startDate: '2026-01-01' });

      // Both the balance and transaction fetch calls should include PSU headers
      for (const call of mockFetch.mock.calls) {
        expect(call[1].headers).toHaveProperty(
          'Psu-Ip-Address',
          '203.0.113.42',
        );
        expect(call[1].headers).toHaveProperty(
          'Psu-User-Agent',
          'TestBrowser/1.0',
        );
      }
    });
  });
});
