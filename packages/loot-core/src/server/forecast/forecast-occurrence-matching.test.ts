import { describe, expect, it } from 'vitest';

import { matchForecastOccurrences } from './forecast-occurrence-matching';

const defaults = {
  schedule: { posts_transaction: true },
  scheduleId: 'rent',
  occurrenceDates: ['2024-01-05', '2024-02-05', '2024-03-05'],
  today: '2024-03-10',
};

describe('forecast occurrence matching', () => {
  it('reserves exact matches before applying late payments oldest-first', () => {
    const matched = matchForecastOccurrences({
      ...defaults,
      postedTransactions: [
        { id: 'feb', date: '2024-02-05', schedule: 'rent' },
        { id: 'late', date: '2024-03-07', schedule: 'rent' },
      ],
    });
    expect([...matched].sort()).toEqual(['2024-01-05', '2024-02-05']);
  });

  it('uses a late payment only once even when several occurrences are overdue', () => {
    expect([
      ...matchForecastOccurrences({
        ...defaults,
        postedTransactions: [
          { id: 'late', date: '2024-03-07', schedule: 'rent' },
        ],
      }),
    ]).toEqual(['2024-01-05']);
  });

  it('preserves an early match for a future approximate schedule', () => {
    expect([
      ...matchForecastOccurrences({
        ...defaults,
        schedule: { posts_transaction: false },
        occurrenceDates: ['2024-02-11', '2024-03-11'],
        postedTransactions: [
          { id: 'early', date: '2024-03-09', schedule: 'rent' },
        ],
      }),
    ]).toEqual(['2024-03-11']);
  });

  it('prefers an exact date over an overlapping approximate window', () => {
    expect([
      ...matchForecastOccurrences({
        ...defaults,
        schedule: { posts_transaction: false },
        occurrenceDates: ['2024-03-08', '2024-03-09', '2024-03-10'],
        postedTransactions: [
          { id: 'daily', date: '2024-03-09', schedule: 'rent' },
        ],
      }),
    ]).toEqual(['2024-03-09']);
  });

  it('does not use a late payment to settle a future occurrence', () => {
    expect([
      ...matchForecastOccurrences({
        ...defaults,
        occurrenceDates: ['2024-03-15'],
        postedTransactions: [
          { id: 'future', date: '2024-03-16', schedule: 'rent' },
        ],
      }),
    ]).toEqual([]);
  });

  it('collapses transfer pairs and split rows into one logical payment', () => {
    expect([
      ...matchForecastOccurrences({
        ...defaults,
        postedTransactions: [
          { id: 'parent', date: '2024-03-07', schedule: 'rent' },
          {
            id: 'child',
            parent_id: 'parent',
            transfer_id: 'other',
            date: '2024-03-07',
            schedule: 'rent',
          },
          {
            id: 'other',
            transfer_id: 'child',
            date: '2024-03-07',
            schedule: 'rent',
          },
        ],
      }),
    ]).toEqual(['2024-01-05']);
  });

  it('ignores deleted, unlinked, and other-schedule transactions', () => {
    expect([
      ...matchForecastOccurrences({
        ...defaults,
        postedTransactions: [
          {
            id: 'deleted',
            date: '2024-01-05',
            schedule: 'rent',
            tombstone: true,
          },
          { id: 'unlinked', date: '2024-02-05' },
          { id: 'other', date: '2024-03-05', schedule: 'salary' },
        ],
      }),
    ]).toEqual([]);
  });
});
