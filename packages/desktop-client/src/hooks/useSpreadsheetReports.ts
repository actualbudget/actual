import { useMemo } from 'react';

import { q } from 'loot-core/shared/query';
import {
  type SpreadsheetReportData,
  type SpreadsheetReportEntity,
} from 'loot-core/types/models';

import { useQuery } from './useQuery';

function toJS(rows: SpreadsheetReportData[]) {
  const reports: SpreadsheetReportEntity[] = rows.map(row => {
    let rowsData = [];
    try {
      rowsData = JSON.parse(row.rows || '[]');
    } catch {
      rowsData = [];
    }

    return {
      id: row.id,
      name: row.name,
      rows: rowsData,
      showFormulaColumn: row.show_formula_column === 1,
    };
  });
  return reports;
}

export function useSpreadsheetReports() {
  const { data: queryData, isLoading } = useQuery<SpreadsheetReportData>(
    () => q('spreadsheet_reports').select('*'),
    [],
  );

  // Sort reports by alphabetical order
  function sort(reports: SpreadsheetReportEntity[]) {
    return reports.sort((a, b) =>
      a.name && b.name
        ? a.name.trim().localeCompare(b.name.trim(), undefined, {
            ignorePunctuation: true,
          })
        : 0,
    );
  }

  return useMemo(
    () => ({
      isLoading,
      data: sort(toJS(queryData ? [...queryData] : [])),
    }),
    [isLoading, queryData],
  );
}
