import { useMemo } from 'react';

import { q } from '../../shared/query';
import {
  type CustomReportData,
  type CustomReportEntity,
} from '../../types/models';
import { useLiveQuery } from '../query-hooks';

function toJS(rows: CustomReportData[]) {
  const reports: CustomReportEntity[] = rows.map(row => {
    const test: CustomReportEntity = {
      ...row,
      conditionsOp: row.conditions_op ?? 'and',
      filters: row.conditions,
    };
    return test;
  });
  return reports;
}

/*
leaving as a placeholder for saved reports implementation return an empty array because "reports" db table doesn't exist yet
*/
export function useReports(): CustomReportEntity[] {
  const reports: CustomReportEntity[] = toJS(
    //useLiveQuery(() => q('reports').select('*'), []) || [],
    useLiveQuery(() => q('transaction_filters').select('*'), []) || [],
  );

  /** Sort reports by alphabetical order */
  function sort(reports: CustomReportEntity[]) {
    return reports.sort((a, b) =>
      a.name
        .trim()
        .localeCompare(b.name.trim(), undefined, { ignorePunctuation: true }),
    );
  }

  const flag = true;
  const order: CustomReportEntity[] = useMemo(() => sort(reports), [reports]);
  const emptyReports: CustomReportEntity[] = flag ? [] : order;
  return emptyReports;
}
