export function clampMonthRangeToBounds(
  start: string,
  end: string,
  earliestMonth: string,
  latestMonth: string,
) {
  const clampedStart = start < earliestMonth ? earliestMonth : start;
  const clampedEnd = end > latestMonth ? latestMonth : end;

  if (clampedStart > clampedEnd) {
    const fallback = start < earliestMonth ? earliestMonth : latestMonth;
    return [fallback, fallback] satisfies [string, string];
  }

  return [clampedStart, clampedEnd] satisfies [string, string];
}
