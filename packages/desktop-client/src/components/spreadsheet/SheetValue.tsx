import {
  useContext,
  useState,
  useRef,
  useLayoutEffect,
  type ReactNode,
} from 'react';

import { useSpreadsheet } from 'loot-core/src/client/SpreadsheetProvider';

import NamespaceContext from './NamespaceContext';

type Binding = { name: string; value; query?: unknown };

type SheetValueProps = {
  binding: string | Binding;
  initialValue?;
  children?: (result: Binding, setCell: () => void) => ReactNode;
  onChange?;
};
// !! Do not use this!! This is deprecated. Use the `useSheetValue`
// hook instead. The reason this hasn't been refactored on top of it
// is because the hook only exposes the value, not the node. It also
// doesn't provide a setter function. In the future there will be
// separate hooks for those things.
export default function SheetValue({
  binding,
  initialValue,
  children,
  onChange,
}: SheetValueProps) {
  if (!binding) {
    throw new Error('SheetValue binding is required');
  }

  if (global.IS_TESTING && typeof binding !== 'string' && !binding.name) {
    binding = { ...binding, name: binding.value.toString() };
  }

  const bindingObj =
    typeof binding === 'string' ? { name: binding, value: null } : binding;

  if (bindingObj.name == null) {
    throw new Error('Binding name is now required');
  }

  let spreadsheet = useSpreadsheet();
  let sheetName = useContext(NamespaceContext) || '__global';
  let [result, setResult] = useState({
    name: sheetName + '!' + bindingObj.name,
    value: initialValue != null ? initialValue : bindingObj.value,
    query: bindingObj.query,
  });
  let latestOnChange = useRef(onChange);
  let latestValue = useRef(result.value);

  /** @deprecated */
  function setCell() {
    throw new Error('setCell is not implemented anymore');
  }

  useLayoutEffect(() => {
    latestOnChange.current = onChange;
    latestValue.current = result.value;
  });

  useLayoutEffect(() => {
    if (bindingObj.query) {
      spreadsheet.createQuery(sheetName, bindingObj.name, bindingObj.query);
    }

    return spreadsheet.bind(sheetName, bindingObj, null, newResult => {
      if (latestOnChange.current) {
        latestOnChange.current(newResult);
      }

      if (newResult.value !== latestValue.current) {
        setResult(newResult);
      }
    });
  }, [sheetName, bindingObj.name]);

  return result.value != null ? <>{children(result, setCell)}</> : null;
}
