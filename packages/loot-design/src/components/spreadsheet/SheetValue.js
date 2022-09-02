import { useContext, useState, useRef, useLayoutEffect } from 'react';

import NamespaceContext from './NamespaceContext.js';
import SpreadsheetContext from './SpreadsheetContext';

// !! Do not use this!! This is deprecated. Use the `useSheetValue`
// hook instead. The reason this hasn't been refactored on top of it
// is because the hook only exposes the value, not the node. It also
// doesn't provide a setter function. In the future there will be
// separate hooks for those things.
export default function SheetValue({
  binding,
  initialValue,
  children,
  onChange
}) {
  if (!binding) {
    throw new Error('SheetValue binding is required');
  }

  if (global.IS_TESTING && typeof binding !== 'string' && !binding.name) {
    binding = { ...binding, name: binding.value.toString() };
  }

  binding =
    typeof binding === 'string' ? { name: binding, value: null } : binding;

  if (binding.name == null) {
    throw new Error('Binding name is now required');
  }

  let spreadsheet = useContext(SpreadsheetContext);
  let sheetName = useContext(NamespaceContext) || '__global';
  let [result, setResult] = useState({
    name: sheetName + '!' + binding.name,
    value: initialValue != null ? initialValue : binding.value,
    query: binding.query
  });
  let latestOnChange = useRef(onChange);
  let latestValue = useRef(result.value);

  function setCell() {
    throw new Error('setCell is not implemented anymore');
  }

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

  return result.value != null ? children(result, setCell) : null;
}
