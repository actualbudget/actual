import { useState, useEffect } from 'react';

import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';

function useReport(sheetName, getData) {
  const spreadsheet = useSpreadsheet();
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
