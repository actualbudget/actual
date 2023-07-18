import { useState, useRef, useLayoutEffect } from 'react';

import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';

import useSheetName from './useSheetName';

import { type Binding } from '.';

export default function useSheetValue(
  binding: Binding,
  onChange?: (result) => void,
) {
  let { sheetName, fullSheetName } = useSheetName(binding);

  const bindingObj =
    typeof binding === 'string' ? { name: binding, value: null } : binding;

  let spreadsheet = useSpreadsheet();
  let [result, setResult] = useState({
    name: fullSheetName,
    value: bindingObj.value === undefined ? null : bindingObj.value,
    query: bindingObj.query,
  });
  let latestOnChange = useRef(onChange);
  let latestValue = useRef(result.value);

  useLayoutEffect(() => {
    latestOnChange.current = onChange;
    latestValue.current = result.value;
  });

  useLayoutEffect(() => {
    if (bindingObj.query) {
      spreadsheet.createQuery(sheetName, bindingObj.name, bindingObj.query);
    }

    return spreadsheet.bind(sheetName, binding, null, newResult => {
      if (latestOnChange.current) {
        latestOnChange.current(newResult);
      }

      if (newResult.value !== latestValue.current) {
        setResult(newResult);
      }
    });
  }, [sheetName, bindingObj.name]);

  return result.value;
}
