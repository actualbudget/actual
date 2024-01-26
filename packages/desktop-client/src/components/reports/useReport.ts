// @ts-strict-ignore
import { useState, useEffect, type SetStateAction } from 'react';

import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';

export function useReport(
  sheetName: string,
  getData: (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    setData: (results: unknown) => SetStateAction<unknown>,
  ) => Promise<void>,
) {
  const spreadsheet = useSpreadsheet();
  const [results, setResults] = useState(null);

  useEffect(() => {
    let cleanup;
    getData(spreadsheet, results => setResults(results)).then(c => {
      cleanup = c;
    });
    return () => {
      cleanup?.();
    };
  }, [getData]);
  return results;
}
