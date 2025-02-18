import { mockTransactionAmount } from '../../services/tests/fixtures.js';
import Virgin from '../virgin_nrnbgb22.js';

describe('Virgin', () => {
  describe('#normalizeTransaction', () => {
    it('does not alter simple payee information', () => {
      const transaction = {
        bookingDate: '2024-01-01T00:00:00Z',
        remittanceInformationUnstructured: 'DIRECT DEBIT PAYMENT',
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Virgin.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction.payeeName).toEqual('Direct Debit Payment');
      expect(normalizedTransaction.notes).toEqual('DIRECT DEBIT PAYMENT');
    });

    it('formats bank transfer payee and references', () => {
      const transaction = {
        bookingDate: '2024-01-01T00:00:00Z',
        remittanceInformationUnstructured: 'FPS, Joe Bloggs, Food',
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Virgin.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction.payeeName).toEqual('Joe Bloggs');
      expect(normalizedTransaction.notes).toEqual('Food');
    });

    it('removes method information from payee name', () => {
      const transaction = {
        bookingDate: '2024-01-01T00:00:00Z',
        remittanceInformationUnstructured: 'Card 99, Tesco Express',
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Virgin.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction.payeeName).toEqual('Tesco Express');
      expect(normalizedTransaction.notes).toEqual('Card 99, Tesco Express');
    });
  });
});
