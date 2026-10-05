export type MonthStatus = 'past' | 'current' | 'future';

export function getMonthStatus(
  month: string,
  currentMonth: string,
): MonthStatus {
  if (month < currentMonth) {
    return 'past';
  }

  if (month > currentMonth) {
    return 'future';
  }

  return 'current';
}
