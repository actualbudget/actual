import type { AqlQueryColumn } from 'loot-core/types/aql';

export type ColumnType =
  | 'string'
  | 'number'
  | 'float'
  | 'integer'
  | 'date'
  | 'date-month'
  | 'date-year'
  | 'boolean'
  | 'id';

export type QueryResultColumn = {
  name: string;
  type: ColumnType;
};

export type QueryResult = {
  columns: QueryResultColumn[];
  rows: Record<string, unknown>[];
  scalar?: number;
};

export function processQueryResult(
  data: Record<string, unknown>[],
  columns: AqlQueryColumn[] | undefined,
  isCalculation: boolean,
): QueryResult {
  const resolvedColumns =
    columns?.map(c => ({ name: c.name, type: c.type as ColumnType })) ??
    inferColumnsFromData(data);

  const rows = data;

  let scalar: number | undefined;
  if (isCalculation && rows.length === 1) {
    const numericValues = Object.values(rows[0]).filter(
      v => typeof v === 'number',
    );
    if (numericValues.length === 1) {
      scalar = numericValues[0] as number;
    }
  }

  return { columns: resolvedColumns, rows, scalar };
}

function inferColumnsFromData(
  data: Record<string, unknown>[],
): QueryResultColumn[] {
  if (data.length === 0) return [];
  const first = data[0];
  return Object.keys(first).map(name => ({
    name,
    type: inferType(first[name]),
  }));
}

function inferType(value: unknown): ColumnType {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'float';
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
    if (/^\d{4}-\d{2}$/.test(value)) return 'date-month';
    if (/^\d{4}$/.test(value)) return 'date-year';
    return 'string';
  }
  return 'string';
}
