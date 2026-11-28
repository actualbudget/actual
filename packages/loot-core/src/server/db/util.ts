import type { SqlParam } from '#platform/server/sqlite';

export async function incrFetch<T>(
  runQuery: (
    query: string,
    params: SqlParam[],
    fetchAll: true,
  ) => T[] | Promise<T[]>,
  terms: string[],
  compare: (id: string) => string,
  makeQuery: (where: string) => string,
  params: SqlParam[] = [],
): Promise<T[]> {
  const pageCount = 500;
  let results: T[] = [];

  let fetchedIds = new Set<string>();

  for (let i = 0; i < terms.length; i += pageCount) {
    const slice = terms
      .slice(i, i + pageCount)
      .filter(id => !fetchedIds.has(id));
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

export function whereIn(ids: string[], field: string) {
  const ids2 = [...new Set(ids)];

  const filter = `${field} IN (` + ids2.map(id => `'${id}'`).join(',') + ')';
  return filter;
}
