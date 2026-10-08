import type {
  ForecastMissedOccurrences,
  ForecastMissedSchedules,
} from '#types/models/forecast';

import type { ForecastScheduleOccurrence } from './forecast-schedules';

/** Select assumptions only after matching payments and applying schedule rules. */
export function selectMissedScheduleOccurrences({
  occurrences,
  missedSchedules,
  missedOccurrences,
  today,
}: {
  occurrences: ForecastScheduleOccurrence[];
  missedSchedules: ForecastMissedSchedules;
  missedOccurrences: ForecastMissedOccurrences;
  today: string;
}): ForecastScheduleOccurrence[] {
  if (missedSchedules === 'exclude') {
    return occurrences;
  }

  const groups = new Map<string, ForecastScheduleOccurrence[]>();
  for (const occurrence of occurrences) {
    const group = groups.get(occurrence.occurrenceId) ?? [];
    group.push(occurrence);
    groups.set(occurrence.occurrenceId, group);
  }

  const selectedSchedules = new Set<string>();
  const selected: ForecastScheduleOccurrence[] = [];
  const ordered = [...groups.values()].sort((left, right) =>
    left[0].originalDueDate.localeCompare(right[0].originalDueDate),
  );

  for (const group of ordered) {
    const occurrence = group[0];
    if (occurrence.originalDueDate >= today) {
      selected.push(...group);
      continue;
    }
    const isTransfer = group.some(
      item =>
        item.transaction.transfer_id != null ||
        item.filterObject.payee?.transfer_acct != null,
    );
    if (
      missedSchedules === 'payments' &&
      !isTransfer &&
      occurrence.amount >= 0
    ) {
      continue;
    }
    if (
      missedOccurrences === 'one' &&
      selectedSchedules.has(occurrence.scheduleId)
    ) {
      continue;
    }
    selectedSchedules.add(occurrence.scheduleId);
    for (const item of group) {
      selected.push({
        ...item,
        isMissed: true,
        transaction: { ...item.transaction, date: today },
        filterObject: { ...item.filterObject, date: today },
      });
    }
  }
  return selected;
}
