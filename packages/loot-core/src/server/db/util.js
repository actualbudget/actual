export async function incrFetch(
  runQuery,
  terms,
  compare,
  makeQuery,
  params = []
) {
  const pageCount = 500;
  let results = [];

  let fetchedIds = new Set();

  for (let i = 0; i < terms.length; i += pageCount) {
    const slice = terms.slice(i, i + pageCount).filter(id => !fetchedIds.has(id));
    if (slice.length > 0) {
      const filter = slice.map(id => compare(id)).join(' OR ');
      const query = makeQuery('(' + filter + ')');

      const rows = await runQuery(query, params, true);
      fetchedIds = new Set([...fetchedIds, ...slice]);
      results = results.concat(rows);
    }
  }

  return results;
}

export function whereIn(ids, field) {
  const ids2 = [...new Set(ids)];
  const filter = `${field} IN (` + ids2.map(id => `'${id}'`).join(',') + ')';
  return filter;
}
