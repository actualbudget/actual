const FIRST_DAY_OF_WEEK_NAMES = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
] as const;

export type FirstDayOfWeek = (typeof FIRST_DAY_OF_WEEK_NAMES)[number];

export function getFirstDayOfWeek(idx: string | undefined): FirstDayOfWeek {
  return FIRST_DAY_OF_WEEK_NAMES[parseInt(idx || '0', 10) || 0];
}
