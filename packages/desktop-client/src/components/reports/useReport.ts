import { useEffect, useState } from 'react';

import { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';

export function useReport<T>(
  sheetName: string,
  getData: (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (results: T) => void,
  ) => Promise<void>,
): T | null {
  const spreadsheet = useSpreadsheet();
  const [results, setResults] = useState<T | null>(null);

  useEffect(() => {
    void getData(spreadsheet, results => setResults(results));
  }, [getData, spreadsheet]);
  return results;
}
