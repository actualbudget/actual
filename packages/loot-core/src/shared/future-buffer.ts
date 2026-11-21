import type { IntegerAmount } from './util';

// How much of a managed month's "For next month" can cover a category's
// overspending. Next month's "Overspent in" takes the overspending of
// categories without rollover out of this buffer, so covering up to that
// amount from it leaves To Budget unchanged.
export function getForNextMonthCoverable({
  managed,
  forNextMonth,
  balance,
  carryover,
}: {
  managed: boolean;
  forNextMonth: IntegerAmount;
  balance: IntegerAmount;
  carryover: boolean;
}): IntegerAmount {
  if (!managed || carryover || balance >= 0) {
    return 0;
  }
  return Math.max(0, Math.min(forNextMonth, -balance));
}
