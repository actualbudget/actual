import type { ResolvedChannel, ResolvedChartSpec } from './resolveChannels';

export function needsPivot(resolved: ResolvedChartSpec): boolean {
  return (
    resolved.encoding.series != null && !Array.isArray(resolved.encoding.y)
  );
}

export function pivotData(
  rows: Record<string, unknown>[],
  resolved: ResolvedChartSpec,
): { data: Record<string, unknown>[]; seriesKeys: string[] } {
  const xChannel = resolved.encoding.x;
  const yChannel = resolved.encoding.y as ResolvedChannel | undefined;
  const seriesChannel = resolved.encoding.series;

  if (!seriesChannel) {
    return { data: rows, seriesKeys: [] };
  }

  const xField =
    xChannel && !Array.isArray(xChannel) ? xChannel.field : undefined;
  const yField = yChannel?.field;
  const seriesField = seriesChannel.field;

  const seriesKeySet = new Set<string>();
  const seriesKeys: string[] = [];
  for (const row of rows) {
    const val = row[seriesField];
    if (val === null || val === undefined) continue;
    const key = String(val);
    if (!seriesKeySet.has(key)) {
      seriesKeySet.add(key);
      seriesKeys.push(key);
    }
  }

  if (seriesKeys.length === 0) {
    return { data: [], seriesKeys: [] };
  }

  if (xField) {
    const pivotMap = new Map<string, Record<string, unknown>>();

    for (const row of rows) {
      const xVal = row[xField];
      const seriesVal = row[seriesField];
      const yVal = yField ? row[yField] : undefined;

      if (xVal === null || xVal === undefined) {
        row[xField] = '—';
      }
      if (seriesVal === null || seriesVal === undefined) continue;

      const xKey = String(row[xField]);
      const seriesKey = String(seriesVal);

      let pivotRow = pivotMap.get(xKey);
      if (!pivotRow) {
        pivotRow = { [xField]: row[xField] };
        pivotMap.set(xKey, pivotRow);
      }

      const existing = pivotRow[seriesKey];
      if (yVal !== undefined) {
        if (
          existing !== undefined &&
          typeof existing === 'number' &&
          typeof yVal === 'number'
        ) {
          pivotRow[seriesKey] = existing + yVal;
        } else {
          pivotRow[seriesKey] = yVal;
        }
      } else {
        pivotRow[seriesKey] = existing ?? null;
      }
    }

    const data = Array.from(pivotMap.values());

    for (const row of data) {
      for (const key of seriesKeys) {
        if (!(key in row)) {
          row[key] = null;
        }
      }
    }

    const xSort =
      xChannel && !Array.isArray(xChannel) ? xChannel.sort : undefined;
    if (xSort) {
      sortData(data, xField, xSort);
    }

    return { data, seriesKeys };
  } else {
    const summaryRow: Record<string, unknown> = {};

    for (const row of rows) {
      const seriesVal = row[seriesField];
      const yVal = yField ? row[yField] : undefined;

      if (seriesVal === null || seriesVal === undefined) continue;

      const seriesKey = String(seriesVal);
      if (yVal !== undefined) {
        const existing = summaryRow[seriesKey];
        if (
          existing !== undefined &&
          typeof existing === 'number' &&
          typeof yVal === 'number'
        ) {
          summaryRow[seriesKey] = (existing as number) + (yVal as number);
        } else {
          summaryRow[seriesKey] = yVal;
        }
      }
    }

    return { data: [summaryRow], seriesKeys };
  }
}

function sortData(
  data: Record<string, unknown>[],
  field: string,
  sort: 'asc' | 'desc' | string[],
): void {
  if (sort === 'asc') {
    data.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      return aVal < bVal ? -1 : 1;
    });
  } else if (sort === 'desc') {
    data.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      return aVal < bVal ? 1 : -1;
    });
  }
}
