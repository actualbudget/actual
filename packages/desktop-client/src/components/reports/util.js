import { runQuery } from 'loot-core/src/client/query-helpers';

export function fromDateRepr(date) {
  return date.slice(0, 7);
}

export async function runAll(queries, cb) {
  const data = await Promise.all(
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

export function indexStack(data, fieldName, field) {
  const result = {};
  data.forEach(item => {
    result[item[fieldName]] = item[field];
  });
  return result;
}

export function indexCashFlow(data, date, isTransfer) {
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
