import Belfius from '../belfius_gkccbebb.js';
import { mockTransactionAmount } from '../../services/tests/fixtures.js';

describe('Belfius', () => {
  describe('#normalizeTransaction', () => {
    it('returns the internalTransactionId as transactionId', () => {
      const transaction = {
        transactionId: 'non-unique-id',
        internalTransactionId: 'D202301180000003',
        transactionAmount: mockTransactionAmount,
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
