import { useMemo } from 'react';

import type { FieldType } from 'loot-core/types/chart-spec';

import { QueryResultTable } from '@desktop-client/components/reports/reports/QueryResultTable';
import { toColumnType } from '@desktop-client/queries/chart-spec';
import type {
  QueryResult,
  QueryResultColumn,
} from '@desktop-client/queries/processQueryResult';
import type { ResolvedChartSpec } from '@desktop-client/queries/resolveChannels';

type TableMarkProps = {
  result: QueryResult;
  resolved: ResolvedChartSpec;
  data: Record<string, unknown>[];
  seriesKeys: string[];
  compact?: boolean;
};

function deriveTableColumns(
  result: QueryResult,
  resolved: ResolvedChartSpec,
  seriesKeys: string[],
): QueryResultColumn[] {
  const encoding = resolved.encoding;
  const resultColumns = result.columns;

  if (!encoding.x && !encoding.y && !encoding.color) {
    return resultColumns;
  }

  if (encoding.color) {
    const cols: QueryResultColumn[] = [];

    if (encoding.x) {
      const xCol = resultColumns.find(c => c.name === encoding.x!.field);
      if (xCol) {
        cols.push(xCol);
      } else {
        cols.push({
          name: encoding.x.field,
          type:
            encoding.x.type === 'date'
              ? 'date'
              : encoding.x.type === 'number'
                ? 'float'
                : 'string',
        });
      }
    }

    const yType: QueryResultColumn['type'] =
      encoding.y && !Array.isArray(encoding.y)
        ? toColumnType(encoding.y.type as FieldType)
        : 'float';

    for (const key of seriesKeys) {
      cols.push({ name: key, type: yType });
    }

    return cols;
  }

  if (encoding.x && !encoding.y) {
    const xCol = resultColumns.find(c => c.name === encoding.x!.field);
    if (!xCol) return resultColumns;
    const remaining = resultColumns.filter(c => c.name !== encoding.x!.field);
    return [xCol, ...remaining];
  }

  const cols: QueryResultColumn[] = [];
  const addedNames = new Set<string>();

  if (encoding.x) {
    const xCol = resultColumns.find(c => c.name === encoding.x!.field);
    if (xCol) {
      cols.push(xCol);
      addedNames.add(xCol.name);
    }
  }

  if (encoding.y) {
    const yChannels = Array.isArray(encoding.y) ? encoding.y : [encoding.y];
    for (const ch of yChannels) {
      if (addedNames.has(ch.field)) continue;
      const yCol = resultColumns.find(c => c.name === ch.field);
      if (yCol) {
        cols.push(yCol);
        addedNames.add(yCol.name);
      }
    }
  }

  return cols;
}

function applySortToData(
  data: Record<string, unknown>[],
  resolved: ResolvedChartSpec,
): Record<string, unknown>[] {
  if (!resolved.encoding.x?.sort) return data;
  const xChannel = resolved.encoding.x;
  if (!xChannel) return data;

  const field = xChannel.field;
  const direction = xChannel.sort;

  if (direction !== 'asc' && direction !== 'desc') return data;

  return [...data].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    let cmp = 0;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      cmp = aVal - bVal;
    } else {
      cmp = String(aVal).localeCompare(String(bVal));
    }

    return direction === 'asc' ? cmp : -cmp;
  });
}

export function TableMark({ result, resolved, data, compact }: TableMarkProps) {
  const columns = deriveTableColumns(result, resolved, []);

  const sortedData = useMemo(
    () => applySortToData(data, resolved),
    [data, resolved],
  );

  const syntheticResult: QueryResult = useMemo(
    () => ({ columns, rows: sortedData }),
    [columns, sortedData],
  );

  return <QueryResultTable result={syntheticResult} compact={compact} />;
}
