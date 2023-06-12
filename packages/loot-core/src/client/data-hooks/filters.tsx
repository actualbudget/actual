import { useState } from 'react';

import q, { liveQuery } from '../query-helpers';

export function useFilters() {
  let [data, setData] = useState([]);
  let query = q('transaction_filters').select('*');

  liveQuery(query, async filters => {
    setData(filters);
  });

  return data;
}
