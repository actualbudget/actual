import Virgin from '../virgin_nrnbgb22.js';
import { mockTransactionAmount } from '../../services/tests/fixtures.js';

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

      expect(normalizedTransaction.creditorName).toEqual(
        'DIRECT DEBIT PAYMENT',
      );
      expect(normalizedTransaction.debtorName).toEqual('DIRECT DEBIT PAYMENT');
      expect(normalizedTransaction.remittanceInformationUnstructured).toEqual(
        'DIRECT DEBIT PAYMENT',
      );
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

      expect(normalizedTransaction.creditorName).toEqual('Joe Bloggs');
      expect(normalizedTransaction.debtorName).toEqual('Joe Bloggs');
      expect(normalizedTransaction.remittanceInformationUnstructured).toEqual(
        'Food',
      );
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

      expect(normalizedTransaction.creditorName).toEqual('Tesco Express');
      expect(normalizedTransaction.debtorName).toEqual('Tesco Express');
      expect(normalizedTransaction.remittanceInformationUnstructured).toEqual(
        'Card 99, Tesco Express',
      );
    });
  });
});
