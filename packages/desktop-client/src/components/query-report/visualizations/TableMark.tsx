import { useMemo } from 'react';

import { QueryResultTable } from '@desktop-client/components/reports/reports/QueryResultTable';
import type {
  QueryResult,
  QueryResultColumn,
} from '@desktop-client/queries/processQueryResult';
import type { ResolvedChartSpec } from '@desktop-client/queries/resolveChannels';

type TableMarkProps = {
  result: QueryResult;
  resolved: ResolvedChartSpec;
  compact?: boolean;
};

type DeriveResult = {
  columns: QueryResultColumn[];
  groupColumnCount: number;
  columnTitles: Record<string, string>;
  columnFormats: Record<string, string>;
};

function deriveTableColumns(
  result: QueryResult,
  resolved: ResolvedChartSpec,
): DeriveResult {
  const encoding = resolved.encoding;
  const resultColumns = result.columns;

  if (!encoding.x && !encoding.y) {
    return {
      columns: resultColumns,
      groupColumnCount: 0,
      columnTitles: {},
      columnFormats: {},
    };
  }

  const cols: QueryResultColumn[] = [];
  const addedNames = new Set<string>();
  const columnTitles: Record<string, string> = {};
  const columnFormats: Record<string, string> = {};

  const collectMeta = (ch: {
    field: string;
    title?: string;
    format?: string;
  }) => {
    if (ch.title) columnTitles[ch.field] = ch.title;
    if (ch.format) columnFormats[ch.field] = ch.format;
  };

  if (encoding.x) {
    const xChannels = Array.isArray(encoding.x) ? encoding.x : [encoding.x];
    for (const ch of xChannels) {
      collectMeta(ch);
      if (addedNames.has(ch.field)) continue;
      const col = resultColumns.find(c => c.name === ch.field);
      if (col) {
        cols.push(col);
        addedNames.add(col.name);
      }
    }
  }

  const groupColumnCount = cols.length;

  if (encoding.y) {
    const yChannels = Array.isArray(encoding.y) ? encoding.y : [encoding.y];
    for (const ch of yChannels) {
      collectMeta(ch);
      if (addedNames.has(ch.field)) continue;
      const col = resultColumns.find(c => c.name === ch.field);
      if (col) {
        cols.push(col);
        addedNames.add(col.name);
      }
    }
  }

  return { columns: cols, groupColumnCount, columnTitles, columnFormats };
}

function applySortToData(
  data: Record<string, unknown>[],
  resolved: ResolvedChartSpec,
): Record<string, unknown>[] {
  const xChannel = resolved.encoding.x;
  if (!xChannel) return data;
  const primary = Array.isArray(xChannel) ? xChannel[0] : xChannel;
  if (!primary?.sort) return data;

  const field = primary.field;
  const direction = primary.sort;

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

export function TableMark({ result, resolved, compact }: TableMarkProps) {
  const { columns, groupColumnCount, columnTitles, columnFormats } =
    deriveTableColumns(result, resolved);

  const sortedData = useMemo(
    () => applySortToData(result.rows, resolved),
    [result.rows, resolved],
  );

  const syntheticResult: QueryResult = useMemo(
    () => ({ columns, rows: sortedData }),
    [columns, sortedData],
  );

  return (
    <QueryResultTable
      result={syntheticResult}
      compact={compact}
      groupColumnCount={groupColumnCount}
      conditionalRules={resolved.config?.conditionalRules}
      columnTitles={columnTitles}
      columnFormats={columnFormats}
    />
  );
}
