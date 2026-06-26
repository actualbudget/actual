import type { ColumnType } from './processQueryResult';
import type { QueryResult, QueryResultColumn } from './processQueryResult';

export type MergeResult = {
  result: QueryResult;
  sourceIndex: Record<string, number>;
  mergeKey: string;
};

export type MergeError = {
  type: 'merge-error';
  message: string;
};

export type MergeOptions = {
  mergeKey?: string;
};

const DATE_TYPE_RANK: Record<string, number> = {
  date: 3,
  'date-month': 2,
  'date-year': 1,
};

function isDateType(type: ColumnType): boolean {
  return type === 'date' || type === 'date-month' || type === 'date-year';
}

function mostGeneralType(a: ColumnType, b: ColumnType): ColumnType {
  const rankA = DATE_TYPE_RANK[a] ?? 0;
  const rankB = DATE_TYPE_RANK[b] ?? 0;
  return rankA >= rankB ? a : b;
}

function areTypesCompatible(a: ColumnType, b: ColumnType): boolean {
  if (a === b) return true;
  return isDateType(a) && isDateType(b);
}

export function mergeQueryResults(
  results: QueryResult[],
  options?: MergeOptions,
): MergeResult | MergeError {
  if (results.length === 1) {
    const r = results[0];
    const firstCol = r.columns[0]?.name ?? '';
    const sourceIndex: Record<string, number> = {};
    for (const col of r.columns) {
      sourceIndex[col.name] = 0;
    }
    return { result: r, sourceIndex, mergeKey: firstCol };
  }

  if (results.length === 0) {
    return {
      type: 'merge-error',
      message: 'No query results to merge.',
    };
  }

  const explicitMergeKey = options?.mergeKey;

  let mergeKey = explicitMergeKey;

  if (!mergeKey) {
    const columnSets = results.map(r => new Set(r.columns.map(c => c.name)));
    const intersection = [...columnSets[0]].filter(name =>
      columnSets.every(s => s.has(name)),
    );

    if (intersection.length === 0) {
      return {
        type: 'merge-error',
        message:
          'Queries have no columns in common to merge on. Add a shared date or category column.',
      };
    }

    const dateCandidates = intersection.filter(name => {
      const types = results.map(
        r => r.columns.find(c => c.name === name)!.type,
      );
      return types.every(t => isDateType(t));
    });

    mergeKey = dateCandidates.length > 0 ? dateCandidates[0] : intersection[0];
  }

  for (let i = 0; i < results.length; i++) {
    const col = results[i].columns.find(c => c.name === mergeKey);
    if (!col) {
      return {
        type: 'merge-error',
        message: `Merge key "${mergeKey}" not found in query result ${i + 1}. Available columns: ${results[i].columns.map(c => c.name).join(', ')}.`,
      };
    }

    const typeForMergeKey = col.type;
    for (let j = 0; j < i; j++) {
      const otherCol = results[j].columns.find(c => c.name === mergeKey);
      if (otherCol && !areTypesCompatible(typeForMergeKey, otherCol.type)) {
        return {
          type: 'merge-error',
          message: `Column "${mergeKey}" has incompatible types across queries (${typeForMergeKey} vs ${otherCol.type}).`,
        };
      }
    }
  }

  const nonMergeColumns: { name: string; index: number }[] = [];
  for (let i = 0; i < results.length; i++) {
    for (const col of results[i].columns) {
      if (col.name !== mergeKey) {
        nonMergeColumns.push({ name: col.name, index: i });
      }
    }
  }

  const seenColumns = new Set<string>();
  const duplicateErrors: string[] = [];
  for (const entry of nonMergeColumns) {
    if (seenColumns.has(entry.name)) {
      const originalIndex = nonMergeColumns.findIndex(
        e => e.name === entry.name,
      );
      const originalQueryIndex = nonMergeColumns[originalIndex].index;
      duplicateErrors.push(
        `Column "${entry.name}" is already used by Query ${originalQueryIndex + 1}. Use different .select() aliases.`,
      );
    }
    seenColumns.add(entry.name);
  }

  if (duplicateErrors.length > 0) {
    return {
      type: 'merge-error',
      message: duplicateErrors[0],
    };
  }

  const indices = results.map(r => {
    const map = new Map<string, Record<string, unknown>>();
    for (const row of r.rows) {
      const key = String(row[mergeKey]);
      map.set(key, row);
    }
    return map;
  });

  const allKeys = new Set<string>();
  for (const idx of indices) {
    for (const key of idx.keys()) {
      allKeys.add(key);
    }
  }

  const mergeKeyCol: QueryResultColumn = (() => {
    const types = results.map(
      r => r.columns.find(c => c.name === mergeKey)!.type,
    );
    const finalType = types.reduce((acc, t) => mostGeneralType(acc, t));
    return { name: mergeKey, type: finalType };
  })();

  const sortedKeys = [...allKeys].sort((a, b) => {
    if (
      mergeKeyCol.type === 'integer' ||
      mergeKeyCol.type === 'number' ||
      mergeKeyCol.type === 'float'
    ) {
      return Number(a) - Number(b);
    }
    return String(a).localeCompare(String(b));
  });

  const outputColumns: QueryResultColumn[] = [mergeKeyCol];
  const sourceIndex: Record<string, number> = {};
  sourceIndex[mergeKey] = -1;

  for (let i = 0; i < results.length; i++) {
    for (const col of results[i].columns) {
      if (col.name !== mergeKey) {
        outputColumns.push(col);
        sourceIndex[col.name] = i;
      }
    }
  }

  const outputRows: Record<string, unknown>[] = [];

  for (const key of sortedKeys) {
    const typedKey =
      mergeKeyCol.type === 'integer' ||
      mergeKeyCol.type === 'number' ||
      mergeKeyCol.type === 'float'
        ? Number(key)
        : key;
    const row: Record<string, unknown> = { [mergeKey]: typedKey };

    for (let i = 0; i < results.length; i++) {
      const existing = indices[i].get(key);
      if (existing) {
        for (const col of results[i].columns) {
          if (col.name !== mergeKey) {
            row[col.name] = existing[col.name];
          }
        }
      } else {
        for (const col of results[i].columns) {
          if (col.name !== mergeKey) {
            const colType = col.type;
            if (
              colType === 'number' ||
              colType === 'integer' ||
              colType === 'float'
            ) {
              row[col.name] = 0;
            } else {
              row[col.name] = null;
            }
          }
        }
      }
    }

    outputRows.push(row);
  }

  return {
    result: { columns: outputColumns, rows: outputRows, scalar: undefined },
    sourceIndex,
    mergeKey,
  };
}
