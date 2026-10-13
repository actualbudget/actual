import * as monthUtils from '@actual-app/core/shared/months';
import type { DataEntity, LegendEntity } from '@actual-app/core/types/models';

import {
  countElapsedDays,
  getFullIntervalDays,
} from '#components/reports/baselineRange';

export type TrendLineSegment = {
  id: string;
  color: string;
  start: { x: string; y: number };
  end: { x: string; y: number };
};

type IntervalPoint = DataEntity['intervalData'][number];

/**
 * Fits a straight line through each series. With a `paceInterval`, each
 * value is first scaled to a full interval of that kind at its daily pace, so
 * intervals a range cuts short or that are still running don't drag the line
 * down, and intervals that haven't started are left out. Budgets are set per
 * interval, so they leave it out to fit their values as they are.
 */
export function computeTrendLines(
  intervalData: DataEntity['intervalData'],
  legend: LegendEntity[],
  paceInterval?: string,
): TrendLineSegment[] {
  if (intervalData.length < 2) return [];

  const rows = intervalData as unknown as ReadonlyArray<
    Record<string, number | null | undefined>
  >;
  const scales = intervalData.map(interval =>
    paceInterval ? getPaceScale(interval, paceInterval) : 1,
  );

  return legend.flatMap(entry => {
    const points: { x: number; y: number }[] = [];
    intervalData.forEach((_, x) => {
      const value = rows[x][entry.dataKey];
      const scale = scales[x];
      // Null marks an interval with nothing to show yet; a missing value is
      // just an empty one
      if (value === null || scale === null) {
        return;
      }
      points.push({ x, y: (value ?? 0) * scale });
    });

    const fit = fitLine(points);
    if (!fit) return [];

    const first = points[0].x;
    const last = points[points.length - 1].x;
    return [
      {
        id: entry.id ?? entry.dataKey,
        color: entry.color,
        start: {
          x: intervalData[first].date,
          y: fit.intercept + fit.slope * first,
        },
        end: {
          x: intervalData[last].date,
          y: fit.intercept + fit.slope * last,
        },
      },
    ];
  });
}

// How much to scale an interval's value by to reach a full interval at its
// pace, or null when it hasn't started
function getPaceScale(interval: IntervalPoint, paceInterval: string) {
  const start = interval.intervalStartDate;
  const end = interval.intervalEndDate;
  if (!start || !end) {
    return 1;
  }
  if (monthUtils.dayFromDate(start) > monthUtils.currentDay()) {
    return null;
  }

  return (
    getFullIntervalDays(start, paceInterval) / countElapsedDays(start, end)
  );
}

function fitLine(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX ** 2;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  return { slope, intercept: (sumY - slope * sumX) / n };
}
