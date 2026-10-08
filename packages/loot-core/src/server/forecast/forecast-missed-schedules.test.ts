import MockDate from 'mockdate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import {
  createSchedule,
  skipNextDate,
  updateSchedule,
} from '#server/schedules/app';
import { loadRules } from '#server/transactions/transaction-rules';
import type { RuleConditionEntity } from '#types/models';
import type {
  ForecastMissedOccurrences,
  ForecastMissedSchedules,
} from '#types/models/forecast';

import { generateForecast } from './app';

const { emptyDatabase } = global as typeof globalThis & {
  emptyDatabase: () => () => Promise<void>;
};

async function overdueSchedule(
  amount: number,
  account = 'checking',
  payee?: string,
  recurring = true,
) {
  const conditions: RuleConditionEntity[] = [
    { op: 'is', field: 'account', value: account },
    { op: 'is', field: 'amount', value: amount },
    {
      op: 'is',
      field: 'date',
      value: recurring
        ? { start: '2024-01-05', frequency: 'monthly' }
        : '2024-01-05',
    },
  ];
  if (payee) {
    conditions.push({ op: 'is', field: 'payee', value: payee });
  }
  const id = await createSchedule({ conditions });
  const cursor = await db.first<Pick<db.DbScheduleNextDate, 'id'>>(
    'SELECT id FROM schedules_next_date WHERE schedule_id = ?',
    [id],
  );
  if (!cursor) {
    throw new Error('Missing schedule cursor');
  }
  // Model a schedule that has not advanced since January without moving the
  // CRDT clock backwards while constructing the fixture.
  await db.update('schedules_next_date', {
    id: cursor.id,
    base_next_date: 20240105,
    local_next_date: 20240105,
  });
  return id;
}

const range = { startDate: '2024-03-01', endDate: '2024-03-31' };

beforeEach(async () => {
  await emptyDatabase()();
  await loadMappings();
  await loadRules();
  MockDate.set(new Date(2024, 2, 10, 12));
  await db.insertAccount({ id: 'checking', name: 'Checking' });
  await db.insertTransaction({
    id: 'opening',
    account: 'checking',
    amount: 100_000,
    cleared: false,
    date: '2023-12-31',
  });
});

afterEach(() => MockDate.reset());

describe('missed schedule forecast policies', () => {
  const policies: Array<
    [ForecastMissedSchedules, ForecastMissedOccurrences, number, number]
  > = [
    ['exclude', 'one', 100_000, 0],
    ['exclude', 'all', 100_000, 0],
    ['payments', 'one', 70_000, 1],
    ['payments', 'all', 10_000, 3],
    ['all', 'one', 120_000, 2],
    ['all', 'all', 160_000, 6],
  ];

  it.each(policies)(
    '%s / %s projects %i with %i missed occurrences',
    async (missedSchedules, missedOccurrences, balance, count) => {
      await overdueSchedule(-30_000);
      await overdueSchedule(50_000);
      const result = await generateForecast({
        ...range,
        missedSchedules,
        missedOccurrences,
      });
      expect(
        result.dataPoints.find(point => point.date === '2024-03-09')?.balance,
      ).toBe(100_000);
      const today = result.dataPoints.find(
        point => point.date === '2024-03-10',
      );
      expect(today?.balance).toBe(balance);
      expect(today?.transactions).toHaveLength(count);
      expect(
        today?.transactions.every(
          transaction => transaction.isMissed && transaction.originalDueDate,
        ),
      ).toBe(true);
      expect(result.dataPoints.at(-1)?.balance).toBe(balance);
    },
  );

  it('preserves default behavior, future occurrences, and entirely historical views', async () => {
    await overdueSchedule(-30_000);
    const request = { startDate: '2024-01-01', endDate: '2024-02-29' };
    expect(
      await generateForecast({
        ...request,
        missedSchedules: 'all',
        missedOccurrences: 'all',
      }),
    ).toEqual(await generateForecast(request));
    expect(
      await generateForecast({ ...range, missedSchedules: 'exclude' }),
    ).toEqual(await generateForecast(range));
    const result = await generateForecast({
      ...range,
      endDate: '2024-04-30',
      missedSchedules: 'payments',
    });
    expect(
      result.dataPoints.find(point => point.date === '2024-04-05')
        ?.transactions,
    ).toMatchObject([{ originalDueDate: '2024-04-05' }]);
    expect(result.dataPoints.at(-1)?.balance).toBe(40_000);
  });

  it('carries missed amounts into a future-only range without treating upcoming dates as missed', async () => {
    await overdueSchedule(-30_000);
    const result = await generateForecast({
      startDate: '2024-04-10',
      endDate: '2024-04-30',
      missedSchedules: 'payments',
      missedOccurrences: 'all',
    });
    expect(result.dataPoints[0].balance).toBe(10_000);
    expect(
      result.dataPoints[0].transactions.map(
        transaction => transaction.originalDueDate,
      ),
    ).toEqual(['2024-01-05', '2024-02-05', '2024-03-05']);
  });

  it('recognizes a late linked payment even when report filters exclude it', async () => {
    const schedule = await overdueSchedule(-30_000);
    await db.insertTransaction({
      id: 'late',
      account: 'checking',
      amount: -30_000,
      date: '2024-03-07',
      cleared: true,
      schedule,
    });
    const result = await generateForecast({
      ...range,
      missedSchedules: 'payments',
      missedOccurrences: 'all',
      conditions: [{ field: 'cleared', op: 'is', value: false }],
    });
    const today = result.dataPoints.find(point => point.date === '2024-03-10');
    expect(today?.balance).toBe(40_000);
    expect(
      today?.transactions.map(transaction => transaction.originalDueDate),
    ).toEqual(['2024-02-05', '2024-03-05']);
  });

  it('uses the assumed settlement date for report date filters', async () => {
    await overdueSchedule(-30_000);
    const result = await generateForecast({
      ...range,
      missedSchedules: 'payments',
      missedOccurrences: 'all',
      conditions: [{ field: 'date', op: 'is', value: '2024-03-10' }],
    });
    expect(
      result.dataPoints.find(point => point.date === '2024-03-10')?.balance,
    ).toBe(-90_000);
  });

  it('includes a one-off only once and respects skipped and completed schedules', async () => {
    await overdueSchedule(-10_000, 'checking', undefined, false);
    const recurring = await overdueSchedule(-30_000);
    await skipNextDate({ id: recurring });
    const completed = await overdueSchedule(-70_000);
    await updateSchedule({ schedule: { id: completed, completed: true } });
    const result = await generateForecast({
      ...range,
      missedSchedules: 'payments',
      missedOccurrences: 'all',
    });
    const today = result.dataPoints.find(point => point.date === '2024-03-10');
    expect(today?.balance).toBe(30_000);
    expect(today?.transactions).toHaveLength(3);
    expect(
      today?.transactions
        .filter(transaction => transaction.scheduleId === recurring)
        .map(transaction => transaction.originalDueDate),
    ).toEqual(['2024-02-05', '2024-03-05']);
  });

  it.each([false, true])(
    'preserves transfer pairs when entered on the receiving account: %s',
    async receiving => {
      await db.insertAccount({ id: 'savings', name: 'Savings' });
      await db.insertPayee({
        id: 'to-savings',
        name: 'To savings',
        transfer_acct: 'savings',
      });
      await db.insertPayee({
        id: 'to-checking',
        name: 'To checking',
        transfer_acct: 'checking',
      });
      const schedule = await overdueSchedule(
        receiving ? 20_000 : -20_000,
        receiving ? 'savings' : 'checking',
        receiving ? 'to-checking' : 'to-savings',
      );
      for (const accountIds of [
        ['checking'],
        ['savings'],
        ['checking', 'savings'],
      ]) {
        const result = await generateForecast({
          ...range,
          accountIds,
          missedSchedules: 'payments',
          missedOccurrences: 'all',
        });
        const today = result.dataPoints.filter(
          point => point.date === '2024-03-10',
        );
        for (const point of today) {
          expect(point.balance).toBe(
            point.accountId === 'checking' ? 40_000 : 60_000,
          );
          expect(point.transactions).toHaveLength(3);
        }
        expect(
          new Set(
            today.flatMap(point =>
              point.transactions.map(transaction => transaction.occurrenceId),
            ),
          ).size,
        ).toBe(3);
      }
      await db.insertTransaction({
        id: 'paid-source',
        account: 'checking',
        amount: -20_000,
        date: '2024-03-07',
        schedule,
      });
      const destination = await generateForecast({
        ...range,
        accountIds: ['savings'],
        missedSchedules: 'payments',
        missedOccurrences: 'all',
      });
      expect(
        destination.dataPoints.find(point => point.date === '2024-03-10')
          ?.transactions,
      ).toHaveLength(2);
    },
  );
});
