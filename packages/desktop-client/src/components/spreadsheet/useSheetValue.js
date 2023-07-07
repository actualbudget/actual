import { useState, useRef, useLayoutEffect } from 'react';

import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';

import useSheetName from './useSheetName';

export default function useSheetValue(binding, onChange) {
  if (!binding) {
    throw new Error('Binding is required');
  }

  let { sheetName, fullSheetName } = useSheetName(binding);

  let spreadsheet = useSpreadsheet();
  let [result, setResult] = useState({
    name: fullSheetName,
    value: binding.value === undefined ? null : binding.value,
    query: binding.query,
  });
  let latestOnChange = useRef(onChange);
  let latestValue = useRef(result.value);

  useLayoutEffect(() => {
    latestOnChange.current = onChange;
    latestValue.current = result.value;
  });

  useLayoutEffect(() => {
    if (binding.query) {
      spreadsheet.createQuery(sheetName, binding.name, binding.query);
    }

    return spreadsheet.bind(sheetName, binding, null, newResult => {
      if (latestOnChange.current) {
        latestOnChange.current(newResult);
      }

      if (newResult.value !== latestValue.current) {
        setResult(newResult);
      }
    });
  }, [sheetName, binding.name]);

  return result.value;
}
