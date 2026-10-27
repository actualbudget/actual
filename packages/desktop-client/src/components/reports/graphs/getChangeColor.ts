import { theme } from '@actual-app/components/theme';

/**
 * Green for a change in the user's favour, red against it.
 */
export function getChangeColor(change: number) {
  if (change === 0) return theme.reportsNumberNeutral;
  return change > 0 ? theme.reportsNumberPositive : theme.reportsNumberNegative;
}
