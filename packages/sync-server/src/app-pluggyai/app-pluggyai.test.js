import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handlers as app } from './app-pluggyai';
import { pluggyaiService } from './pluggyai-service';

vi.mock('./pluggyai-service', () => ({
  pluggyaiService: {
    getCredentialSource: vi.fn(),
    getTransactionsByAccountId: vi.fn(),
    getAccountById: vi.fn(),
  },
}));

describe('Pluggy transaction balances', () => {
  beforeEach(() => {
    vi.mocked(pluggyaiService.getCredentialSource).mockReturnValue('global');
    vi.mocked(pluggyaiService.getTransactionsByAccountId).mockResolvedValue([]);
  });

  it.each([
    [1234, 'CHECKING', '1234'],
    [1234.5, 'CHECKING', '1234.5'],
    [1234.567, 'CHECKING', '1234.567'],
    [0, 'CHECKING', '0'],
    [12.345, 'CREDIT', '-12.345'],
    [-12.345, 'CREDIT', '12.345'],
  ])('maps %s %s to %s', async (balance, type, expected) => {
    vi.mocked(pluggyaiService.getAccountById).mockResolvedValue({
      balance,
      type,
      updatedAt: new Date('2026-07-01T00:00:00Z'),
      currencyCode: 'USD',
    });

    const res = await request(app)
      .post('/transactions')
      .set('x-actual-token', 'valid-token')
      .send({ accountId: 'account-1', startDate: '2026-07-01' });

    expect(res.body.data.startingBalance).toBe(expected);
    expect(res.body.data.startingBalanceCurrency).toBe('USD');
    expect(res.body.data.balances[0].balanceAmount.amount).toBe(expected);
  });

  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid balance %s',
    async balance => {
      vi.mocked(pluggyaiService.getAccountById).mockResolvedValue({
        balance,
        type: 'CHECKING',
        updatedAt: new Date('2026-07-01T00:00:00Z'),
        currencyCode: 'USD',
      });

      const res = await request(app)
        .post('/transactions')
        .set('x-actual-token', 'valid-token')
        .send({ accountId: 'account-1', startDate: '2026-07-01' });

      expect(res.body.data.error).toBe('Invalid Pluggy balance');
    },
  );

  it.each([
    [1.234, 'CHECKING', '1.234'],
    [1.234, 'CREDIT', '-1.234'],
    [0, 'CHECKING', '0'],
    [Number.NaN, 'CHECKING', null],
  ])('maps transaction amount %s for %s', async (amount, type, expected) => {
    vi.mocked(pluggyaiService.getAccountById).mockResolvedValue({
      balance: 10,
      type,
      updatedAt: new Date('2026-07-01T00:00:00Z'),
      currencyCode: 'USD',
    });
    vi.mocked(pluggyaiService.getTransactionsByAccountId).mockResolvedValue([
      {
        id: 'transaction-1',
        date: new Date('2026-07-01T00:00:00Z'),
        amount,
        currencyCode: 'USD',
        status: 'POSTED',
      },
    ]);

    const res = await request(app)
      .post('/transactions')
      .set('x-actual-token', 'valid-token')
      .send({ accountId: 'account-1', startDate: '2026-07-01' });

    if (expected !== null) {
      expect(res.body.data.transactions.all[0].transactionAmount.amount).toBe(
        expected,
      );
    } else {
      expect(res.body.data.error).toBe('Invalid Pluggy transaction amount');
    }
  });
});
