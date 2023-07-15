import { runQuery } from 'loot-core/src/client/query-helpers';

export function fromDateRepr(date) {
  return date.slice(0, 7);
}

export async function runAll(queries, cb) {
  let data = await Promise.all(
    queries.map(q => {
      return runQuery(q).then(({ data }) => data);
    }),
  );
  cb(data);
}

export function index(data, field, mapper) {
  const result = {};
  data.forEach(item => {
    result[mapper ? mapper(item[field]) : item[field]] = item;
  });
  return result;
}

export function indexCashFlow(data, date, isTransfer) {
  const results = {};
  data.forEach(item => {
    let findExisting = results[item.date]
      ? results[item.date][item.xfer]
        ? results[item.date][item.xfer]
        : 0
      : 0;
    let result = { [item[isTransfer]]: item.amount + findExisting };
    results[item[date]] = { ...results[item[date]], ...result };
  });
  return results;
}
