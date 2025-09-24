import { useState, useEffect } from 'react';

import { PluginSpreadsheet } from './types/actualPlugin';

/**
 * useReport hook for plugins to manage spreadsheet data
 * This is similar to the useReport hook in desktop-client but adapted for plugins
 */
export function useReport<T>(
  sheetName: string,
  getData: (
    spreadsheet: PluginSpreadsheet,
    setData: (results: T) => void,
  ) => Promise<void>,
  spreadsheet: PluginSpreadsheet,
): T | null {
  const [results, setResults] = useState<T | null>(null);

  useEffect(() => {
    getData(spreadsheet, results => setResults(results));
  }, [getData, spreadsheet]);

  return results;
}
