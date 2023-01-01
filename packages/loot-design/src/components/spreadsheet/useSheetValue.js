import { useContext, useState, useRef, useLayoutEffect } from 'react';

import NamespaceContext from './NamespaceContext.js';
import SpreadsheetContext from './SpreadsheetContext';

function unresolveName(name) {
  let idx = name.indexOf('!');
  if (idx !== -1) {
    return {
      sheet: name.slice(0, idx),
      name: name.slice(idx + 1)
    };
  }
  return { sheet: null, name };
}

export default function useSheetValue(binding, onChange) {
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

  // Get the current sheet name, and unresolve the binding name if
  // necessary (you might pass a fully resolve name like foo!name)
  let sheetName = useContext(NamespaceContext) || '__global';
  let unresolved = unresolveName(binding.name);
  if (unresolved.sheet) {
    sheetName = unresolved.sheet;
    binding = { ...binding, name: unresolved.name };
  }

  let spreadsheet = useContext(SpreadsheetContext);
  let [result, setResult] = useState({
    name: sheetName + '!' + binding.name,
    value: binding.value === undefined ? null : binding.value,
    query: binding.query
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
