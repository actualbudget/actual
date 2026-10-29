import MockDate from 'mockdate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { loadRules } from '#server/transactions/transaction-rules';
import { clearUndo, redo, undo } from '#server/undo';
import { currentDay } from '#shared/months';

import { app, createSchedule } from './app';
import {
  getScheduleOccurrences,
  recordScheduleOccurrence,
  setOccurrence,
} from './occurrence-records';

const { emptyDatabase } = global as typeof globalThis & {
  emptyDatabase: () => () => Promise<void>;
};

async function createDailySchedule() {
  const id = await createSchedule({
    conditions: [
      { op: 'is', field: 'account', value: 'checking' },
      { op: 'is', field: 'amount', value: -30_000 },
      {
        op: 'isapprox',
        field: 'date',
        value: { frequency: 'daily', start: '2024-03-09' },
      },
    ],
  });
  const cursor = await db.first<db.DbScheduleNextDate>(
    'SELECT * FROM schedules_next_date WHERE schedule_id = ?',
    [id],
  );
  if (!cursor) throw new Error('Missing cursor');
  await db.update('schedules_next_date', {
    id: cursor.id,
    base_next_date: 20240309,
    local_next_date: 20240309,
  });
  return id;
}

beforeEach(async () => {
  await emptyDatabase()();
  await loadMappings();
  await loadRules();
  app.startServices();
  clearUndo();
  MockDate.set(new Date(2024, 2, 10, 12));
  await db.insertAccount({ id: 'checking', name: 'Checking' });
  await db.update('preferences', {
    id: 'flags.balanceForecastReport',
    value: 'true',
  });
});
afterEach(async () => {
  await app.stopServices();
  MockDate.reset();
});

describe('experimental schedule occurrence records', () => {
  it('records skipped identity with the cursor and undoes and redoes both together', async () => {
    const id = await createDailySchedule();
    await app.handlers['schedule/skip-next-date']({ id });
    expect(await getScheduleOccurrences(id)).toEqual([
      { scheduleId: id, dueDate: '2024-03-09', status: 'skipped' },
    ]);
    await undo();
    expect(await getScheduleOccurrences(id)).toEqual([]);
    expect(
      (
        await db.first<db.DbScheduleNextDate>(
          'SELECT * FROM schedules_next_date WHERE schedule_id = ?',
          [id],
        )
      )?.local_next_date,
    ).toBe(20240309);
    await redo();
    expect(await getScheduleOccurrences(id)).toHaveLength(1);
    expect(
      (
        await db.first<db.DbScheduleNextDate>(
          'SELECT * FROM schedules_next_date WHERE schedule_id = ?',
          [id],
        )
      )?.local_next_date,
    ).toBe(20240310);
  });

  it('records the due occurrence when posting today and undoes the payment with it', async () => {
    const id = await createDailySchedule();
    await app.handlers['schedule/post-transaction']({ id, today: true });
    const [record] = await getScheduleOccurrences(id);
    expect(record).toMatchObject({ dueDate: '2024-03-09', status: 'paid' });
    if (record?.status !== 'paid') throw new Error('Missing paid occurrence');
    expect(await db.getTransaction(record.transactionId)).toMatchObject({
      date: currentDay(),
      schedule: id,
    });
    await undo();
    expect(await getScheduleOccurrences(id)).toEqual([]);
    expect(await db.getTransaction(record.transactionId)).toBeUndefined();
  });

  it('leaves recording disabled outside the Balance Forecast experiment', async () => {
    await db.update('preferences', {
      id: 'flags.balanceForecastReport',
      value: 'false',
    });
    const id = await createDailySchedule();
    await app.handlers['schedule/skip-next-date']({ id });
    await app.handlers['schedule/post-transaction']({ id });
    expect(await getScheduleOccurrences(id)).toEqual([]);
    await expect(
      setOccurrence({
        scheduleId: id,
        dueDate: '2024-03-10',
        resolution: { status: 'skipped' },
      }),
    ).rejects.toThrow('Enable');
  });

  it('reassigns a linked payment and supports clearing and undoing the resolution', async () => {
    const scheduleId = await createDailySchedule();
    await db.insertTransaction({
      id: 'payment',
      account: 'checking',
      amount: -30_000,
      date: '2024-03-09',
      schedule: scheduleId,
    });
    await recordScheduleOccurrence({
      scheduleId,
      dueDate: '2024-03-09',
      status: 'paid',
      transactionId: 'payment',
    });
    await app.handlers['schedule/set-occurrence']({
      scheduleId,
      dueDate: '2024-03-10',
      resolution: { status: 'paid', transactionId: 'payment' },
    });
    expect(await getScheduleOccurrences(scheduleId)).toEqual([
      {
        scheduleId,
        dueDate: '2024-03-10',
        status: 'paid',
        transactionId: 'payment',
      },
    ]);
    await undo();
    expect(await getScheduleOccurrences(scheduleId)).toEqual([
      {
        scheduleId,
        dueDate: '2024-03-09',
        status: 'paid',
        transactionId: 'payment',
      },
    ]);
    await app.handlers['schedule/set-occurrence']({
      scheduleId,
      dueDate: '2024-03-09',
      resolution: null,
    });
    expect(await getScheduleOccurrences(scheduleId)).toEqual([]);
  });

  it('rejects an invalid occurrence date or an unlinked or deleted payment', async () => {
    const scheduleId = await createDailySchedule();
    await expect(
      setOccurrence({
        scheduleId,
        dueDate: '2024-02-30',
        resolution: { status: 'skipped' },
      }),
    ).rejects.toThrow('occurrence date');
    await expect(
      setOccurrence({
        scheduleId,
        dueDate: '2024-03-08',
        resolution: { status: 'skipped' },
      }),
    ).rejects.toThrow('occurrence date');
    await db.insertTransaction({
      id: 'unlinked',
      account: 'checking',
      amount: -30_000,
      date: '2024-03-09',
    });
    await expect(
      setOccurrence({
        scheduleId,
        dueDate: '2024-03-10',
        resolution: { status: 'paid', transactionId: 'unlinked' },
      }),
    ).rejects.toThrow('still linked');
    await db.updateTransaction({
      id: 'unlinked',
      schedule: scheduleId,
      tombstone: true,
    });
    await expect(
      setOccurrence({
        scheduleId,
        dueDate: '2024-03-10',
        resolution: { status: 'paid', transactionId: 'unlinked' },
      }),
    ).rejects.toThrow('still linked');
    expect(await getScheduleOccurrences(scheduleId)).toEqual([]);
  });
});
