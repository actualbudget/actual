import Nationwide from '../nationwide_naiagb21.js';
import { mockTransactionAmount } from '../../services/tests/fixtures.js';

describe('Nationwide', () => {
  describe('#normalizeTransaction', () => {
    it('retains date for booked transaction', () => {
      const d = new Date();
      d.setDate(d.getDate() - 7);

      const date = d.toISOString().split('T')[0];

      const transaction = {
        bookingDate: date,
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Nationwide.normalizeTransaction(
        transaction,
        true,
      );

      expect(normalizedTransaction.date).toEqual(date);
    });

    it('fixes date for pending transactions', () => {
      const d = new Date();
      const date = d.toISOString().split('T')[0];

      const transaction = {
        bookingDate: date,
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Nationwide.normalizeTransaction(
        transaction,
        false,
      );

      expect(new Date(normalizedTransaction.date).getTime()).toBeLessThan(
        d.getTime(),
      );
    });

    it('keeps transactionId if in the correct format', () => {
      const transactionId = 'a896729bb8b30b5ca862fe70bd5967185e2b5d3a';
      const transaction = {
        bookingDate: '2024-01-01T00:00:00Z',
        transactionId,
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Nationwide.normalizeTransaction(
        transaction,
        false,
      );

      expect(normalizedTransaction.transactionId).toBe(transactionId);
    });

    it('unsets transactionId if not valid length', () => {
      const transaction = {
        bookingDate: '2024-01-01T00:00:00Z',
        transactionId: '0123456789',
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Nationwide.normalizeTransaction(
        transaction,
        false,
      );

      expect(normalizedTransaction.transactionId).toBeNull();
    });

    it('unsets transactionId if debit placeholder found', () => {
      const transaction = {
        bookingDate: '2024-01-01T00:00:00Z',
        transactionId: '00DEBIT202401010000000000-1000SUPERMARKET',
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Nationwide.normalizeTransaction(
        transaction,
        false,
      );

      expect(normalizedTransaction.transactionId).toBeNull();
    });

    it('unsets transactionId if credit placeholder found', () => {
      const transaction = {
        bookingDate: '2024-01-01T00:00:00Z',
        transactionId: '00CREDIT202401010000000000-1000SUPERMARKET',
        transactionAmount: mockTransactionAmount,
      };

      const normalizedTransaction = Nationwide.normalizeTransaction(
        transaction,
        false,
      );

      expect(normalizedTransaction.transactionId).toBeNull();
    });
  });
});
