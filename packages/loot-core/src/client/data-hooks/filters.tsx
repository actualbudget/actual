import q from '../query-helpers';
import { useLiveQuery } from '../query-hooks';

function toJS(rows) {
  let filters = rows.map(row => {
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
  return toJS(
    useLiveQuery(() => q('transaction_filters').select('*'), []) || [],
  );
}
