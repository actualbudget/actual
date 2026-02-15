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
    let didCancel = false;

    // Reset results whenever a new data function is provided so callers
    // can reliably show a loading state instead of stale/partial data.
    setResults(null);

    getData(spreadsheet, results => {
      if (!didCancel) {
        setResults(results);
      }
    });

    return () => {
      didCancel = true;
    };
  }, [getData, spreadsheet]);
  return results;
}
