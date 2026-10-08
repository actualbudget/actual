import { getScheduleOccurrenceMatchStartDate } from '#shared/schedules';
import type { ScheduleOccurrenceMatchInput } from '#shared/schedules';
import type { TransactionEntity } from '#types/models';

type Payment = Pick<
  TransactionEntity,
  'id' | 'date' | 'schedule' | 'parent_id' | 'transfer_id' | 'tombstone'
>;

function getLogicalPayments(transactions: Payment[], scheduleId: string) {
  const linked = transactions.filter(
    transaction =>
      transaction.schedule === scheduleId && !transaction.tombstone,
  );
  const parents = new Map<string, string>();

  function root(id: string): string {
    const parent = parents.get(id);
    if (parent == null || parent === id) {
      return id;
    }
    const result = root(parent);
    parents.set(id, result);
    return result;
  }

  // A split's parent/children and a transfer's two legs represent one payment.
  for (const transaction of linked) {
    for (const relatedId of [transaction.parent_id, transaction.transfer_id]) {
      if (relatedId) {
        const left = root(transaction.id);
        const right = root(relatedId);
        if (left !== right) {
          parents.set(left, right);
        }
      }
    }
  }

  const payments = new Map<string, string>();
  for (const transaction of linked) {
    const id = root(transaction.id);
    const date = payments.get(id);
    if (date == null || transaction.date < date) {
      payments.set(id, transaction.date);
    }
  }
  return [...payments.values()].sort();
}

/**
 * Forecast-only PoC assumption: preserve exact and recognized early matches,
 * then allocate remaining late linked payments to the oldest missed date.
 * A logical payment can satisfy only one occurrence, regardless of amount.
 */
export function matchForecastOccurrences({
  schedule,
  scheduleId,
  occurrenceDates,
  postedTransactions,
  today,
}: {
  schedule: ScheduleOccurrenceMatchInput;
  scheduleId: string;
  occurrenceDates: string[];
  postedTransactions: Payment[];
  today: string;
}): Set<string> {
  const dates = [...new Set(occurrenceDates)].sort();
  const payments = getLogicalPayments(postedTransactions, scheduleId);
  const matchedDates = new Set<string>();
  const usedPayments = new Set<number>();

  function matchDates(
    matches: (paymentDate: string, dueDate: string) => boolean,
  ) {
    for (const dueDate of dates) {
      if (matchedDates.has(dueDate)) {
        continue;
      }
      const paymentIndex = payments.findIndex(
        (paymentDate, index) =>
          !usedPayments.has(index) && matches(paymentDate, dueDate),
      );
      if (paymentIndex !== -1) {
        matchedDates.add(dueDate);
        usedPayments.add(paymentIndex);
      }
    }
  }

  // Reserve exact matches, including future occurrences, before considering
  // overlapping early windows or allocating a payment to an older occurrence.
  matchDates((paymentDate, dueDate) => paymentDate === dueDate);
  matchDates(
    (paymentDate, dueDate) =>
      paymentDate < dueDate &&
      paymentDate >= getScheduleOccurrenceMatchStartDate(schedule, dueDate),
  );
  matchDates(
    (paymentDate, dueDate) => dueDate < today && paymentDate > dueDate,
  );
  return matchedDates;
}
