// @ts-strict-ignore
import { useState, useRef, useLayoutEffect } from 'react';

import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';

import { useSheetName } from './useSheetName';

import {
  type Spreadsheets,
  type SheetFields,
  type SheetNames,
  type Binding,
} from '.';

export function useSheetValue<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>(
  binding: Binding<SheetName, FieldName>,
  onChange?: (result) => void,
): Spreadsheets[SheetName][FieldName] {
  const { sheetName, fullSheetName } = useSheetName(binding);

  const bindingObj =
    typeof binding === 'string'
      ? { name: binding, value: null, query: undefined }
      : binding;

  const spreadsheet = useSpreadsheet();
  const [result, setResult] = useState({
    name: fullSheetName,
    value: bindingObj.value === undefined ? null : bindingObj.value,
    query: bindingObj.query,
  });
  const latestOnChange = useRef(onChange);
  latestOnChange.current = onChange;

  const latestValue = useRef(result.value);
  latestValue.current = result.value;

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
  }, [spreadsheet, sheetName, bindingObj.name, bindingObj.query]);

  return result.value;
}
