import type { DataEntity, LegendEntity } from '@actual-app/core/types/models';

export type TrendLineSegment = {
  id: string;
  color: string;
  start: { x: string; y: number };
  end: { x: string; y: number };
};

export function computeTrendLines(
  intervalData: DataEntity['intervalData'],
  legend: LegendEntity[],
): TrendLineSegment[] {
  const n = intervalData.length;
  if (n < 2) return [];

  const firstDate = intervalData[0].date;
  const lastDate = intervalData[n - 1].date;
  if (firstDate == null || lastDate == null) return [];

  const sumX = sumRange(n);
  const denom = n * sumSquares(n) - sumX ** 2;
  if (denom === 0) return [];

  const rows = intervalData as unknown as ReadonlyArray<
    Record<string, number | undefined>
  >;

  return legend.map(entry => {
    let sumY = 0;
    let sumXY = 0;
    for (let x = 0; x < n; x++) {
      const y = rows[x][entry.dataKey] ?? 0;
      sumY += y;
      sumXY += x * y;
    }
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return {
      id: entry.id ?? entry.dataKey,
      color: entry.color,
      start: { x: firstDate, y: intercept },
      end: { x: lastDate, y: intercept + slope * (n - 1) },
    };
  });
}

function sumRange(n: number) {
  return (n * (n - 1)) / 2;
}

function sumSquares(n: number) {
  return ((n - 1) * n * (2 * n - 1)) / 6;
}
