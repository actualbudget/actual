import { mockTransactionAmount } from '../services/tests/fixtures.js';
import { sortByBookingDateOrValueDate } from '../utils.js';

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
      expect(sortByBookingDateOrValueDate(transactions)).toEqual([
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

    it('should sort by valueDate if bookingDate is missing', () => {
      const transactions = [
        {
          valueDate: '2023-01-01',
          transactionAmount: mockTransactionAmount,
        },
        {
          valueDate: '2023-01-20',
          transactionAmount: mockTransactionAmount,
        },
        {
          valueDate: '2023-01-10',
          transactionAmount: mockTransactionAmount,
        },
      ];
      expect(sortByBookingDateOrValueDate(transactions)).toEqual([
        {
          valueDate: '2023-01-20',
          transactionAmount: mockTransactionAmount,
        },
        {
          valueDate: '2023-01-10',
          transactionAmount: mockTransactionAmount,
        },
        {
          valueDate: '2023-01-01',
          transactionAmount: mockTransactionAmount,
        },
      ]);
    });

    it('should use bookingDate primarily even if bookingDateTime is on an other date', () => {
      const transactions = [
        {
          bookingDate: '2023-01-01',
          bookingDateTime: '2023-01-01T00:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-10',
          bookingDateTime: '2023-01-01T12:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-01',
          bookingDateTime: '2023-01-01T12:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-10',
          bookingDateTime: '2023-01-01T00:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
      ];
      expect(sortByBookingDateOrValueDate(transactions)).toEqual([
        {
          bookingDate: '2023-01-10',
          bookingDateTime: '2023-01-01T12:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-10',
          bookingDateTime: '2023-01-01T00:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-01',
          bookingDateTime: '2023-01-01T12:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-01',
          bookingDateTime: '2023-01-01T00:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
      ]);
    });

    it('should sort on booking date if value date is widely off', () => {
      const transactions = [
        {
          bookingDate: '2023-01-01',
          valueDateTime: '2023-01-31T00:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-02',
          valueDateTime: '2023-01-02T12:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-30',
          valueDateTime: '2023-01-01T12:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-30',
          valueDateTime: '2023-01-01T00:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
      ];
      expect(sortByBookingDateOrValueDate(transactions)).toEqual([
        {
          bookingDate: '2023-01-30',
          valueDateTime: '2023-01-01T12:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-30',
          valueDateTime: '2023-01-01T00:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-02',
          valueDateTime: '2023-01-02T12:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
        {
          bookingDate: '2023-01-01',
          valueDateTime: '2023-01-31T00:00:00Z',
          transactionAmount: mockTransactionAmount,
        },
      ]);
    });
  });
});
