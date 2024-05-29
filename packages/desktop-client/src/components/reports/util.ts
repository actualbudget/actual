// @ts-strict-ignore
import { runQuery } from 'loot-core/src/client/query-helpers';
import type { Query } from 'loot-core/src/shared/query';

export function fromDateRepr(date: string): string {
  return date.slice(0, 7);
}

export async function runAll(
  queries: Query[],
  cb: (data) => void,
): Promise<void> {
  const data = await Promise.all(
    queries.map(q => {
      return runQuery(q).then(({ data }) => data);
    }),
  );
  cb(data);
}

export function indexCashFlow<
  T extends { date: string; isTransfer: boolean; amount: number },
>(data: T[], date: string, isTransfer: string) {
  const results = {};
  data.forEach(item => {
    const findExisting = results[item.date]
      ? results[item.date][item.isTransfer]
        ? results[item.date][item.isTransfer]
        : 0
      : 0;
    const result = { [item[isTransfer]]: item.amount + findExisting };
    results[item[date]] = { ...results[item[date]], ...result };
  });
  return results;
}
