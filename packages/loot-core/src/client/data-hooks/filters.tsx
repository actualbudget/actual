import { useMemo } from 'react';

import q from '../query-helpers';
import { useLiveQuery } from '../query-hooks';

function toJS(rows) {
  const filters = rows.map(row => {
    return {
      ...row.fields,
      id: row.id,
      name: row.name,
      tombstone: row.tombstone,
      conditionsOp: row.conditions_op,
      conditions: row.conditions,
    };
  });
  return filters;
}

export function useFilters() {
  const filters = toJS(
    useLiveQuery(() => q('transaction_filters').select('*'), []) || [],
  );

  /** Sort filters by alphabetical order */
  function sort(filters) {
    return filters.sort((a, b) =>
      a.name.trim().localeCompare(b.name.trim(), { ignorePunctuation: true }),
    );
  }

  return useMemo(() => sort(filters), [filters]);
}
