import * as d from 'date-fns';

import * as monthUtils from 'loot-core/shared/months';
import {
  extractScheduleConds,
  getNextDate,
  getScheduledAmount,
  scheduleIsRecurring,
} from 'loot-core/shared/schedules';
import type { ScheduleEntity } from 'loot-core/types/models';

export type ForecastOccurrence = {
  scheduleId: string;
  scheduleName: string;
  payeeName: string;
  accountId: string;
  amount: number;
  date: string;
};

export type ForecastMonth = {
  month: string; // 'YYYY-MM'
  projectedIncome: number;
  projectedExpenses: number; // positive absolute value
  netDelta: number; // projectedIncome - projectedExpenses
  runningBalance: number; // cumulative from starting balance
  scheduleOccurrences: ForecastOccurrence[];
};

export function buildForecast(
  schedules: readonly ScheduleEntity[],
  monthCount: number,
  startingBalance: number,
): ForecastMonth[] {
  const currentMonth = monthUtils.currentMonth(); // 'YYYY-MM'
  const today = monthUtils.currentDay(); // 'YYYY-MM-DD'

  // Build ordered array of YYYY-MM strings for the window
  const months: string[] = Array.from({ length: monthCount }, (_, i) =>
    monthUtils.addMonths(currentMonth, i),
  );

  const windowEndMonth = months[months.length - 1];
  const windowEndDate = monthUtils.lastDayOfMonth(windowEndMonth); // 'YYYY-MM-DD'

  // Bucket: month string → occurrences
  const buckets = new Map<string, ForecastOccurrence[]>(
    months.map(m => [m, []]),
  );

  const activeSchedules = schedules.filter(s => !s.completed && !s.tombstone);

  for (const schedule of activeSchedules) {
    const amount = getScheduledAmount(schedule._amount);
    // _payee is the payee ID; display name resolved in the UI layer.
    const payeeName = schedule._payee ?? '';
    const accountId = schedule._account ?? '';
    const scheduleName = schedule.name ?? '';
    const conds = extractScheduleConds(schedule._conditions ?? []);

    if (!conds.date) {
      continue;
    }

    const isRecurring = scheduleIsRecurring(conds.date);

    if (isRecurring) {
      // Walk occurrences from the first day of the current month through end
      // of the window, advancing one day past each found date to avoid duplicates.
      const windowEndDay = d.startOfDay(monthUtils._parse(windowEndDate));
      let cursor = d.startOfDay(
        monthUtils._parse(monthUtils.firstDayOfMonth(currentMonth)),
      );

      while (cursor <= windowEndDay) {
        // getNextDate with noSkipWeekend=true so we get the raw (unshifted)
        // schedule date — used purely to advance the cursor reliably.
        const nextDateRaw = getNextDate(conds.date, cursor, true);
        if (!nextDateRaw) break;

        const nextDayRaw = d.startOfDay(monthUtils._parse(nextDateRaw));
        if (nextDayRaw > windowEndDay) break;

        // Get the actual (possibly weekend-adjusted) date for display/bucketing.
        const nextDate = getNextDate(conds.date, cursor);
        if (!nextDate) break;

        const nextDay = d.startOfDay(monthUtils._parse(nextDate));

        // Only bucket if the adjusted date is still within the window.
        if (nextDay <= windowEndDay) {
          const occMonth = monthUtils.monthFromDate(nextDate);

          if (buckets.has(occMonth)) {
            buckets.get(occMonth)!.push({
              scheduleId: schedule.id,
              scheduleName,
              payeeName,
              accountId,
              amount,
              date: nextDate,
            });
          }
        }

        // Always advance past the RAW occurrence date so the cursor moves
        // forward even when weekend-skipping shifts the adjusted date backwards
        // (e.g. 30th on Saturday → Friday 29th). Without this, cursor would
        // land on the 30th again next iteration and loop forever.
        cursor = d.addDays(nextDayRaw, 1);
      }
    } else {
      // Single (non-recurring) date
      const nextDate = schedule.next_date;
      if (!nextDate) continue;

      // If the date is in the past (missed/due), bucket it into the current
      // month so it still appears in the forecast rather than being dropped.
      const effectiveDate = nextDate < today ? today : nextDate;
      const occMonth = monthUtils.monthFromDate(effectiveDate);

      if (buckets.has(occMonth)) {
        buckets.get(occMonth)!.push({
          scheduleId: schedule.id,
          scheduleName,
          payeeName,
          accountId,
          amount,
          date: effectiveDate,
        });
      }
    }
  }

  // Build ForecastMonth array with running balance
  let runningBalance = startingBalance;

  return months.map(month => {
    const occurrences = buckets.get(month) ?? [];

    let projectedIncome = 0;
    let projectedExpenses = 0;

    for (const occ of occurrences) {
      if (occ.amount >= 0) {
        projectedIncome += occ.amount;
      } else {
        projectedExpenses += Math.abs(occ.amount);
      }
    }

    const netDelta = projectedIncome - projectedExpenses;
    runningBalance += netDelta;

    return {
      month,
      projectedIncome,
      projectedExpenses,
      netDelta,
      runningBalance,
      scheduleOccurrences: occurrences,
    };
  });
}
