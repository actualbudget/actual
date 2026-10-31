import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SecretName, secretsService } from '#services/secrets-service';

import { handlers as app } from './app-akahu';

const mockAccounts = vi.hoisted(() => ({
  get: vi.fn(),
  listTransactions: vi.fn(),
  listPendingTransactions: vi.fn(),
}));

vi.mock('akahu', () => ({
  AkahuClient: class {
    accounts = mockAccounts;
  },
}));

describe('Akahu decimal wire amounts', () => {
  beforeEach(() => {
    secretsService.set(SecretName.akahu_userToken, 'user-token');
    secretsService.set(SecretName.akahu_appToken, 'app-token');
    mockAccounts.get.mockResolvedValue({
      balance: { current: 12.345, available: 0, currency: 'NZD' },
    });
    mockAccounts.listTransactions.mockResolvedValue({
      items: [
        {
          _id: 'booked-1',
          date: '2026-07-01T00:00:00Z',
          description: 'Purchase',
          amount: -1.234,
        },
      ],
    });
    mockAccounts.listPendingTransactions.mockResolvedValue([
      {
        _id: 'pending-1',
        date: '2026-07-01T00:00:00Z',
        description: 'Pending',
        amount: 0.005,
      },
    ]);
  });

  it('preserves balance and transaction precision, including zero available balance', async () => {
    const res = await request(app)
      .post('/transactions')
      .set('x-actual-token', 'valid-token')
      .send({ accountId: 'account-1', startDate: '2026-01-01' });

    expect(res.body.data.startingBalance).toBe('12.345');
    expect(res.body.data.startingBalanceCurrency).toBe('NZD');
    expect(
      res.body.data.balances.map(
        (balance: { balanceAmount: { amount: string } }) =>
          balance.balanceAmount.amount,
      ),
    ).toEqual(['12.345', '0']);
    expect(res.body.data.transactions.booked[0].transactionAmount.amount).toBe(
      '-1.234',
    );
    expect(res.body.data.transactions.pending[0].transactionAmount.amount).toBe(
      '0.005',
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, null])(
    'rejects invalid balance %s',
    async current => {
      mockAccounts.get.mockResolvedValue({
        balance: { current, currency: 'NZD' },
      });

      const res = await request(app)
        .post('/transactions')
        .set('x-actual-token', 'valid-token')
        .send({ accountId: 'account-1', startDate: '2026-01-01' });

      expect(res.body.data.error).toContain('Invalid Akahu amount');
    },
  );

  it('rejects an invalid transaction before returning the batch', async () => {
    mockAccounts.listTransactions.mockResolvedValue({
      items: [
        {
          _id: 'booked-1',
          date: '2026-07-01T00:00:00Z',
          description: 'Purchase',
          amount: Number.NaN,
        },
      ],
    });

    const res = await request(app)
      .post('/transactions')
      .set('x-actual-token', 'valid-token')
      .send({ accountId: 'account-1', startDate: '2026-01-01' });

    expect(res.body.data.error).toContain('Invalid Akahu amount');
  });
});
