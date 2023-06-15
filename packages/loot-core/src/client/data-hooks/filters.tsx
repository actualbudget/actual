import React, { createContext, useContext, useState, useEffect } from 'react';

import q, { liveQuery } from '../query-helpers';
import { getFiltersById } from '../reducers/queries';

export function toJS(rows) {
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

let FiltersContext = createContext(null);

export function FiltersProvider({ children }) {
  let data = useFilters();
  return <FiltersContext.Provider value={data} children={children} />;
}

export function CachedFilters({ children, idKey }) {
  let data = useCachedFilters({ idKey });
  return children(data);
}

export function useCachedFilters({ idKey }: { idKey? } = {}) {
  let data = useContext(FiltersContext);
  return idKey && data ? getFiltersById(data) : data;
}
