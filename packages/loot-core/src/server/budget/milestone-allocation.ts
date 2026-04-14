import type { Currency } from '#shared/currencies';
import * as monthUtils from '#shared/months';
import { amountToInteger } from '#shared/util';
import type { ByTemplate } from '#types/models/templates';

/** One savings obligation: by the end of `month` (YYYY-MM), add `increment` to the running total needed. */
export type BudgetMilestone = {
  month: string;
  increment: number;
};

function isMilestoneActive(deadlineMonth: string, currentMonth: string): boolean {
  return monthUtils.differenceInCalendarMonths(deadlineMonth, currentMonth) >= 0;
}

/**
 * Resolves `#template X by Y` lines into milestone increments (integer minor units).
 * Drops targets that are still in the past after repeat roll-forward (caller validation may already reject those).
 */
export function milestonesFromByTemplates(
  byTemplates: ByTemplate[],
  currentMonth: string,
  currency: Currency,
): BudgetMilestone[] {
  const out: BudgetMilestone[] = [];

  for (const template of byTemplates) {
    let targetMonth = `${template.month}`;
    const period = template.annual
      ? (template.repeat || 1) * 12
      : template.repeat != null
        ? template.repeat
        : null;
    let numMonths = monthUtils.differenceInCalendarMonths(
      targetMonth,
      currentMonth,
    );
    while (numMonths < 0 && period) {
      targetMonth = monthUtils.addMonths(targetMonth, period);
      numMonths = monthUtils.differenceInCalendarMonths(
        targetMonth,
        currentMonth,
      );
    }
    if (numMonths < 0 || !isMilestoneActive(targetMonth, currentMonth)) {
      continue;
    }

    const increment = amountToInteger(template.amount, currency.decimalPlaces);
    out.push({ month: targetMonth, increment });
  }

  return out;
}

/**
 * Cumulative milestone envelope: sort deadlines, cumulate increments, and take the maximum
 * shortfall rate (minimax constant monthly contribution).
 *
 * `balance` is the category balance available toward these goals (carryover + amount already
 * budgeted this month before this allocation).
 *
 * Uses the same month span convention as the previous `runBy` / `runSpend` helpers:
 * monthly need = shortfall / (differenceInCalendarMonths(deadline, current) + 1).
 */
export function allocateCumulativeMilestones(
  milestones: BudgetMilestone[],
  currentMonth: string,
  balance: number,
): number {
  if (milestones.length === 0) {
    return 0;
  }

  const byMonth = new Map<string, number>();
  for (const m of milestones) {
    if (!isMilestoneActive(m.month, currentMonth)) {
      continue;
    }
    byMonth.set(m.month, (byMonth.get(m.month) ?? 0) + m.increment);
  }

  const sortedMonths = [...byMonth.keys()].sort();
  if (sortedMonths.length === 0) {
    return 0;
  }

  let cumulative = 0;
  let maxMonthly = 0;

  for (const month of sortedMonths) {
    cumulative += byMonth.get(month)!;
    const numMonths = monthUtils.differenceInCalendarMonths(month, currentMonth);
    if (numMonths < 0) {
      continue;
    }
    const shortfall = Math.max(0, cumulative - balance);
    const monthly = shortfall / (numMonths + 1);
    if (monthly > maxMonthly) {
      maxMonthly = monthly;
    }
  }

  return Math.round(maxMonthly);
}
