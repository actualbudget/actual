import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('#util/middlewares', () => ({
  requestLoggerMiddleware: (_req, _res, next) => next(),
  validateSessionMiddleware: (_req, _res, next) => next(),
}));

vi.mock('./pluggyai-service', () => ({
  pluggyaiService: {
    getAccountById: vi.fn(),
    getAccountsByItemId: vi.fn(),
    getTransactionsByAccountId: vi.fn(),
  },
}));

const { handlers: app } = await import('./app-pluggyai');
const { pluggyaiService } = await import('./pluggyai-service');

describe('app-pluggyai', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('/transactions', () => {
    it('drops Pluggy category fields from synced transactions', async () => {
      pluggyaiService.getAccountById.mockResolvedValue({
        balance: 123.45,
        currencyCode: 'BRL',
        type: 'CHECKING',
        updatedAt: new Date('2026-07-03T12:00:00.000Z'),
      });
      pluggyaiService.getTransactionsByAccountId.mockResolvedValue([
        {
          id: 'tx-1',
          amount: 12.34,
          amountInAccountCurrency: null,
          category: 'Food & Dining',
          categoryId: 'pluggy-category-id',
          currencyCode: 'BRL',
          date: new Date('2026-07-02T10:00:00.000Z'),
          description: 'Coffee',
          descriptionRaw: 'COFFEE SHOP',
          merchant: { name: 'Coffee Shop' },
          status: 'POSTED',
        },
      ]);

      const res = await request(app).post('/transactions').send({
        accountId: 'account-1',
        startDate: '2026-07-01',
      });

      expect(res.body.status).toBe('ok');
      expect(pluggyaiService.getTransactionsByAccountId).toHaveBeenCalledWith(
        'account-1',
        '2026-07-01',
      );

      const [transaction] = res.body.data.transactions.all;
      expect(transaction).toEqual(
        expect.objectContaining({
          booked: true,
          date: '2026-07-02',
          notes: 'COFFEE SHOP',
          originalDate: '2026-07-02',
          payeeName: 'Coffee Shop',
          transactionAmount: {
            amount: 12.34,
            currency: 'BRL',
          },
          transactionId: 'tx-1',
        }),
      );
      expect(transaction).not.toHaveProperty('category');
      expect(transaction).not.toHaveProperty('categoryId');
    });
  });
});
