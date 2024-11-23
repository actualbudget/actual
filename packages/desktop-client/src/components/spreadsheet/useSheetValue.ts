import { useState, useRef, useLayoutEffect, useMemo } from 'react';

import { type Query } from 'loot-core/shared/query';
import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';

import { useSheetName } from './useSheetName';

import {
  type Spreadsheets,
  type SheetFields,
  type SheetNames,
  type Binding,
} from '.';

type SheetValueResult<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
> = {
  name: string;
  value: Spreadsheets[SheetName][FieldName] | null;
  query?: Query;
};

export function useSheetValue<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>(
  binding: Binding<SheetName, FieldName>,
  onChange?: (result: SheetValueResult<SheetName, FieldName>) => void,
): SheetValueResult<SheetName, FieldName>['value'] {
  const { sheetName, fullSheetName } = useSheetName(binding);

  const bindingObj = useMemo(
    () =>
      typeof binding === 'string'
        ? { name: binding, value: null, query: undefined }
        : binding,
    [],
  );

  const spreadsheet = useSpreadsheet();
  const [result, setResult] = useState<SheetValueResult<SheetName, FieldName>>({
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

    return spreadsheet.bind(
      sheetName,
      binding,
      null,
      (newResult: SheetValueResult<SheetName, FieldName>) => {
        if (latestOnChange.current) {
          latestOnChange.current(newResult);
        }

        if (newResult.value !== latestValue.current) {
          setResult(newResult);
        }
      },
    );
  }, [sheetName, bindingObj.name, bindingObj.query]);

  return result.value;
}
