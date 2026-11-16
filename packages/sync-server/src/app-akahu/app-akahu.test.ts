import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handlers as app } from './app-akahu';

const listTransactionsMock = vi.fn();
const listPendingTransactionsMock = vi.fn();
const accountGetMock = vi.fn();

vi.mock('akahu', () => ({
  AkahuClient: vi.fn(function () {
    return {
      accounts: {
        get: accountGetMock,
        listTransactions: listTransactionsMock,
        listPendingTransactions: listPendingTransactionsMock,
      },
    };
  }),
}));

vi.mock('#services/secrets-service', () => ({
  SecretName: {
    akahu_userToken: 'akahu_userToken',
    akahu_appToken: 'akahu_appToken',
  },
  secretsService: {
    get: vi.fn((key: string) =>
      key === 'akahu_userToken' || key === 'akahu_appToken'
        ? 'test-token'
        : null,
    ),
  },
}));

vi.mock('#util/middlewares', () => ({
  requestLoggerMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
  validateSessionMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
}));

describe('app-akahu /transactions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    listTransactionsMock.mockReset();
    listPendingTransactionsMock.mockReset();
    accountGetMock.mockReset();

    accountGetMock.mockResolvedValue({
      _id: 'acc_1',
      balance: { current: 100, available: 100, currency: 'NZD' },
      refreshed: {
        balance: '2026-11-14T19:00:00.000Z',
        transactions: '2026-11-14T19:00:00.000Z',
      },
    });
    listPendingTransactionsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('interprets YYYY-MM-DD startDate as Pacific/Auckland midnight and keeps early-NZ-day transactions', async () => {
    // 2026-11-14T20:00:00Z = 2026-11-15 09:00:00 NZDT (before 1pm NZDT)
    vi.setSystemTime(new Date('2026-11-14T20:00:00.000Z'));

    listTransactionsMock.mockResolvedValue({
      items: [
        {
          _id: 'tx_early_nz',
          // 2026-11-15 03:00:00 NZDT (after NZ midnight, before UTC midnight)
          date: '2026-11-14T14:00:00.000Z',
          amount: -12.5,
          description: 'Early NZ Coffee',
        },
      ],
      cursor: {},
    });

    const res = await request(app)
      .post('/transactions')
      .send({ accountId: 'acc_1', startDate: '2026-11-15' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(listTransactionsMock).toHaveBeenCalledWith(
      'test-token',
      'acc_1',
      expect.objectContaining({
        // Midnight NZDT (UTC+13) for 2026-11-15 is 2026-11-14T11:00:00.000Z.
        // Akahu treats `start` as exclusive, so we ask from 1ms earlier.
        start: '2026-11-14T10:59:59.999Z',
      }),
    );
    expect(res.body.data.transactions.all).toHaveLength(1);
    expect(res.body.data.transactions.all[0].transactionId).toBe('tx_early_nz');
  });

  it('clamps startDate to now when NZ midnight would still be in the future', async () => {
    // 2026-11-14T10:30:00Z = 2026-11-14 23:30:00 NZDT (before 2026-11-15 NZDT midnight)
    vi.setSystemTime(new Date('2026-11-14T10:30:00.000Z'));

    listTransactionsMock.mockResolvedValue({
      items: [],
      cursor: {},
    });

    const res = await request(app)
      .post('/transactions')
      .send({ accountId: 'acc_1', startDate: '2026-11-15' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(listTransactionsMock).toHaveBeenCalledWith(
      'test-token',
      'acc_1',
      expect.objectContaining({
        start: '2026-11-14T10:29:59.999Z',
      }),
    );
  });

  it('keeps a transaction made exactly at NZ midnight', async () => {
    vi.setSystemTime(new Date('2026-11-14T20:00:00.000Z'));

    listTransactionsMock.mockResolvedValue({
      items: [
        {
          _id: 'tx_midnight',
          date: '2026-11-14T11:00:00.000Z',
          amount: -1,
          description: 'Midnight Snack',
        },
      ],
      cursor: {},
    });

    const res = await request(app)
      .post('/transactions')
      .send({ accountId: 'acc_1', startDate: '2026-11-15' });

    expect(res.body.data.transactions.all).toHaveLength(1);
  });

  it.each([
    // Daylight saving ends at 3am on 2027-04-04, so midnight is still NZDT (UTC+13)
    ['2027-04-04', '2027-04-03T10:59:59.999Z'],
    // ...and the day after is NZST (UTC+12)
    ['2027-04-05', '2027-04-04T11:59:59.999Z'],
    // Daylight saving starts at 2am on 2027-09-26, so midnight is still NZST (UTC+12)
    ['2027-09-26', '2027-09-25T11:59:59.999Z'],
    // ...and the day after is NZDT (UTC+13)
    ['2027-09-27', '2027-09-26T10:59:59.999Z'],
  ])(
    'resolves NZ midnight around daylight saving transitions (%s)',
    async (startDate, expectedStart) => {
      vi.setSystemTime(new Date('2027-12-01T00:00:00.000Z'));

      accountGetMock.mockResolvedValue({
        _id: 'acc_1',
        balance: { current: 100, available: 100, currency: 'NZD' },
      });
      listTransactionsMock.mockResolvedValue({ items: [], cursor: {} });

      const res = await request(app)
        .post('/transactions')
        .send({ accountId: 'acc_1', startDate });

      expect(res.status).toBe(200);
      expect(listTransactionsMock).toHaveBeenCalledWith(
        'test-token',
        'acc_1',
        expect.objectContaining({ start: expectedStart }),
      );
    },
  );
});
