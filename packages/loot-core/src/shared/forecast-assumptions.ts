import {
  addYears,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
} from 'date-fns';

import type { ForecastAssumptions } from '#types/models/forecast';

export function isValidForecastAnchorDate(date: string) {
  const parsed = parseISO(date);
  return isValid(parsed) && format(parsed, 'yyyy-MM-dd') === date;
}

export function validateForecastAssumptions(assumptions: ForecastAssumptions) {
  if (!isValidForecastAnchorDate(assumptions.anchorDate)) {
    throw new Error('Forecast assumptions require a valid anchor date.');
  }
  for (const rate of [
    assumptions.inflationRate,
    assumptions.salaryGrowthRate,
  ]) {
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      throw new Error('Forecast annual rates must be between 0% and 100%.');
    }
  }
}

function elapsedYears(date: string, anchorDate: string) {
  if (date <= anchorDate) {
    return { whole: 0, fraction: 0 };
  }
  const anchor = parseISO(anchorDate);
  const target = parseISO(date);
  let whole = target.getFullYear() - anchor.getFullYear();
  // A February 29 anniversary falls on February 28 in non-leap years.
  if (addYears(anchor, whole) > target) {
    whole--;
  }
  const anniversary = addYears(anchor, whole);
  const nextAnniversary = addYears(anchor, whole + 1);
  return {
    whole,
    fraction:
      differenceInCalendarDays(target, anniversary) /
      differenceInCalendarDays(nextAnniversary, anniversary),
  };
}

export function growForecastIncome(
  amount: number,
  date: string,
  assumptions: ForecastAssumptions,
) {
  const { whole } = elapsedYears(date, assumptions.anchorDate);
  const grown = Math.round(
    amount * (1 + assumptions.salaryGrowthRate) ** whole,
  );
  if (!Number.isSafeInteger(grown)) {
    throw new Error(
      'Salary growth exceeds the supported amount range. Choose a later anchor date or a lower rate.',
    );
  }
  return grown;
}

/** Convert nominal money only; this never increases expenses or cash flows. */
export function forecastPurchasingPower(
  amount: number,
  date: string,
  assumptions: ForecastAssumptions,
) {
  const { whole, fraction } = elapsedYears(date, assumptions.anchorDate);
  return Math.round(
    amount / (1 + assumptions.inflationRate) ** (whole + fraction),
  );
}
