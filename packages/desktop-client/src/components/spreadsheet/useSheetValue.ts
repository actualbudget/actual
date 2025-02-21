import { useState, useRef, useLayoutEffect, useMemo } from 'react';

import { useSpreadsheet } from 'loot-core/client/SpreadsheetProvider';

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
    [binding],
  );

  const spreadsheet = useSpreadsheet();
  const [result, setResult] = useState<SheetValueResult<SheetName, FieldName>>({
    name: fullSheetName,
    value: bindingObj.value ? bindingObj.value : null,
  });
  const latestOnChange = useRef(onChange);
  latestOnChange.current = onChange;

  const latestValue = useRef(result.value);
  latestValue.current = result.value;

  useLayoutEffect(() => {
    let isMounted = true;

    const unbind = spreadsheet.bind(sheetName, bindingObj, newResult => {
      if (!isMounted) {
        return;
      }

      const newCastedResult = {
        name: newResult.name,
        // TODO: Spreadsheets, SheetNames, SheetFields, etc must be moved to the loot-core package
        value: newResult.value as Spreadsheets[SheetName][FieldName],
      };

      if (latestOnChange.current) {
        latestOnChange.current(newCastedResult);
      }

      if (newResult.value !== latestValue.current) {
        setResult(newCastedResult);
      }
    });

    return () => {
      isMounted = false;
      unbind();
    };
  }, [
    spreadsheet,
    sheetName,
    bindingObj.name,
    bindingObj.query?.serializeAsString(),
  ]);

  return result.value;
}
