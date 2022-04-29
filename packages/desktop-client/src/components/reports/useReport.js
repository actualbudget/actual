import { useContext, useState, useEffect } from 'react';

import SpreadsheetContext from 'loot-design/src/components/spreadsheet/SpreadsheetContext';

function useReport(sheetName, getData) {
  const spreadsheet = useContext(SpreadsheetContext);
  const [results, setResults] = useState(null);

  useEffect(() => {
    let cleanup;
    getData(spreadsheet, results => setResults(results)).then(c => {
      cleanup = c;
    });
    return () => {
      cleanup && cleanup();
    };
  }, [getData]);

  return results;
}

export default useReport;
