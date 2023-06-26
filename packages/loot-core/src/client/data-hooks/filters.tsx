import { useState, useEffect } from 'react';

import q, { liveQuery } from '../query-helpers';

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
  let [data, setData] = useState([]);

  useEffect(() => {
    let query = q('transaction_filters').select('*');

    let filterQuery = liveQuery(query, async filters => {
      let filte = toJS(filters);
      setData(filte);
    });

    return () => {
      filterQuery.unsubscribe();
    };
  }, []);

  return data;
}
