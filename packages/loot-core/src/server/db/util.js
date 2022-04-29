export async function incrFetch(
  runQuery,
  terms,
  compare,
  makeQuery,
  params = []
) {
  let pageCount = 500;
  let results = [];

  let fetchedIds = new Set();

  for (let i = 0; i < terms.length; i += pageCount) {
    let slice = terms.slice(i, i + pageCount).filter(id => !fetchedIds.has(id));
    if (slice.length > 0) {
      let filter = slice.map(id => compare(id)).join(' OR ');
      let query = makeQuery('(' + filter + ')');

      let rows = await runQuery(query, params, true);
      fetchedIds = new Set([...fetchedIds, ...slice]);
      results = results.concat(rows);
    }
  }

  return results;
}

export function whereIn(ids, field) {
  let ids2 = [...new Set(ids)];
  let filter = `${field} IN (` + ids2.map(id => `'${id}'`).join(',') + ')';
  return filter;
}
