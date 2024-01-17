import { useMemo } from 'react';

import { q } from '../../shared/query';
import { useLiveQuery } from '../query-hooks';

function toJS(rows) {
  const reports = rows.map(row => {
    return {
      ...row,
      conditionsOp: row.conditions_op,
    };
  });
  return reports;
}

export function useReports() {
  const reports = toJS(useLiveQuery(() => q('reports').select('*'), []) || []);

  /** Sort reports by alphabetical order */
  function sort(reports) {
    return reports.sort((a, b) =>
      a.name.trim().localeCompare(b.name.trim(), { ignorePunctuation: true }),
    );
  }

  return useMemo(() => sort(reports), [reports]);
}
