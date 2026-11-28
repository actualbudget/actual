import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handlers as app } from './app-pluggyai';

const service = vi.hoisted(() => ({
  getCredentialSource: vi.fn(),
  getTransactionsByAccountId: vi.fn(),
  getAccountById: vi.fn(),
}));

vi.mock('./pluggyai-service', () => ({ pluggyaiService: service }));

describe('Pluggy transaction balances', () => {
  beforeEach(() => {
    service.getCredentialSource.mockReturnValue('global');
    service.getTransactionsByAccountId.mockResolvedValue([]);
  });

  it.each([
    [1234, 'BANK', '1234'],
    [1234.5, 'BANK', '1234.5'],
    [1234.567, 'BANK', '1234.567'],
    [0, 'BANK', '0'],
    [12.345, 'CREDIT', '-12.345'],
    [-12.345, 'CREDIT', '12.345'],
  ])('maps %s %s to %s', async (balance, type, expected) => {
    service.getAccountById.mockResolvedValue({
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
      service.getAccountById.mockResolvedValue({
        balance,
        type: 'BANK',
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
    [1.234, 'BANK', '1.234'],
    [1.234, 'CREDIT', '-1.234'],
    [0, 'BANK', '0'],
    [Number.NaN, 'BANK', null],
  ])('maps transaction amount %s for %s', async (amount, type, expected) => {
    service.getAccountById.mockResolvedValue({
      balance: 10,
      type,
      updatedAt: new Date('2026-07-01T00:00:00Z'),
      currencyCode: 'USD',
    });
    service.getTransactionsByAccountId.mockResolvedValue([
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
