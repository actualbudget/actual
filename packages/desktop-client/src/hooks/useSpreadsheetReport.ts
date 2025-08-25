import { useMemo } from 'react';

import { useSpreadsheetReports } from './useSpreadsheetReports';

export function useSpreadsheetReport(id: string) {
  const { data, isLoading } = useSpreadsheetReports();

  return useMemo(
    () => ({
      data: data.find(report => report.id === id),
      isLoading,
    }),
    [data, id, isLoading],
  );
}
