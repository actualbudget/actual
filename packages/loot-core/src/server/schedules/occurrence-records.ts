import { isMatch } from 'date-fns';

import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { batchMessages } from '#server/sync';
import { addDays } from '#shared/months';
import { q } from '#shared/query';
import { getSchedulePayments } from '#shared/schedule-payments';
import { getOccurrencesBetween } from '#shared/schedules';
import type {
  ScheduleEntity,
  ScheduleOccurrence,
  TransactionEntity,
} from '#types/models';

export async function isOccurrenceTrackingEnabled() {
  const preference = await db.first<Pick<db.DbPreference, 'value'>>(
    'SELECT value FROM preferences WHERE id = ?',
    ['flags.balanceForecastReport'],
  );
  return preference?.value === 'true';
}

export async function getScheduleOccurrences(
  scheduleId?: string,
): Promise<ScheduleOccurrence[]> {
  const rows = await db.all<db.DbScheduleOccurrence>(
    `SELECT * FROM schedule_occurrences WHERE tombstone = 0${scheduleId ? ' AND schedule_id = ?' : ''} ORDER BY due_date, id`,
    scheduleId ? [scheduleId] : [],
  );
  return rows.flatMap<ScheduleOccurrence>(row => {
    if (!row.schedule_id || !row.due_date) {
      return [];
    }
    const occurrence = { scheduleId: row.schedule_id, dueDate: row.due_date };
    if (row.status === 'skipped') {
      return [{ ...occurrence, status: 'skipped' as const }];
    }
    if (row.status === 'paid' && row.transaction_id) {
      return [
        {
          ...occurrence,
          status: 'paid' as const,
          transactionId: row.transaction_id,
        },
      ];
    }
    return [];
  });
}

async function getLinkedTransactions(scheduleId: string) {
  const { data } = await aqlQuery(
    q('transactions')
      .filter({ schedule: scheduleId, tombstone: false })
      .options({ splits: 'all' })
      .select('*'),
  );
  return data as TransactionEntity[];
}

export async function recordScheduleOccurrence(occurrence: ScheduleOccurrence) {
  const id = `${occurrence.scheduleId}/${occurrence.dueDate}`;
  const payment =
    occurrence.status === 'paid'
      ? getSchedulePayments(
          await getLinkedTransactions(occurrence.scheduleId),
          occurrence.scheduleId,
        ).find(payment =>
          payment.transactionIds.includes(occurrence.transactionId),
        )
      : undefined;
  if (occurrence.status === 'paid' && !payment) {
    throw new Error('Choose a payment still linked to this schedule.');
  }
  const previous = payment
    ? await getScheduleOccurrences(occurrence.scheduleId)
    : [];
  await batchMessages(async () => {
    // Reassigning a payment must release its previous occurrence, including
    // mappings made through a different split row or transfer leg.
    for (const record of previous) {
      if (
        record.status === 'paid' &&
        record.dueDate !== occurrence.dueDate &&
        payment?.transactionIds.includes(record.transactionId)
      ) {
        await db.delete_(
          'schedule_occurrences',
          `${record.scheduleId}/${record.dueDate}`,
        );
      }
    }
    await db.update('schedule_occurrences', {
      id,
      schedule_id: occurrence.scheduleId,
      due_date: occurrence.dueDate,
      status: occurrence.status,
      transaction_id:
        occurrence.status === 'paid' ? occurrence.transactionId : null,
      tombstone: 0,
    } satisfies db.DbScheduleOccurrence);
  });
}

export async function getOccurrenceOptions({
  scheduleId,
}: {
  scheduleId: string;
}) {
  const transactions = await getLinkedTransactions(scheduleId);
  const records = await getScheduleOccurrences(scheduleId);
  const payments = getSchedulePayments(transactions, scheduleId)
    .reverse()
    .slice(0, 100)
    .map(payment => {
      const transaction =
        transactions.find(
          transaction =>
            payment.transactionIds.includes(transaction.id) &&
            !transaction.parent_id,
        ) ??
        transactions.find(transaction =>
          payment.transactionIds.includes(transaction.id),
        );
      return {
        transactionId: transaction?.id ?? payment.transactionIds[0],
        date: payment.date,
        amount: transaction?.amount ?? 0,
      };
    });
  return { records, payments };
}

export async function setOccurrence({
  scheduleId,
  dueDate,
  resolution,
}: {
  scheduleId: string;
  dueDate: string;
  resolution:
    | { status: 'skipped' }
    | { status: 'paid'; transactionId: string }
    | null;
}) {
  if (!(await isOccurrenceTrackingEnabled())) {
    throw new Error('Enable the Balance Forecast experiment first.');
  }
  const {
    data: [schedule],
  } = await aqlQuery(
    q('schedules').filter({ id: scheduleId, tombstone: false }).select('*'),
  );
  const dateCondition = (
    schedule as ScheduleEntity | undefined
  )?._conditions?.find(condition => condition.field === 'date');
  if (
    !isMatch(dueDate, 'yyyy-MM-dd') ||
    !dateCondition ||
    (resolution &&
      !getOccurrencesBetween(
        dateCondition,
        dueDate,
        addDays(dueDate, 1),
      ).includes(dueDate))
  ) {
    throw new Error('Choose an existing occurrence date for this schedule.');
  }
  if (resolution) {
    await recordScheduleOccurrence({ scheduleId, dueDate, ...resolution });
  } else {
    await db.delete_('schedule_occurrences', `${scheduleId}/${dueDate}`);
  }
}
