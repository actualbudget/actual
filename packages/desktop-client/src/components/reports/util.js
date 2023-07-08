import { runQuery } from 'loot-core/src/client/query-helpers';

export function fromDateRepr(date) {
  return date.slice(0, 7);
}

export function fromDateReprToDay(date) {
  return date;
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

export function indexCF(data, field, field2, mapper) {
  const results = {};
  data.forEach(item => {
    let findExisting = results[item.date]
      ? results[item.date][item.xfer]
        ? results[item.date][item.xfer]
        : 0
      : 0;
    let result = { [item[field2]]: item.amount + findExisting };
    results[item[field]] = { ...results[item[field]], ...result };
    return { [item[field]]: result };
  });
  return results;
}
