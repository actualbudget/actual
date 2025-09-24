import { useState, useEffect } from 'react';

import { PluginSpreadsheet } from './types/actualPlugin';

/**
 * React hook that fetches and returns report data for a plugin spreadsheet.
 *
 * Calls the provided async `getData` function with the spreadsheet and a setter;
 * the setter updates the returned results when data becomes available.
 *
 * @param sheetName - Identifier for the sheet (kept for API compatibility; not used by the hook).
 * @param getData - Async function that receives the spreadsheet and a `setData` callback to supply results.
 * @returns The most recent results of type `T`, or `null` if no results have been set yet.
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
