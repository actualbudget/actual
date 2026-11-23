import { growForecastIncome } from '#shared/forecast-assumptions';
import type { ForecastAssumptions } from '#types/models/forecast';

import type {
  ForecastScheduleOccurrence,
  ScheduleData,
} from './forecast-schedules';

export function applyForecastIncomeGrowth(
  occurrences: ForecastScheduleOccurrence[],
  schedules: ScheduleData[],
  assumptions: ForecastAssumptions,
) {
  const selectedIds = new Set(assumptions.incomeScheduleIds);
  const recurringIncomeIds = new Set(
    schedules
      .filter(
        schedule =>
          selectedIds.has(schedule.id) &&
          typeof schedule._date !== 'string' &&
          schedule._amount > 0,
      )
      .map(schedule => schedule.id),
  );

  return occurrences.map(occurrence => {
    if (
      !recurringIncomeIds.has(occurrence.scheduleId) ||
      occurrence.amount <= 0 ||
      occurrence.transaction.transfer_id != null ||
      occurrence.filterObject.payee?.transfer_acct != null
    ) {
      return occurrence;
    }

    // Keep the original filter object: assumptions change the amounts of
    // matching occurrences, not which transactions belong to the report.
    return {
      ...occurrence,
      amount: growForecastIncome(
        occurrence.amount,
        occurrence.transaction.date,
        assumptions,
      ),
    };
  });
}
