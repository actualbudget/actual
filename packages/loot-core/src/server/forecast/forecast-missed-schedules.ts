import { getScheduleOccurrenceMatchStartDate } from '#shared/schedules';
import type { PostedScheduleTransaction } from '#shared/schedules';
import type {
  ForecastMissedOccurrences,
  ForecastMissedSchedules,
} from '#types/models/forecast';

import type {
  ForecastScheduleOccurrence,
  ScheduleData,
} from './forecast-schedules';

/**
 * Mirrors the schedule's own "missed" status: its next date is before today
 * and no linked transaction falls on or after that occurrence's match window.
 * Once a payment is linked, schedules move their next date forward from
 * today, so their earlier occurrences can no longer be told apart.
 */
export function getMissedScheduleIds(
  schedules: ScheduleData[],
  postedTransactions: PostedScheduleTransaction[],
  today: string,
): Set<string> {
  const latestPostedDateByScheduleId = new Map<string, string>();
  for (const transaction of postedTransactions) {
    if (!transaction.schedule) {
      continue;
    }
    const latest = latestPostedDateByScheduleId.get(transaction.schedule);
    if (latest == null || transaction.date > latest) {
      latestPostedDateByScheduleId.set(transaction.schedule, transaction.date);
    }
  }

  return new Set(
    schedules
      .filter(schedule => {
        if (schedule.next_date >= today) {
          return false;
        }
        const latestPostedDate = latestPostedDateByScheduleId.get(schedule.id);
        return (
          latestPostedDate == null ||
          latestPostedDate <
            getScheduleOccurrenceMatchStartDate(schedule, schedule.next_date)
        );
      })
      .map(schedule => schedule.id),
  );
}

function isIncome(group: ForecastScheduleOccurrence[]) {
  // Transfers move money between accounts; only external deposits are income.
  return (
    group.every(occurrence => occurrence.transaction.transfer_id == null) &&
    group[0].amount > 0
  );
}

/**
 * Report-only assumption: selected overdue occurrences settle today. Anything
 * not selected is returned unchanged, so excluding them matches the forecast
 * without this option.
 */
export function settleMissedScheduleOccurrences({
  occurrences,
  missedScheduleIds,
  missedSchedules,
  missedOccurrences,
  today,
}: {
  occurrences: ForecastScheduleOccurrence[];
  missedScheduleIds: Set<string>;
  missedSchedules: ForecastMissedSchedules;
  missedOccurrences: ForecastMissedOccurrences;
  today: string;
}): ForecastScheduleOccurrence[] {
  if (missedSchedules === 'exclude' || missedScheduleIds.size === 0) {
    return occurrences;
  }

  // Both legs of a transfer share their schedule and original date.
  const groups = new Map<string, ForecastScheduleOccurrence[]>();
  for (const occurrence of occurrences) {
    if (
      occurrence.occurrenceDate >= today ||
      !missedScheduleIds.has(occurrence.scheduleId)
    ) {
      continue;
    }
    const key = `${occurrence.scheduleId}:${occurrence.occurrenceDate}`;
    const group = groups.get(key);
    if (group) {
      group.push(occurrence);
    } else {
      groups.set(key, [occurrence]);
    }
  }

  const selectedKeys = new Set<string>();
  const settledScheduleIds = new Set<string>();
  const orderedGroups = [...groups.entries()].sort(([, left], [, right]) =>
    left[0].occurrenceDate.localeCompare(right[0].occurrenceDate),
  );
  for (const [key, group] of orderedGroups) {
    const { scheduleId } = group[0];
    if (missedSchedules === 'payments' && isIncome(group)) {
      continue;
    }
    if (missedOccurrences === 'one' && settledScheduleIds.has(scheduleId)) {
      continue;
    }
    settledScheduleIds.add(scheduleId);
    selectedKeys.add(key);
  }

  return occurrences.map(occurrence => {
    if (
      !selectedKeys.has(`${occurrence.scheduleId}:${occurrence.occurrenceDate}`)
    ) {
      return occurrence;
    }
    // Apply the settlement date to both legs, even if a rule moved one of them.
    return {
      ...occurrence,
      isMissed: true,
      transaction: { ...occurrence.transaction, date: today },
      filterObject: { ...occurrence.filterObject, date: today },
    };
  });
}
