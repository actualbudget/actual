import { describe, it, expect } from 'vitest';

import {
  SEQ_MULTIPLIER,
  MAX_SEQ,
  generateSortOrder,
  extractSeq,
  extractDateInt,
  isLegacyTimestamp,
  validateSeq,
  getNextSeqForDate,
  assignBatchSeq,
} from '../../shared/sort-order';

describe('sort-order utilities', () => {
  describe('generateSortOrder', () => {
    it('generates correct sort_order for date and seq', () => {
      expect(generateSortOrder('2024-01-15', 1)).toBe(2024011500001);
      expect(generateSortOrder('2024-01-15', 42)).toBe(2024011500042);
      expect(generateSortOrder('2024-12-31', 999)).toBe(2024123100999);
    });

    it('defaults seq to 1', () => {
      expect(generateSortOrder('2024-01-15')).toBe(2024011500001);
    });

    it('handles edge case dates', () => {
      expect(generateSortOrder('2000-01-01', 1)).toBe(2000010100001);
      // Note: 9999-12-31 exceeds JavaScript MAX_SAFE_INTEGER
      // Practical date limit is around 2099
      expect(generateSortOrder('2099-12-31', 1)).toBe(2099123100001);
    });

    it('handles large seq values', () => {
      expect(generateSortOrder('2024-01-15', MAX_SEQ)).toBe(
        2024011500000 + MAX_SEQ,
      );
    });
  });

  describe('extractSeq', () => {
    it('extracts seq from new format sort_order', () => {
      expect(extractSeq(2024011500001)).toBe(1);
      expect(extractSeq(2024011500042)).toBe(42);
      expect(extractSeq(2024123100999)).toBe(999);
      expect(extractSeq(2024011599999)).toBe(99999);
    });

    it('returns full value for legacy timestamps', () => {
      const legacyTimestamp = Date.now();
      expect(extractSeq(legacyTimestamp)).toBe(legacyTimestamp);
    });

    it('handles null/undefined', () => {
      expect(extractSeq(null)).toBe(0);
      expect(extractSeq(undefined)).toBe(0);
    });

    it('handles negative values (split children)', () => {
      expect(extractSeq(-1)).toBe(-1 % SEQ_MULTIPLIER);
      expect(extractSeq(-2)).toBe(-2 % SEQ_MULTIPLIER);
    });
  });

  describe('extractDateInt', () => {
    it('extracts date from new format sort_order', () => {
      expect(extractDateInt(2024011500001)).toBe(20240115);
      expect(extractDateInt(2024123100999)).toBe(20241231);
    });

    it('returns 0 for legacy timestamps', () => {
      const legacyTimestamp = Date.now();
      expect(extractDateInt(legacyTimestamp)).toBe(0);
    });

    it('handles null/undefined', () => {
      expect(extractDateInt(null)).toBe(0);
      expect(extractDateInt(undefined)).toBe(0);
    });
  });

  describe('isLegacyTimestamp', () => {
    it('identifies legacy timestamps', () => {
      expect(isLegacyTimestamp(Date.now())).toBe(true);
      expect(isLegacyTimestamp(1705000000000)).toBe(true); // ~2024
      expect(isLegacyTimestamp(123456789)).toBe(true); // test fixture value
    });

    it('identifies new format values', () => {
      expect(isLegacyTimestamp(2024011500001)).toBe(false);
      expect(isLegacyTimestamp(2024123199999)).toBe(false);
      // Note: very large sort_orders like 9999123199999 exceed MAX_SAFE_INTEGER
      // and can't be tested reliably. Practical dates stay well within safe range.
      expect(isLegacyTimestamp(2099123199999)).toBe(false);
    });

    it('handles negative values as new format', () => {
      expect(isLegacyTimestamp(-1)).toBe(false);
      expect(isLegacyTimestamp(-2)).toBe(false);
    });

    it('handles null/undefined', () => {
      expect(isLegacyTimestamp(null)).toBe(false);
      expect(isLegacyTimestamp(undefined)).toBe(false);
    });

    it('handles edge cases', () => {
      // Earliest valid date (year 2000)
      expect(isLegacyTimestamp(20000101 * SEQ_MULTIPLIER + 1)).toBe(false);
      // Latest valid date (year 2099)
      expect(isLegacyTimestamp(20991231 * SEQ_MULTIPLIER + MAX_SEQ)).toBe(
        false,
      );
      // Year 1000 is before our valid range (2000-2099), treated as legacy
      expect(isLegacyTimestamp(10000101 * SEQ_MULTIPLIER + 1)).toBe(true);
    });
  });

  describe('validateSeq', () => {
    it('accepts valid seq values', () => {
      expect(validateSeq(1, '2024-01-15')).toEqual({ isValid: true });
      expect(validateSeq(1000, '2024-01-15')).toEqual({ isValid: true });
      expect(validateSeq(MAX_SEQ, '2024-01-15')).toEqual({ isValid: true });
    });

    it('rejects non-integer seq', () => {
      const result = validateSeq(1.5, '2024-01-15');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('integer');
    });

    it('rejects seq less than 1', () => {
      expect(validateSeq(0, '2024-01-15').isValid).toBe(false);
      expect(validateSeq(-1, '2024-01-15').isValid).toBe(false);
    });

    it('rejects seq exceeding MAX_SEQ', () => {
      const result = validateSeq(MAX_SEQ + 1, '2024-01-15');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('limit reached');
    });
  });

  describe('getNextSeqForDate', () => {
    it('returns 1 for empty transactions', () => {
      const result = getNextSeqForDate('2024-01-15', []);
      expect(result.seq).toBe(1);
      expect(result.atLimit).toBe(false);
    });

    it('returns 1 when no transactions on that date', () => {
      const transactions = [
        { date: '2024-01-14', sort_order: 2024011400005 },
        { date: '2024-01-16', sort_order: 2024011600003 },
      ];
      const result = getNextSeqForDate('2024-01-15', transactions);
      expect(result.seq).toBe(1);
    });

    it('returns next seq after existing transactions', () => {
      const transactions = [
        { date: '2024-01-15', sort_order: 2024011500001 },
        { date: '2024-01-15', sort_order: 2024011500005 },
        { date: '2024-01-15', sort_order: 2024011500003 },
      ];
      const result = getNextSeqForDate('2024-01-15', transactions);
      expect(result.seq).toBe(6);
    });

    it('ignores legacy timestamps', () => {
      const transactions = [
        { date: '2024-01-15', sort_order: Date.now() },
        { date: '2024-01-15', sort_order: 123456789 },
      ];
      const result = getNextSeqForDate('2024-01-15', transactions);
      expect(result.seq).toBe(1);
    });

    it('handles null sort_order', () => {
      const transactions = [
        { date: '2024-01-15', sort_order: null },
        { date: '2024-01-15', sort_order: 2024011500003 },
      ];
      const result = getNextSeqForDate('2024-01-15', transactions);
      expect(result.seq).toBe(4);
    });

    it('indicates when at limit', () => {
      const transactions = [
        { date: '2024-01-15', sort_order: 2024011500000 + MAX_SEQ },
      ];
      const result = getNextSeqForDate('2024-01-15', transactions);
      expect(result.seq).toBe(MAX_SEQ);
      expect(result.atLimit).toBe(true);
    });
  });

  describe('assignBatchSeq', () => {
    it('assigns sequential seq values to transactions', () => {
      const transactions = [
        { date: '2024-01-15' },
        { date: '2024-01-15' },
        { date: '2024-01-15' },
      ];
      const result = assignBatchSeq(transactions);
      expect(result[0].sort_order).toBe(2024011500001);
      expect(result[1].sort_order).toBe(2024011500002);
      expect(result[2].sort_order).toBe(2024011500003);
    });

    it('handles multiple dates', () => {
      const transactions = [
        { date: '2024-01-15' },
        { date: '2024-01-16' },
        { date: '2024-01-15' },
      ];
      const result = assignBatchSeq(transactions);
      expect(result[0].sort_order).toBe(2024011500001);
      expect(result[1].sort_order).toBe(2024011600001);
      expect(result[2].sort_order).toBe(2024011500002);
    });

    it('considers existing transactions', () => {
      const newTransactions = [{ date: '2024-01-15' }, { date: '2024-01-15' }];
      const existingTransactions = [
        { date: '2024-01-15', sort_order: 2024011500005 },
      ];
      const result = assignBatchSeq(newTransactions, existingTransactions);
      expect(result[0].sort_order).toBe(2024011500006);
      expect(result[1].sort_order).toBe(2024011500007);
    });

    it('ignores legacy timestamps in existing transactions', () => {
      const newTransactions = [{ date: '2024-01-15' }];
      const existingTransactions = [
        { date: '2024-01-15', sort_order: Date.now() },
      ];
      const result = assignBatchSeq(newTransactions, existingTransactions);
      expect(result[0].sort_order).toBe(2024011500001);
    });

    it('marks transactions when at limit', () => {
      const transactions = [{ date: '2024-01-15' }, { date: '2024-01-15' }];
      const existingTransactions = [
        { date: '2024-01-15', sort_order: 2024011500000 + MAX_SEQ - 1 },
      ];
      const result = assignBatchSeq(transactions, existingTransactions);
      expect(result[0].sort_order).toBe(2024011500000 + MAX_SEQ);
      expect(result[0]._seqAtLimit).toBe(true);
      expect(result[1].sort_order).toBe(2024011500000 + MAX_SEQ);
      expect(result[1]._seqAtLimit).toBe(true);
    });

    it('preserves other transaction properties', () => {
      const transactions = [
        {
          date: '2024-01-15',
          amount: -5000,
          payee: 'test',
          sort_order: null as number | null,
        },
      ];
      const result = assignBatchSeq(transactions);
      expect(result[0].amount).toBe(-5000);
      expect(result[0].payee).toBe('test');
      expect(result[0].sort_order).toBe(2024011500001);
    });
  });

  describe('round-trip consistency', () => {
    it('extractSeq(generateSortOrder(date, seq)) === seq', () => {
      for (const seq of [1, 42, 999, 12345, MAX_SEQ]) {
        const sortOrder = generateSortOrder('2024-01-15', seq);
        expect(extractSeq(sortOrder)).toBe(seq);
      }
    });

    it('extractDateInt(generateSortOrder(date, seq)) === toDateRepr(date)', () => {
      const testDates = ['2024-01-15', '2000-01-01', '2099-12-31'];
      for (const date of testDates) {
        const sortOrder = generateSortOrder(date, 42);
        const expectedDateInt = parseInt(date.replace(/-/g, ''));
        expect(extractDateInt(sortOrder)).toBe(expectedDateInt);
      }
    });
  });

  describe('compatibility with existing sort behavior', () => {
    it('new format values sort correctly by date then seq', () => {
      const values = [
        generateSortOrder('2024-01-15', 5),
        generateSortOrder('2024-01-15', 1),
        generateSortOrder('2024-01-16', 1),
        generateSortOrder('2024-01-14', 100),
      ];

      const sorted = [...values].sort((a, b) => b - a); // desc

      expect(sorted).toEqual([
        generateSortOrder('2024-01-16', 1),
        generateSortOrder('2024-01-15', 5),
        generateSortOrder('2024-01-15', 1),
        generateSortOrder('2024-01-14', 100),
      ]);
    });

    it('legacy timestamps sort after new format (lower numeric value)', () => {
      // Legacy timestamps (Date.now() ~1.7 trillion) are smaller than new format
      // values (20240115 * 100000000 = ~2 quadrillion), so they sort "later" in desc order.
      // This means legacy transactions effectively appear at the end when sorted.
      const legacyTimestamp = Date.now();
      const newFormat = generateSortOrder('2024-01-15', 1);

      expect(legacyTimestamp < newFormat).toBe(true);
    });
  });
});
