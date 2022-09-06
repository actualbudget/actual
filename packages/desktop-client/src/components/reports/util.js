import { useMemo } from 'react';

import { runQuery } from 'loot-core/src/client/query-helpers';

export function useArgsMemo(func) {
  return (...args) => {
    return useMemo(() => func(...args), args);
  };
}

export function fromDateRepr(date) {
  return date.slice(0, 7);
}

export function fromDateReprToDay(date) {
  return date;
}

export function toDateRepr(str) {
  return parseInt(str.replace(/-/g, ''), 10);
}

export async function runAll(queries, cb) {
  let data = await Promise.all(
    queries.map(q => {
      return runQuery(q).then(({ data }) => data);
    })
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
