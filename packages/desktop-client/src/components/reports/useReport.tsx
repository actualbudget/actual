import { useState, useEffect } from 'react';

import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';

type useReportProps = {
  sheetName: string;
  getData: (
    spreadsheet: ReturnType<typeof useSpreadsheet>,
    useResults: (results: unknown) => void,
  ) => Promise<unknown>;
};

function useReport(props: useReportProps) {
  const spreadsheet = useSpreadsheet();
  const [results, setResults] = useState(null);

  useEffect(() => {
    let cleanup;
    props
      .getData(spreadsheet, results => setResults(results))
      .then(c => {
        cleanup = c;
      });
    return () => {
      cleanup?.();
    };
  }, [props.getData]);

  return results;
}

export default useReport;
