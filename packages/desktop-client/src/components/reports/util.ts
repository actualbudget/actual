import { runQuery } from 'loot-core/src/client/query-helpers';

export function fromDateRepr(date: string): string {
  return date.slice(0, 7);
}

export async function runAll(
  queries: any[],
  cb: (data: any[]) => void,
): Promise<void> {
  let data = await Promise.all(
    queries.map(q => {
      return runQuery(q).then(({ data }) => data);
    }),
  );
  cb(data);
}

export function index(
  data: any[],
  field: string,
  mapper?: (input: any) => any,
): { [key: string]: any } {
  const result: { [key: string]: any } = {};
  data.forEach(item => {
    result[mapper ? mapper(item[field]) : item[field]] = item;
  });
  return result;
}

export function indexStack(
  data: any[],
  fieldName: string,
  field: string,
): { [key: string]: any } {
  const result: { [key: string]: any } = {};
  data.forEach(item => {
    result[item[fieldName]] = item[field];
  });
  return result;
}

export function indexCashFlow(
  data: any[],
  date: string,
  isTransfer: string,
): { [key: string]: any } {
  const results: { [key: string]: any } = {};
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
