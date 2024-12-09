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
    [binding],
  );

  const spreadsheet = useSpreadsheet();
  const [result, setResult] = useState<SheetValueResult<SheetName, FieldName>>({
    name: fullSheetName,
    value: bindingObj.value ? bindingObj.value : null,
    query: bindingObj.query,
  });
  const latestOnChange = useRef(onChange);
  latestOnChange.current = onChange;

  const latestValue = useRef(result.value);
  latestValue.current = result.value;

  useLayoutEffect(() => {
    let isMounted = true;

    const unbind = spreadsheet.bind(
      sheetName,
      bindingObj,
      (newResult: SheetValueResult<SheetName, FieldName>) => {
        if (!isMounted) {
          return;
        }

        if (latestOnChange.current) {
          latestOnChange.current(newResult);
        }

        if (newResult.value !== latestValue.current) {
          setResult(newResult);
        }
      },
    );

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
