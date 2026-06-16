import type { QueryResult, QueryResultColumn } from './processQueryResult';

export type ColumnRole = 'time' | 'dimension' | 'measure' | 'id';

export type ColumnAssignment = {
  timeColumns: string[];
  dimensionColumns: string[];
  measureColumns: string[];
  idColumns: string[];
};

export function inferColumnRole(col: QueryResultColumn): ColumnRole {
  switch (col.type) {
    case 'date':
    case 'date-month':
    case 'date-year':
      return 'time';
    case 'integer':
    case 'float':
    case 'number':
      return 'measure';
    case 'id':
      return 'id';
    case 'boolean':
    case 'string':
    default:
      return 'dimension';
  }
}

export function assignColumns(result: QueryResult): ColumnAssignment {
  const timeColumns: string[] = [];
  const dimensionColumns: string[] = [];
  const measureColumns: string[] = [];
  const idColumns: string[] = [];

  for (const col of result.columns) {
    const role = inferColumnRole(col);
    if (role === 'time') {
      timeColumns.push(col.name);
    } else if (role === 'measure') {
      measureColumns.push(col.name);
    } else if (role === 'id') {
      idColumns.push(col.name);
      // ids are still usable as dimensions, but the dedicated list
      // helps callers hide them when picking default categories
      dimensionColumns.push(col.name);
    } else {
      dimensionColumns.push(col.name);
    }
  }

  return { timeColumns, dimensionColumns, measureColumns, idColumns };
}
