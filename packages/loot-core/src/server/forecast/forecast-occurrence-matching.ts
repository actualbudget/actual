import { getSchedulePayments } from '#shared/schedule-payments';
import type { SchedulePaymentInput } from '#shared/schedule-payments';
import {
  getOccurrencesBetween,
  getScheduleOccurrenceMatchStartDate,
} from '#shared/schedules';
import type { ScheduleOccurrenceMatchInput } from '#shared/schedules';
import type { ScheduleOccurrence } from '#types/models';
import type { ForecastOccurrenceMatching } from '#types/models/forecast';

/**
 * Forecast-only PoC: honor recorded identities first when selected, then use
 * an explicitly inferred fallback: preserve exact and recognized early matches,
 * then allocate remaining late linked payments to the oldest missed date.
 * A logical payment can satisfy only one occurrence, regardless of amount.
 */
export function matchForecastOccurrences({
  schedule,
  scheduleId,
  occurrenceDates,
  postedTransactions,
  today,
  records = [],
  matching = 'recorded',
}: {
  schedule: ScheduleOccurrenceMatchInput;
  scheduleId: string;
  occurrenceDates: string[];
  postedTransactions: SchedulePaymentInput[];
  records?: ScheduleOccurrence[];
  matching?: ForecastOccurrenceMatching;
  today: string;
}): Set<string> {
  const dates = [...new Set(occurrenceDates)].sort();
  const firstDate = dates[0];
  const dateCondition = schedule._conditions?.find(
    condition => condition.field === 'date',
  );
  // A nearby earlier occurrence may already have consumed an early payment
  // before the cursor advanced. Reserve it before matching the forecast dates.
  const explicitRecords =
    matching === 'recorded'
      ? records.filter(record => record.scheduleId === scheduleId)
      : [];
  const skippedDates = new Set(
    explicitRecords
      .filter(record => record.status === 'skipped')
      .map(record => record.dueDate),
  );
  const previousDates =
    firstDate && dateCondition
      ? getOccurrencesBetween(
          dateCondition,
          getScheduleOccurrenceMatchStartDate(schedule, firstDate),
          firstDate,
        ).filter(date => !skippedDates.has(date))
      : [];
  const matchingDates = [...new Set([...previousDates, ...dates])].sort();
  const payments = getSchedulePayments(postedTransactions, scheduleId);
  const matchedDates = new Set<string>();
  const usedPayments = new Set<number>();

  // Explicitly skipped occurrences never consume a payment. Paid records
  // reserve their logical payment even when their due date is before the cursor.
  for (const record of explicitRecords) {
    if (record.status === 'skipped') {
      if (dates.includes(record.dueDate)) matchedDates.add(record.dueDate);
      continue;
    }
    const index = payments.findIndex(payment =>
      payment.transactionIds.includes(record.transactionId),
    );
    // Deleted/unlinked payments no longer establish fulfillment. Undo restores
    // their identity naturally because the record and transaction are synced.
    if (index !== -1 && !usedPayments.has(index)) {
      usedPayments.add(index);
      if (record.dueDate >= today || payments[index].date <= today) {
        matchedDates.add(record.dueDate);
      }
    }
  }

  function matchDates(
    matches: (paymentDate: string, dueDate: string) => boolean,
    candidates = dates,
  ) {
    for (const dueDate of candidates) {
      if (matchedDates.has(dueDate)) {
        continue;
      }
      const paymentIndex = payments.findIndex(
        (payment, index) =>
          !usedPayments.has(index) && matches(payment.date, dueDate),
      );
      if (paymentIndex !== -1) {
        matchedDates.add(dueDate);
        usedPayments.add(paymentIndex);
      }
    }
  }

  // Reserve exact matches, including future occurrences, before considering
  // overlapping early windows or allocating a payment to an older occurrence.
  matchDates((paymentDate, dueDate) => paymentDate === dueDate, matchingDates);
  matchDates(
    (paymentDate, dueDate) =>
      paymentDate < dueDate &&
      paymentDate >= getScheduleOccurrenceMatchStartDate(schedule, dueDate),
    matchingDates,
  );
  matchDates(
    (paymentDate, dueDate) =>
      dueDate < today && paymentDate > dueDate && paymentDate <= today,
  );
  for (const previousDate of previousDates) {
    matchedDates.delete(previousDate);
  }
  return new Set(dates.filter(date => matchedDates.has(date)));
}
