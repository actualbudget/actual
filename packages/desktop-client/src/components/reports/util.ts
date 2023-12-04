import { runQuery } from 'loot-core/src/client/query-helpers';
import type { Query } from 'loot-core/src/shared/query';

export function fromDateRepr(date: string): string {
  return date.slice(0, 7);
}

export async function runAll(
  queries: Query[],
  cb: (data) => void,
): Promise<void> {
  let data = await Promise.all(
    queries.map(q => {
      return runQuery(q).then(({ data }) => data);
    }),
  );
  cb(data);
}

export function index<T, K extends keyof T>(
  data: T[],
  field: K,
  mapper?: (input: T[K]) => string,
) {
  const result: Record<K, T[K]> = {} as Record<K, T[K]>;
  data.forEach(item => {
    result[mapper ? mapper(item[field]) : (item[field] as string)] =
      item;
  });
  return result;
}

export function indexStack<T, K extends keyof T>(
  data: T[],
  fieldName: K,
  field: K,
) {
  const result: Record<K, T[K]> = {} as Record<K, T[K]>;
  data.forEach(item => {
    result[item[fieldName] as string] = item[field];
  });
  return result;
}

export function indexCashFlow<T, K extends keyof T>(data, date: K, isTransfer: K) {
  const results = {};
  data.forEach(item => {
    let findExisting = results[item.date]
      ? results[item.date][item.isTransfer]
        ? results[item.date][item.isTransfer]
        : 0
      : 0;
    let result = { [item[isTransfer]]: item.amount + findExisting };
    results[item[date]] = { ...results[item[date]], ...result };
  });
  return results;
}
