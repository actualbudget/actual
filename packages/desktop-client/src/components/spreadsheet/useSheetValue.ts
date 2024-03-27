// @ts-strict-ignore
import { useState, useRef, useLayoutEffect } from 'react';

import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';

import { useSheetName } from './useSheetName';

import { type Binding } from '.';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

export function useSheetValue(binding: Binding, onChange?: (result) => void) {
  const { sheetName, fullSheetName } = useSheetName(binding);

  const bindingObj =
    typeof binding === 'string' ? { name: binding, value: null } : binding;

  const spreadsheet = useSpreadsheet();
  const [result, setResult] = useState({
    name: fullSheetName,
    value: bindingObj.value === undefined ? null : bindingObj.value,
    query: bindingObj.query,
  });
  const latestOnChange = useRef(onChange);
  const latestValue = useRef(result.value);
  const excludeFutureTransactions = useFeatureFlag('excludeFutureTransactions');

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
  }, [sheetName, bindingObj.name, excludeFutureTransactions]);

  return result.value;
}
