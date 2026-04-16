import Belfius from '#app-gocardless/banks/belfius_gkccbebb';
import { mockTransactionAmount } from '#app-gocardless/services/tests/fixtures';

describe('Belfius', () => {
  describe('#normalizeTransaction', () => {
    it('returns the internalTransactionId as transactionId', () => {
      const transaction = {
        transactionId: 'non-unique-id',
        internalTransactionId: 'D202301180000003',
        transactionAmount: mockTransactionAmount,
        date: new Date().toISOString(),
      };
      const normalizedTransaction = Belfius.normalizeTransaction(
        transaction,
        true,
      );
      expect(normalizedTransaction.transactionId).toEqual(
        transaction.internalTransactionId,
      );
    });
  });
});
