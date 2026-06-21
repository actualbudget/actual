import { theme } from '@actual-app/components/theme';
import type { AutomationOverviewAmounts } from '@actual-app/core/types/models';

export function getFundingStatusAmount(amounts: AutomationOverviewAmounts) {
  return amounts.overfunded - amounts.remaining;
}

export function getFundingStatusColor(amount: number) {
  if (amount < 0) {
    return theme.reportsNumberNegative;
  }

  if (amount > 0) {
    return theme.reportsNumberPositive;
  }

  return undefined;
}
