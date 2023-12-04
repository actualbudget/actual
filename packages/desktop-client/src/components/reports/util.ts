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

export function index<T>(data: T[], field: string, mapper?: (input) => string) {
  const result: Record<string, T> = {};
  data.forEach(item => {
    const key = mapper ? mapper(item[field]) : item[field];
    result[key] = item;
  });
  return result;
}

export function indexStack<T>(data: T[], fieldName: string, field: string) {
  const result = {};
  data.forEach(item => {
    result[item[fieldName]] = item[field];
  });
  return result;
}

export function indexCashFlow(data, date: string, isTransfer: string) {
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
