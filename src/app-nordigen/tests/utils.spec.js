import { mockTransactionAmount } from '../services/tests/fixtures.js';
import { sortByBookingDate } from '../utils.js';

describe('utils', () => {
  describe('#sortByBookingDate', () => {
    it('sorts transactions by bookingDate field from newest to oldest', () => {
      const transactions = [
        {
          bookingDate: '2023-01-01',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-20',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-10',
          transactionAmount: mockTransactionAmount,
        },
      ];
      expect(sortByBookingDate(transactions)).toEqual([
        {
          bookingDate: '2023-01-20',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-10',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-01',
          transactionAmount: mockTransactionAmount,
        },
      ]);
    });
  });
});
