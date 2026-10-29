import { describe, expect, it } from 'vitest';

import { matchForecastOccurrences } from './forecast-occurrence-matching';

const defaults = {
  schedule: { posts_transaction: true },
  scheduleId: 'rent',
  occurrenceDates: ['2024-01-05', '2024-02-05', '2024-03-05'],
  today: '2024-03-10',
};

describe('forecast occurrence matching', () => {
  it('does not consider a future-dated recorded payment settled today', () => {
    expect([
      ...matchForecastOccurrences({
        ...defaults,
        postedTransactions: [
          { id: 'future', date: '2024-03-12', schedule: 'rent' },
        ],
        records: [
          {
            scheduleId: 'rent',
            dueDate: '2024-01-05',
            status: 'paid',
            transactionId: 'future',
          },
        ],
      }),
    ]).toEqual([]);
  });
  it('does not reserve a skipped date before matching an early payment', () => {
    const params = {
      ...defaults,
      schedule: {
        posts_transaction: false,
        _conditions: [
          {
            op: 'isapprox' as const,
            field: 'date' as const,
            value: { frequency: 'daily' as const, start: '2024-03-09' },
          },
        ],
      },
      occurrenceDates: ['2024-03-10'],
      postedTransactions: [
        { id: 'early', date: '2024-03-09', schedule: 'rent' },
      ],
      records: [
        {
          scheduleId: 'rent',
          dueDate: '2024-03-09',
          status: 'skipped' as const,
        },
      ],
    };
    expect([...matchForecastOccurrences(params)]).toEqual(['2024-03-10']);
    // The comparison mode deliberately retains the old date-only assumption.
    expect([
      ...matchForecastOccurrences({ ...params, matching: 'inferred' }),
    ]).toEqual([]);
  });

  it('reserves a recorded early payment for its actual occurrence before the cursor', () => {
    expect([
      ...matchForecastOccurrences({
        ...defaults,
        occurrenceDates: ['2024-03-10'],
        postedTransactions: [
          { id: 'early', date: '2024-03-09', schedule: 'rent' },
        ],
        records: [
          {
            scheduleId: 'rent',
            dueDate: '2024-03-09',
            status: 'paid',
            transactionId: 'early',
          },
        ],
      }),
    ]).toEqual([]);
  });

  it('lets recorded identity override an exact date and consumes a logical payment only once', () => {
    expect([
      ...matchForecastOccurrences({
        ...defaults,
        postedTransactions: [
          {
            id: 'source',
            date: '2024-01-05',
            schedule: 'rent',
            transfer_id: 'transfer',
          },
          {
            id: 'transfer',
            date: '2024-01-05',
            schedule: 'rent',
            transfer_id: 'source',
          },
        ],
        records: [
          {
            scheduleId: 'rent',
            dueDate: '2024-02-05',
            status: 'paid',
            transactionId: 'transfer',
          },
        ],
      }),
    ]).toEqual(['2024-02-05']);
  });

  it('reopens a recorded paid occurrence if its transaction was deleted or unlinked', () => {
    for (const payment of [
      { id: 'payment', date: '2024-01-05', schedule: 'rent', tombstone: true },
      { id: 'payment', date: '2024-01-05', schedule: undefined },
    ]) {
      expect([
        ...matchForecastOccurrences({
          ...defaults,
          postedTransactions: [payment],
          records: [
            {
              scheduleId: 'rent',
              dueDate: '2024-01-05',
              status: 'paid',
              transactionId: 'payment',
            },
          ],
        }),
      ]).toEqual([]);
    }
  });

  it('excludes skipped occurrences without consuming another occurrence payment', () => {
    expect([
      ...matchForecastOccurrences({
        ...defaults,
        postedTransactions: [
          { id: 'late', date: '2024-03-07', schedule: 'rent' },
        ],
        records: [
          { scheduleId: 'rent', dueDate: '2024-01-05', status: 'skipped' },
        ],
      }),
    ]).toEqual(['2024-01-05', '2024-02-05']);
  });

  it('does not reuse an early payment consumed before the schedule cursor advanced', () => {
    expect([
      ...matchForecastOccurrences({
        ...defaults,
        schedule: {
          posts_transaction: false,
          _conditions: [
            {
              op: 'isapprox',
              field: 'date',
              value: { frequency: 'daily', start: '2024-01-02' },
            },
          ],
        },
        occurrenceDates: ['2024-01-03', '2024-01-04'],
        today: '2024-01-03',
        postedTransactions: [
          { id: 'early', date: '2024-01-01', schedule: 'rent' },
        ],
      }),
    ]).toEqual([]);
  });

  it('keeps future exact matches without using future payments for overdue occurrences', () => {
    expect([
      ...matchForecastOccurrences({
        ...defaults,
        occurrenceDates: ['2024-01-05', '2024-03-15'],
        postedTransactions: [
          { id: 'future-exact', date: '2024-03-15', schedule: 'rent' },
          { id: 'future-late', date: '2024-03-12', schedule: 'rent' },
        ],
      }),
    ]).toEqual(['2024-03-15']);
  });

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
