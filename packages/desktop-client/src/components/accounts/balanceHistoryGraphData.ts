import * as monthUtils from '@actual-app/core/shared/months';
import type { ForecastDataPoint } from '@actual-app/core/types/models/forecast';
import { subMonths } from 'date-fns';

export type BalanceGraphRange = { start: string; end: string };

export type DailyBalancePoint = {
  date: string;
  time: number;
  balance: number;
  // Split into two series so the chart can draw posted history as a solid
  // line and the projection as a dashed one. Both are set on `today` so the
  // two lines join without a gap.
  actual: number | null;
  projected: number | null;
};

function createPoint(
  date: string,
  balance: number,
  today: string,
): DailyBalancePoint {
  return {
    date,
    time: monthUtils._parse(date).getTime(),
    balance,
    actual: date <= today ? balance : null,
    projected: date >= today ? balance : null,
  };
}

export function buildDailyBalancePoints(
  dataPoints: readonly ForecastDataPoint[],
  today: string,
): DailyBalancePoint[] {
  const balancesByDate = new Map<string, number>();
  for (const { date, balance } of dataPoints) {
    balancesByDate.set(date, (balancesByDate.get(date) ?? 0) + balance);
  }

  const dates = [...balancesByDate.keys()].sort();
  const lastDate = dates[dates.length - 1];

  // Only keep the days where the balance changes. The graph is drawn as steps,
  // so the days in between add nothing but points to render.
  const points: DailyBalancePoint[] = [];
  let previousBalance: number | null = null;
  for (const date of dates) {
    const balance = balancesByDate.get(date) ?? 0;
    const isAnchor = date === dates[0] || date === today || date === lastDate;
    if (balance !== previousBalance || isAnchor) {
      points.push(createPoint(date, balance, today));
    }
    previousBalance = balance;
  }

  return points;
}

export function getBalanceOnDate(
  points: readonly DailyBalancePoint[],
  date: string,
): number {
  let balance = 0;
  for (const point of points) {
    if (point.date > date) {
      break;
    }
    balance = point.balance;
  }
  return balance;
}

// Shown by default: the last year of history and the whole projection.
export function getDefaultRange(
  points: readonly DailyBalancePoint[],
  today: string,
): BalanceGraphRange | null {
  if (points.length === 0) {
    return null;
  }
  const yearAgo = monthUtils.dayFromDate(
    subMonths(monthUtils._parse(today), 12),
  );
  return clampRange(points, {
    start: yearAgo,
    end: points[points.length - 1].date,
  });
}

export function clampRange(
  points: readonly DailyBalancePoint[],
  range: BalanceGraphRange,
): BalanceGraphRange | null {
  if (points.length === 0) {
    return null;
  }
  const firstDate = points[0].date;
  const lastDate = points[points.length - 1].date;
  const start = range.start < firstDate ? firstDate : range.start;
  const end = range.end > lastDate ? lastDate : range.end;
  return start < end ? { start, end } : { start: firstDate, end: lastDate };
}

export function getPointsInRange(
  points: readonly DailyBalancePoint[],
  range: BalanceGraphRange,
  today: string,
): DailyBalancePoint[] {
  // The graph starts and ends exactly on the range bounds, with the balance
  // carried over from the closest change before them.
  const boundPoint = (date: string) =>
    createPoint(date, getBalanceOnDate(points, date), today);

  return [
    boundPoint(range.start),
    ...points.filter(
      point => point.date > range.start && point.date < range.end,
    ),
    boundPoint(range.end),
  ];
}

// `ratio` is a horizontal position from 0 (`range.start`) to 1 (`range.end`).
export function getDateAtRatio(range: BalanceGraphRange, ratio: number) {
  const totalDays = monthUtils.differenceInCalendarDays(range.end, range.start);
  const clamped = Math.min(Math.max(ratio, 0), 1);
  return monthUtils.addDays(range.start, Math.round(totalDays * clamped));
}

export function getRatioOfDate(range: BalanceGraphRange, date: string) {
  const totalDays = monthUtils.differenceInCalendarDays(range.end, range.start);
  return totalDays === 0
    ? 0
    : monthUtils.differenceInCalendarDays(date, range.start) / totalDays;
}

// `ratio` is the horizontal position on the graph, from 0 (first point) to
// 1 (last point). Days without transactions don't change the balance, so the
// position snaps to the closest day that does.
export function getNearestPoint(
  points: readonly DailyBalancePoint[],
  ratio: number,
): DailyBalancePoint | null {
  if (points.length === 0) {
    return null;
  }
  const firstTime = points[0].time;
  const lastTime = points[points.length - 1].time;
  const time =
    firstTime + (lastTime - firstTime) * Math.min(Math.max(ratio, 0), 1);

  let nearest = points[0];
  for (const point of points) {
    if (Math.abs(point.time - time) < Math.abs(nearest.time - time)) {
      nearest = point;
    }
  }
  return nearest;
}

export function getLowestProjectedPoint(
  points: readonly DailyBalancePoint[],
  today: string,
): DailyBalancePoint | null {
  let lowest: DailyBalancePoint | null = null;
  let lowestBalance = getBalanceOnDate(points, today);
  for (const point of points) {
    if (point.date > today && point.balance < lowestBalance) {
      lowest = point;
      lowestBalance = point.balance;
    }
  }
  return lowest;
}

export function getBalanceChange(
  points: readonly DailyBalancePoint[],
  fromDate: string,
  toDate: string,
): number {
  if (points.length < 2) {
    return 0;
  }
  const startingBalance = getBalanceOnDate(points, fromDate);
  if (startingBalance === 0) {
    return 0;
  }
  const endingBalance = getBalanceOnDate(points, toDate);
  return ((endingBalance - startingBalance) / Math.abs(startingBalance)) * 100;
}
