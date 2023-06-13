import { useState, useEffect } from 'react';

import q, { liveQuery } from '../query-helpers';

export function useFilters() {
  let [data, setData] = useState([]);

  useEffect(() => {
    let query = q('transaction_filters').select('*');

    let filterQuery = liveQuery(query, async filters => {
      setData(filters);
    });

    return () => {
      filterQuery.unsubscribe();
    };
  }, []);

  return data;
}
