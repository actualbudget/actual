import { describe, expect, it } from 'vitest';

import type { RecurConfig } from '#types/models';

import { getScheduleDates } from './occurrences';

describe('getScheduleDates', () => {
  describe('single dates', () => {
    it('returns the date when it falls inside the window', () => {
      expect(
        getScheduleDates('2024-01-15', {
          start: '2024-01-01',
          end: '2024-01-31',
        }),
      ).toEqual(['2024-01-15']);
    });

    it('returns nothing when the date falls outside the window', () => {
      expect(
        getScheduleDates('2024-02-15', {
          start: '2024-01-01',
          end: '2024-01-31',
        }),
      ).toEqual([]);
      expect(getScheduleDates('2023-12-31', { start: '2024-01-01' })).toEqual(
        [],
      );
    });
  });

  describe('frequencies and intervals', () => {
    it('expands a daily recurrence with an interval', () => {
      expect(
        getScheduleDates(
          { frequency: 'daily', interval: 3, start: '2024-01-01' },
          { start: '2024-01-01', count: 4 },
        ),
      ).toEqual(['2024-01-01', '2024-01-04', '2024-01-07', '2024-01-10']);
    });

    it('expands a weekly recurrence with an interval', () => {
      expect(
        getScheduleDates(
          { frequency: 'weekly', interval: 2, start: '2024-01-01' },
          { start: '2024-01-01', end: '2024-02-01' },
        ),
      ).toEqual(['2024-01-01', '2024-01-15', '2024-01-29']);
    });

    it('expands a yearly recurrence', () => {
      expect(
        getScheduleDates(
          { frequency: 'yearly', start: '2024-03-15' },
          { start: '2024-01-01', count: 3 },
        ),
      ).toEqual(['2024-03-15', '2025-03-15', '2026-03-15']);
    });
  });

  describe('monthly patterns', () => {
    it('expands several days of the month in date order', () => {
      expect(
        getScheduleDates(
          {
            frequency: 'monthly',
            start: '2024-01-01',
            patterns: [
              { type: 'day', value: 15 },
              { type: 'day', value: 1 },
            ],
          },
          { start: '2024-01-01', end: '2024-02-29' },
        ),
      ).toEqual(['2024-01-01', '2024-01-15', '2024-02-01', '2024-02-15']);
    });

    it('expands the last day of the month, including leap years', () => {
      expect(
        getScheduleDates(
          {
            frequency: 'monthly',
            start: '2024-01-01',
            patterns: [{ type: 'day', value: -1 }],
          },
          { start: '2024-01-01', end: '2024-04-30' },
        ),
      ).toEqual(['2024-01-31', '2024-02-29', '2024-03-31', '2024-04-30']);
    });

    it('expands weekday patterns such as the last Friday and second Monday', () => {
      expect(
        getScheduleDates(
          {
            frequency: 'monthly',
            start: '2024-01-01',
            patterns: [
              { type: 'FR', value: -1 },
              { type: 'MO', value: 2 },
            ],
          },
          { start: '2024-01-01', end: '2024-02-29' },
        ),
      ).toEqual(['2024-01-08', '2024-01-26', '2024-02-12', '2024-02-23']);
    });
  });

  describe('windows and end modes', () => {
    it('starts at the window, not at the start of the recurrence', () => {
      expect(
        getScheduleDates(
          { frequency: 'daily', start: '2024-01-01' },
          { start: '2024-03-01', count: 2 },
        ),
      ).toEqual(['2024-03-01', '2024-03-02']);
    });

    it('never returns dates before the recurrence starts', () => {
      expect(
        getScheduleDates(
          { frequency: 'monthly', start: '2024-01-10' },
          { start: '2023-01-01', count: 1 },
        ),
      ).toEqual(['2024-01-10']);
    });

    it('stops after the configured number of occurrences', () => {
      expect(
        getScheduleDates(
          {
            frequency: 'monthly',
            start: '2024-01-10',
            endMode: 'after_n_occurrences',
            endOccurrences: 3,
          },
          { start: '2024-01-01' },
        ),
      ).toEqual(['2024-01-10', '2024-02-10', '2024-03-10']);
    });

    it('stops at the configured end date', () => {
      expect(
        getScheduleDates(
          {
            frequency: 'weekly',
            start: '2024-01-01',
            endMode: 'on_date',
            endDate: '2024-01-20',
          },
          { start: '2024-01-01' },
        ),
      ).toEqual(['2024-01-01', '2024-01-08', '2024-01-15']);
    });

    it('returns at most `count` dates', () => {
      expect(
        getScheduleDates(
          { frequency: 'daily', start: '2024-01-01' },
          { start: '2024-01-01', end: '2024-12-31', count: 2 },
        ),
      ).toEqual(['2024-01-01', '2024-01-02']);
    });

    it('returns nothing for a count of zero', () => {
      expect(
        getScheduleDates(
          { frequency: 'daily', start: '2024-01-01' },
          { start: '2024-01-01', count: 0 },
        ),
      ).toEqual([]);
      expect(
        getScheduleDates('2024-01-01', { start: '2024-01-01', count: 0 }),
      ).toEqual([]);
    });
  });

  describe('weekend handling', () => {
    // 2024-06-01, 2024-09-01 and 2024-12-01 fall on a weekend.
    const firstOfMonth = {
      frequency: 'monthly',
      start: '2024-06-01',
      skipWeekend: true,
    } satisfies RecurConfig;

    it('moves weekend dates to the following Monday', () => {
      expect(
        getScheduleDates(
          { ...firstOfMonth, weekendSolveMode: 'after' },
          { start: '2024-06-01', end: '2024-12-31' },
        ),
      ).toEqual([
        '2024-06-03',
        '2024-07-01',
        '2024-08-01',
        '2024-09-02',
        '2024-10-01',
        '2024-11-01',
        '2024-12-02',
      ]);
    });

    it('moves weekend dates to the previous Friday', () => {
      expect(
        getScheduleDates(
          { ...firstOfMonth, weekendSolveMode: 'before' },
          { start: '2024-05-01', end: '2024-12-31' },
        ),
      ).toEqual([
        '2024-05-31',
        '2024-07-01',
        '2024-08-01',
        '2024-08-30',
        '2024-10-01',
        '2024-11-01',
        '2024-11-29',
      ]);
    });

    it('applies the window to the moved date, not the original one', () => {
      const before = { ...firstOfMonth, weekendSolveMode: 'before' } as const;
      // Saturday 1 June moves back to Friday 31 May.
      expect(
        getScheduleDates(before, { start: '2024-05-01', end: '2024-05-31' }),
      ).toEqual(['2024-05-31']);
      expect(
        getScheduleDates(before, { start: '2024-06-01', end: '2024-06-30' }),
      ).toEqual([]);

      // Sunday 30 June moves forward to Monday 1 July.
      const after = {
        frequency: 'monthly',
        start: '2024-06-30',
        skipWeekend: true,
        weekendSolveMode: 'after',
      } satisfies RecurConfig;
      expect(
        getScheduleDates(after, { start: '2024-06-01', end: '2024-06-30' }),
      ).toEqual([]);
      expect(
        getScheduleDates(after, { start: '2024-07-01', end: '2024-07-01' }),
      ).toEqual(['2024-07-01']);
    });

    it('keeps weekend dates when skipWeekend is off', () => {
      expect(
        getScheduleDates(
          { ...firstOfMonth, skipWeekend: false },
          { start: '2024-06-01', count: 1 },
        ),
      ).toEqual(['2024-06-01']);
    });
  });

  describe('invalid requests', () => {
    it('rejects an open-ended recurrence without an end or a count', () => {
      expect(() =>
        getScheduleDates(
          { frequency: 'daily', start: '2024-01-01' },
          { start: '2024-01-01' },
        ),
      ).toThrow('needs an `end` date or a `count`');
      expect(() =>
        getScheduleDates(
          { frequency: 'daily', start: '2024-01-01', endMode: 'never' },
          { start: '2024-01-01' },
        ),
      ).toThrow('needs an `end` date or a `count`');
    });

    it('rejects skipWeekend without a weekendSolveMode', () => {
      expect(() =>
        getScheduleDates(
          { frequency: 'daily', start: '2024-01-01', skipWeekend: true },
          { start: '2024-01-01', count: 1 },
        ),
      ).toThrow('`weekendSolveMode` is required');
    });
  });
});
