import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { enableBankingService } from '#app-enablebanking/services/enablebanking-service';
import { EnableBankingError } from '#app-enablebanking/utils/errors';
import { secretsService } from '#services/secrets-service';

import {
  mockAspspList,
  mockAuthResponse,
  mockBalance,
  mockCreditTransaction,
  mockDebitTransaction,
  mockSession,
  mockSessionAccount,
} from './fixtures';

// Mock dependencies before importing the service
vi.mock('../../../services/secrets-service', () => ({
  SecretName: {
    enablebanking_applicationId: 'enablebanking_applicationId',
    enablebanking_secretKey: 'enablebanking_secretKey',
  },
  secretsService: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('../../utils/jwt', () => ({
  getJWT: vi.fn(() => 'mock-jwt-token'),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockFetchResponse(data: unknown, ok = true, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe('enableBankingService', () => {
  beforeEach(() => {
    vi.mocked(secretsService.get).mockImplementation((name: string) => {
      if (name === 'enablebanking_applicationId') return 'test-app-id';
      if (name === 'enablebanking_secretKey') return 'test-secret-key';
      return null;
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  describe('#isConfigured', () => {
    it('returns true when both credentials are set', () => {
      expect(enableBankingService.isConfigured()).toBe(true);
    });

    it('returns false when applicationId is missing', () => {
      vi.mocked(secretsService.get).mockImplementation((name: string) => {
        if (name === 'enablebanking_secretKey') return 'test-secret-key';
        return null;
      });
      expect(enableBankingService.isConfigured()).toBe(false);
    });

    it('returns false when secretKey is missing', () => {
      vi.mocked(secretsService.get).mockImplementation((name: string) => {
        if (name === 'enablebanking_applicationId') return 'test-app-id';
        return null;
      });
      expect(enableBankingService.isConfigured()).toBe(false);
    });

    it('returns false when both credentials are missing', () => {
      vi.mocked(secretsService.get).mockReturnValue(null);
      expect(enableBankingService.isConfigured()).toBe(false);
    });
  });

  describe('#getApplication', () => {
    it('calls GET /application with auth header', async () => {
      mockFetchResponse({ name: 'Test App', status: 'active' });

      const result = await enableBankingService.getApplication();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.enablebanking.com/application',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-jwt-token',
          }),
        }),
      );
      expect(result).toEqual({ name: 'Test App', status: 'active' });
    });

    it('throws EnableBankingError on non-ok response', async () => {
      mockFetchResponse({ message: 'Unauthorized' }, false, 401);

      await expect(enableBankingService.getApplication()).rejects.toThrow(
        EnableBankingError,
      );
    });

    it('throws when credentials are not configured', async () => {
      vi.mocked(secretsService.get).mockReturnValue(null);

      await expect(enableBankingService.getApplication()).rejects.toThrow(
        'Enable Banking is not configured',
      );
    });
  });

  describe('#getAspsps', () => {
    it('fetches ASPSPs for a specific country', async () => {
      mockFetchResponse(mockAspspList);

      const result = await enableBankingService.getAspsps('FI');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.enablebanking.com/aspsps?country=FI',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual(mockAspspList);
    });

    it('fetches all ASPSPs when no country specified', async () => {
      mockFetchResponse(mockAspspList);

      await enableBankingService.getAspsps();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.enablebanking.com/aspsps',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('encodes country parameter', async () => {
      mockFetchResponse([]);

      await enableBankingService.getAspsps('F I');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.enablebanking.com/aspsps?country=F%20I',
        expect.anything(),
      );
    });
  });

  describe('#startAuth', () => {
    it('sends POST /auth with aspsp, redirect_url, state, and access', async () => {
      mockFetchResponse(mockAuthResponse);

      const result = await enableBankingService.startAuth(
        { name: 'Nordea', country: 'FI' },
        'https://app.example.com/callback',
        'test-state-uuid',
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.enablebanking.com/auth',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"aspsp"'),
        }),
      );

      const body = JSON.parse(String(mockFetch.mock.calls[0][1].body));
      expect(body.aspsp).toEqual({ name: 'Nordea', country: 'FI' });
      expect(body.redirect_url).toBe('https://app.example.com/callback');
      expect(body.state).toBe('test-state-uuid');
      expect(body.access.valid_until).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
      );

      expect(result).toEqual(mockAuthResponse);
    });

    it('sets access.valid_until to 90 days from now', async () => {
      mockFetchResponse(mockAuthResponse);

      await enableBankingService.startAuth(
        { name: 'Nordea', country: 'FI' },
        'https://app.example.com/callback',
        'state',
      );

      const body = JSON.parse(String(mockFetch.mock.calls[0][1].body));
      const validUntil = new Date(body.access.valid_until);
      const now = new Date();
      const diffDays = Math.round(
        (validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(89);
      expect(diffDays).toBeLessThanOrEqual(91);
    });

    it('caps consent at maxConsentValidity when shorter than 90 days', async () => {
      mockFetchResponse(mockAuthResponse);

      const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
      await enableBankingService.startAuth(
        { name: 'Nordea', country: 'FI' },
        'https://app.example.com/callback',
        'state',
        thirtyDaysInSeconds,
      );

      const body = JSON.parse(String(mockFetch.mock.calls[0][1].body));
      const validUntil = new Date(body.access.valid_until);
      const diffDays = Math.round(
        (validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(29);
      expect(diffDays).toBeLessThanOrEqual(31);
    });

    it('caps consent at 90 days when maxConsentValidity exceeds it', async () => {
      mockFetchResponse(mockAuthResponse);

      const oneYearInSeconds = 365 * 24 * 60 * 60;
      await enableBankingService.startAuth(
        { name: 'Nordea', country: 'FI' },
        'https://app.example.com/callback',
        'state',
        oneYearInSeconds,
      );

      const body = JSON.parse(String(mockFetch.mock.calls[0][1].body));
      const validUntil = new Date(body.access.valid_until);
      const diffDays = Math.round(
        (validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(89);
      expect(diffDays).toBeLessThanOrEqual(91);
    });

    it('falls back to 90 days when maxConsentValidity is 0', async () => {
      mockFetchResponse(mockAuthResponse);

      await enableBankingService.startAuth(
        { name: 'Nordea', country: 'FI' },
        'https://app.example.com/callback',
        'state',
        0,
      );

      const body = JSON.parse(String(mockFetch.mock.calls[0][1].body));
      const validUntil = new Date(body.access.valid_until);
      const diffDays = Math.round(
        (validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBeGreaterThanOrEqual(89);
      expect(diffDays).toBeLessThanOrEqual(91);
    });
  });

  describe('#createSession', () => {
    it('sends POST /sessions with code', async () => {
      mockFetchResponse(mockSession);

      const result = await enableBankingService.createSession('auth-code-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.enablebanking.com/sessions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ code: 'auth-code-123' }),
        }),
      );
      expect(result.session_id).toBe('test-session-id');
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].uid).toBe(mockSessionAccount.uid);
    });
  });

  describe('#getSession', () => {
    it('sends GET /sessions/{sessionId}', async () => {
      mockFetchResponse(mockSession);

      const result = await enableBankingService.getSession('test-session-id');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.enablebanking.com/sessions/test-session-id',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result.session_id).toBe('test-session-id');
    });

    it('encodes sessionId in URL', async () => {
      mockFetchResponse(mockSession);

      await enableBankingService.getSession('session/with special');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.enablebanking.com/sessions/session%2Fwith%20special',
        expect.anything(),
      );
    });
  });

  describe('#getBalances', () => {
    it('sends GET /accounts/{uid}/balances', async () => {
      mockFetchResponse({ balances: [mockBalance] });

      const result = await enableBankingService.getBalances(
        mockSessionAccount.uid,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.enablebanking.com/accounts/${mockSessionAccount.uid}/balances`,
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result.balances).toHaveLength(1);
      expect(result.balances[0].balance_amount.amount).toBe('1234.56');
    });

    it('forwards PSU headers when provided', async () => {
      mockFetchResponse({ balances: [mockBalance] });

      await enableBankingService.getBalances(mockSessionAccount.uid, {
        'Psu-Ip-Address': '192.168.1.1',
        'Psu-User-Agent': 'Mozilla/5.0',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Psu-Ip-Address': '192.168.1.1',
            'Psu-User-Agent': 'Mozilla/5.0',
          }),
        }),
      );
    });

    it('omits PSU headers when not provided', async () => {
      mockFetchResponse({ balances: [] });

      await enableBankingService.getBalances(mockSessionAccount.uid);

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers).not.toHaveProperty('Psu-Ip-Address');
      expect(headers).not.toHaveProperty('Psu-User-Agent');
    });
  });

  describe('#getTransactions', () => {
    it('sends GET /accounts/{uid}/transactions with date params', async () => {
      mockFetchResponse({
        transactions: [mockCreditTransaction],
      });

      const result = await enableBankingService.getTransactions(
        mockSessionAccount.uid,
        '2026-01-01',
        '2026-03-25',
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `/accounts/${mockSessionAccount.uid}/transactions?date_from=2026-01-01&date_to=2026-03-25`,
        ),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result.transactions).toHaveLength(1);
    });

    it('includes continuation_key when provided', async () => {
      mockFetchResponse({ transactions: [] });

      await enableBankingService.getTransactions(
        'uid',
        '2026-01-01',
        '2026-03-25',
        'page2-key',
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('continuation_key=page2-key'),
        expect.anything(),
      );
    });

    it('returns continuation_key from response', async () => {
      mockFetchResponse({
        transactions: [mockCreditTransaction],
        continuation_key: 'next-page',
      });

      const result = await enableBankingService.getTransactions(
        'uid',
        '2026-01-01',
        '2026-03-25',
      );

      expect(result.continuation_key).toBe('next-page');
    });

    it('forwards PSU headers when provided', async () => {
      mockFetchResponse({ transactions: [] });

      await enableBankingService.getTransactions(
        'uid',
        '2026-01-01',
        '2026-03-25',
        undefined,
        { 'Psu-Ip-Address': '10.0.0.1' },
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Psu-Ip-Address': '10.0.0.1',
          }),
        }),
      );
    });
  });

  describe('#getAllTransactions', () => {
    it('fetches all pages until no continuation_key', async () => {
      mockFetchResponse({
        transactions: [mockCreditTransaction],
        continuation_key: 'page2',
      });
      mockFetchResponse({
        transactions: [mockDebitTransaction],
        continuation_key: 'page3',
      });
      mockFetchResponse({
        transactions: [mockCreditTransaction],
        // no continuation_key — last page
      });

      const result = await enableBankingService.getAllTransactions(
        'uid',
        '2026-01-01',
        '2026-03-25',
      );

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
    });

    it('handles single page response', async () => {
      mockFetchResponse({
        transactions: [mockCreditTransaction, mockDebitTransaction],
      });

      const result = await enableBankingService.getAllTransactions(
        'uid',
        '2026-01-01',
        '2026-03-25',
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
    });

    it('handles empty transaction list', async () => {
      mockFetchResponse({ transactions: [] });

      const result = await enableBankingService.getAllTransactions(
        'uid',
        '2026-01-01',
        '2026-03-25',
      );

      expect(result).toHaveLength(0);
    });

    it('breaks out of pagination when continuation_key repeats', async () => {
      mockFetchResponse({
        transactions: [mockCreditTransaction],
        continuation_key: 'stuck-key',
      });
      mockFetchResponse({
        transactions: [mockDebitTransaction],
        continuation_key: 'stuck-key',
      });

      const result = await enableBankingService.getAllTransactions(
        'uid',
        '2026-01-01',
        '2026-03-25',
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('throws EnableBankingError on 401', async () => {
      mockFetchResponse({ message: 'Unauthorized' }, false, 401);

      await expect(enableBankingService.getAspsps('FI')).rejects.toThrow(
        EnableBankingError,
      );
    });

    it('throws EnableBankingError on 429 rate limit', async () => {
      mockFetchResponse({ message: 'Rate limit exceeded' }, false, 429);

      await expect(enableBankingService.getAspsps('FI')).rejects.toThrow(
        EnableBankingError,
      );
    });

    it('throws EnableBankingError on 500 server error', async () => {
      mockFetchResponse({ message: 'Internal error' }, false, 500);

      await expect(enableBankingService.getApplication()).rejects.toThrow(
        EnableBankingError,
      );
    });

    it('handles non-JSON error response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('not json')),
        text: () => Promise.resolve('Bad Gateway'),
      });

      await expect(enableBankingService.getApplication()).rejects.toThrow(
        EnableBankingError,
      );
    });

    it('throws TIMED_OUT EnableBankingError on AbortError', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(enableBankingService.getApplication()).rejects.toThrow(
        expect.objectContaining({
          name: 'EnableBankingError',
          error_type: 'TIMED_OUT',
          error_code: 'TIMED_OUT',
        }),
      );
    });
  });
});
