import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SecretName, secretsService } from '#services/secrets-service';

import { handlers as app } from './app-lhv';

const AUTH_URL = 'https://auth.lhv.ai/oauth2/token';
const ACCOUNTS_URL = 'https://api.lhv.ai/api/v1/accounts';
const ADMIN_TOKEN = 'valid-token';

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

function post(path: string, fileId: string) {
  return request(app)
    .post(path)
    .set('x-actual-token', ADMIN_TOKEN)
    .set('X-Actual-File-Id', fileId);
}

describe('app-lhv', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('refreshes on 401, retries with the rotated refresh token, and persists the latest rotation', async () => {
    const fileId = 'lhv-refresh-retry-file';
    secretsService.set(SecretName.lhv_refreshToken, 'refresh-1', fileId);

    const refreshTokensUsed: string[] = [];
    const accountAuthorizations: string[] = [];

    global.fetch = vi
      .fn()
      .mockImplementation((url: string, options?: RequestInit) => {
        if (url === AUTH_URL) {
          const params = new URLSearchParams(String(options?.body ?? ''));
          const refreshToken = params.get('refresh_token');
          refreshTokensUsed.push(String(refreshToken));

          if (refreshToken === 'refresh-1') {
            return Promise.resolve(
              jsonResponse(200, {
                access_token: 'access-1',
                refresh_token: 'refresh-2',
              }),
            );
          }

          if (refreshToken === 'refresh-2') {
            return Promise.resolve(
              jsonResponse(200, {
                access_token: 'access-2',
                refresh_token: 'refresh-3',
              }),
            );
          }
        }

        if (url === ACCOUNTS_URL) {
          const authHeader = String(
            (options?.headers as Record<string, string>)?.Authorization,
          );
          accountAuthorizations.push(authHeader);

          if (authHeader === 'Bearer access-1') {
            return Promise.resolve(jsonResponse(401, { error: 'expired' }));
          }

          if (authHeader === 'Bearer access-2') {
            return Promise.resolve(
              jsonResponse(200, [
                {
                  iban: 'EE123',
                  name: 'Main account',
                  currency: 'EUR',
                  availableBalance: '12.34',
                },
              ]),
            );
          }
        }

        throw new Error(`Unexpected fetch: ${url}`);
      });

    const res = await post('/accounts', fileId);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.accounts).toEqual([
      {
        account_id: 'EE123',
        balance: 12.34,
        institution: 'LHV',
        name: 'Main account',
        orgDomain: 'lhv.ee',
        orgId: 'lhv',
      },
    ]);
    expect(refreshTokensUsed).toEqual(['refresh-1', 'refresh-2']);
    expect(accountAuthorizations).toEqual([
      'Bearer access-1',
      'Bearer access-2',
    ]);
    expect(secretsService.get(SecretName.lhv_refreshToken, fileId)).toBe(
      'refresh-3',
    );
  });

  it('keeps access tokens isolated per budget file', async () => {
    const fileA = 'lhv-isolation-file-a';
    const fileB = 'lhv-isolation-file-b';
    secretsService.set(SecretName.lhv_refreshToken, 'refresh-a', fileA);
    secretsService.set(SecretName.lhv_refreshToken, 'refresh-b', fileB);

    const refreshTokensUsed: string[] = [];
    const accountAuthorizationsByFile = new Map<string, string[]>();

    global.fetch = vi
      .fn()
      .mockImplementation((url: string, options?: RequestInit) => {
        if (url === AUTH_URL) {
          const params = new URLSearchParams(String(options?.body ?? ''));
          const refreshToken = String(params.get('refresh_token'));
          refreshTokensUsed.push(refreshToken);

          return Promise.resolve(
            jsonResponse(200, {
              access_token:
                refreshToken === 'refresh-a' ? 'access-a' : 'access-b',
              refresh_token: refreshToken,
            }),
          );
        }

        if (url === ACCOUNTS_URL) {
          const authHeader = String(
            (options?.headers as Record<string, string>)?.Authorization,
          );
          const fileId = authHeader === 'Bearer access-a' ? fileA : fileB;
          const existing = accountAuthorizationsByFile.get(fileId) ?? [];
          existing.push(authHeader);
          accountAuthorizationsByFile.set(fileId, existing);

          return Promise.resolve(
            jsonResponse(200, [
              {
                iban: fileId,
                name: fileId,
                currency: 'EUR',
                availableBalance: '0.00',
              },
            ]),
          );
        }

        throw new Error(`Unexpected fetch: ${url}`);
      });

    await post('/accounts', fileA);
    await post('/accounts', fileB);
    await post('/accounts', fileA);

    expect(refreshTokensUsed).toEqual(['refresh-a', 'refresh-b']);
    expect(accountAuthorizationsByFile.get(fileA)).toEqual([
      'Bearer access-a',
      'Bearer access-a',
    ]);
    expect(accountAuthorizationsByFile.get(fileB)).toEqual(['Bearer access-b']);
  });

  it('shares an in-flight token refresh between concurrent requests for one budget file', async () => {
    const fileId = 'lhv-concurrent-refresh-file';
    secretsService.set(SecretName.lhv_refreshToken, 'refresh-shared', fileId);

    let refreshCount = 0;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === AUTH_URL) {
        refreshCount++;
        return Promise.resolve(
          jsonResponse(200, {
            access_token: 'access-shared',
            refresh_token: 'refresh-shared-2',
          }),
        );
      }

      if (url === ACCOUNTS_URL) {
        return Promise.resolve(jsonResponse(200, []));
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const [first, second] = await Promise.all([
      post('/accounts', fileId),
      post('/accounts', fileId),
    ]);

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(refreshCount).toBe(1);
    expect(secretsService.get(SecretName.lhv_refreshToken, fileId)).toBe(
      'refresh-shared-2',
    );
  });

  it('maps booked transactions, preserves signed amounts, and falls back to account balance when statement balances are missing', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-03T12:00:00.000Z'));

    const fileId = 'lhv-mapping-file';
    const iban = 'EE471000001020145685';
    secretsService.set(SecretName.lhv_refreshToken, 'refresh-map', fileId);

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === AUTH_URL) {
        return Promise.resolve(
          jsonResponse(200, {
            access_token: 'access-map',
            refresh_token: 'refresh-map-2',
          }),
        );
      }

      if (url === ACCOUNTS_URL) {
        return Promise.resolve(
          jsonResponse(200, [
            {
              iban,
              name: 'Checking',
              currency: 'EUR',
              availableBalance: '15.00',
            },
          ]),
        );
      }

      if (
        url.startsWith(`${ACCOUNTS_URL}/${encodeURIComponent(iban)}/statement?`)
      ) {
        return Promise.resolve(
          jsonResponse(200, {
            hasMore: false,
            balances: [],
            transactions: [
              {
                booked: true,
                bankReference: 'BR-1',
                settlementDtime: '2026-02-02T00:30:00+02:00',
                direction: 'DEBIT',
                amount: '-12.34',
                currency: 'EUR',
                description: 'POS purchase',
                paymentData: {
                  creditor: { name: 'Coffee Shop' },
                },
              },
              {
                booked: true,
                bankReference: 'BR-2',
                settlementDtime: '2026-02-01T08:00:00Z',
                direction: 'CREDIT',
                amount: '45.67',
                currency: 'EUR',
                description: 'Monthly salary',
                paymentData: {
                  debtor: { name: 'Employer Inc' },
                },
              },
              {
                booked: false,
                bankReference: 'BR-3',
                settlementDtime: '2026-02-03T09:00:00Z',
                direction: 'DEBIT',
                amount: '-1.00',
                currency: 'EUR',
                description: 'Pending',
              },
            ],
          }),
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const res = await post('/transactions', fileId).send({
      accountId: iban,
      startDate: '2026-02-01',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.startingBalance).toBe(1500);
    expect(res.body.data.balances).toEqual([
      {
        balanceAmount: {
          amount: '15.00',
          currency: 'EUR',
        },
        balanceType: 'interimAvailable',
        referenceDate: '2026-02-03',
      },
    ]);
    expect(res.body.data.transactions.pending).toEqual([]);
    expect(res.body.data.transactions.booked).toEqual([
      {
        booked: true,
        settlementDtime: '2026-02-02T00:30:00+02:00',
        date: '2026-02-02',
        postedDate: '2026-02-02',
        valueDate: '2026-02-02',
        payeeName: 'Coffee Shop',
        notes: 'POS purchase',
        sortOrder: Date.parse('2026-02-02T00:30:00+02:00'),
        transactionAmount: {
          amount: '-12.34',
          currency: 'EUR',
        },
        transactionId: `${iban}:BR-1`,
      },
      {
        booked: true,
        settlementDtime: '2026-02-01T08:00:00Z',
        date: '2026-02-01',
        postedDate: '2026-02-01',
        valueDate: '2026-02-01',
        payeeName: 'Employer Inc',
        notes: 'Monthly salary',
        sortOrder: Date.parse('2026-02-01T08:00:00Z'),
        transactionAmount: {
          amount: '45.67',
          currency: 'EUR',
        },
        transactionId: `${iban}:BR-2`,
      },
    ]);
  });

  it('recursively bisects inclusive date ranges when LHV reports more results', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-04T12:00:00.000Z'));

    const fileId = 'lhv-pagination-file';
    const iban = 'EE999';
    secretsService.set(SecretName.lhv_refreshToken, 'refresh-page', fileId);

    const queriedRanges: Array<[string, string]> = [];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === AUTH_URL) {
        return Promise.resolve(
          jsonResponse(200, {
            access_token: 'access-page',
            refresh_token: 'refresh-page',
          }),
        );
      }

      if (url === ACCOUNTS_URL) {
        return Promise.resolve(
          jsonResponse(200, [
            {
              iban,
              name: 'Checking',
              currency: 'EUR',
              availableBalance: '20.00',
            },
          ]),
        );
      }

      if (
        url.startsWith(`${ACCOUNTS_URL}/${encodeURIComponent(iban)}/statement?`)
      ) {
        const parsed = new URL(url);
        const dateFrom = String(parsed.searchParams.get('dateFrom'));
        const dateTo = String(parsed.searchParams.get('dateTo'));
        expect(parsed.searchParams.get('limit')).toBe('50');
        expect(parsed.searchParams.get('includeReservations')).toBe('false');
        expect(parsed.searchParams.get('includeBalances')).toBe('true');
        queriedRanges.push([dateFrom, dateTo]);

        if (dateFrom === '2026-01-01' && dateTo === '2026-01-04') {
          return Promise.resolve(
            jsonResponse(200, { hasMore: true, transactions: [] }),
          );
        }

        if (dateFrom === '2026-01-01' && dateTo === '2026-01-02') {
          return Promise.resolve(
            jsonResponse(200, {
              hasMore: false,
              balances: [
                {
                  amount: '19.00',
                  currency: 'EUR',
                  type: 'STARTING_BALANCE',
                  date: '2026-01-02',
                },
              ],
              transactions: [
                {
                  booked: true,
                  bankReference: 'LEFT',
                  settlementDtime: '2026-01-02T12:00:00Z',
                  direction: 'DEBIT',
                  amount: '-1.00',
                  currency: 'EUR',
                  description: 'Left side',
                },
              ],
            }),
          );
        }

        if (dateFrom === '2026-01-03' && dateTo === '2026-01-04') {
          return Promise.resolve(
            jsonResponse(200, {
              hasMore: false,
              balances: [
                {
                  amount: '20.00',
                  currency: 'EUR',
                  type: 'FINAL_BALANCE',
                  date: '2026-01-04',
                },
              ],
              transactions: [
                {
                  booked: true,
                  bankReference: 'RIGHT',
                  settlementDtime: '2026-01-04T07:00:00Z',
                  direction: 'CREDIT',
                  amount: '2.00',
                  currency: 'EUR',
                  description: 'Right side',
                },
              ],
            }),
          );
        }
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const res = await post('/transactions', fileId).send({
      accountId: iban,
      startDate: '2026-01-01',
    });

    expect(res.statusCode).toBe(200);
    expect(queriedRanges).toEqual([
      ['2026-01-01', '2026-01-04'],
      ['2026-01-01', '2026-01-02'],
      ['2026-01-03', '2026-01-04'],
    ]);
    expect(
      res.body.data.transactions.booked.map(
        (tx: { transactionId: string }) => tx.transactionId,
      ),
    ).toEqual([`${iban}:RIGHT`, `${iban}:LEFT`]);
    expect(res.body.data.startingBalance).toBe(2000);
  });

  it('fails without returning partial data when one day still overflows the statement limit', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));

    const fileId = 'lhv-overflow-file';
    const iban = 'EEOVERFLOW';
    secretsService.set(SecretName.lhv_refreshToken, 'refresh-overflow', fileId);

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === AUTH_URL) {
        return Promise.resolve(
          jsonResponse(200, {
            access_token: 'access-overflow',
            refresh_token: 'refresh-overflow',
          }),
        );
      }

      if (url === ACCOUNTS_URL) {
        return Promise.resolve(
          jsonResponse(200, [
            {
              iban,
              name: 'Overflow',
              currency: 'EUR',
              availableBalance: '10.00',
            },
          ]),
        );
      }

      if (
        url.startsWith(`${ACCOUNTS_URL}/${encodeURIComponent(iban)}/statement?`)
      ) {
        return Promise.resolve(
          jsonResponse(200, {
            hasMore: true,
            balances: [
              {
                amount: '10.00',
                currency: 'EUR',
                type: 'interimAvailable',
                date: '2026-01-01',
              },
            ],
            transactions: [
              {
                booked: true,
                bankReference: 'PARTIAL',
                settlementDtime: '2026-01-01T07:00:00Z',
                direction: 'DEBIT',
                amount: '-1.00',
                currency: 'EUR',
                description: 'Should not leak',
              },
            ],
          }),
        );
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const res = await post('/transactions', fileId).send({
      accountId: iban,
      startDate: '2026-01-01',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.error_code).toBe('PAGE_LIMIT_EXCEEDED');
    expect(res.body.data.transactions).toBeUndefined();
  });
});
