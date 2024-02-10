import { useMemo } from 'react';

import { q } from '../../shared/query';
import {
  type CustomReportData,
  type CustomReportEntity,
} from '../../types/models';
import { useLiveQuery } from '../query-hooks';

function toJS(rows: CustomReportData[]) {
  const reports: CustomReportEntity[] = rows.map(row => {
    const report: CustomReportEntity = {
      id: row.id,
      name: row.name,
      startDate: row.start_date,
      endDate: row.end_date,
      isDateStatic: row.date_static === 1,
      dateRange: row.date_range,
      mode: row.mode,
      groupBy: row.group_by,
      balanceType: row.balance_type,
      showEmpty: row.show_empty === 1,
      showOffBudget: row.show_offbudget === 1,
      showHiddenCategories: row.show_hidden === 1,
      showUncategorized: row.show_uncategorized === 1,
      selectedCategories: row.selected_categories,
      graphType: row.graph_type,
      conditions: row.conditions,
      conditionsOp: row.conditions_op ?? 'and',
      data: row.metadata,
    };
    return report;
  });
  return reports;
}

/*
leaving as a placeholder for saved reports implementation return an 
empty array because "reports" db table doesn't exist yet
*/
export function useReports(): CustomReportEntity[] {
  const reports: CustomReportEntity[] = toJS(
    //useLiveQuery(() => q('reports').select('*'), []) || [],
    useLiveQuery(() => q('transaction_filters').select('*'), []) || [],
  );

  /** Sort reports by alphabetical order */
  function sort(reports: CustomReportEntity[]) {
    return reports.sort((a, b) =>
      a.name && b.name
        ? a.name.trim().localeCompare(b.name.trim(), undefined, {
            ignorePunctuation: true,
          })
        : 0,
    );
  }

  //return useMemo(() => sort(reports), [reports]);

  //everything below this line will be removed once db table is created
  const order: CustomReportEntity[] = useMemo(() => sort(reports), [reports]);
  const flag = true;
  const emptyReports: CustomReportEntity[] = flag ? [] : order;
  return emptyReports;
}
