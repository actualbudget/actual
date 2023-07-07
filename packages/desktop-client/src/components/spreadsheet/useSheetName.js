import { useContext } from 'react';

import NamespaceContext from './NamespaceContext';

function unresolveName(name) {
  let idx = name.indexOf('!');
  if (idx !== -1) {
    return {
      sheet: name.slice(0, idx),
      name: name.slice(idx + 1),
    };
  }
  return { sheet: null, name };
}

export default function useSheetName(binding) {
  if (!binding) {
    throw new Error('Sheet binding is required');
  }

  let { name: bindingName, value: bindingValue } = binding;

  if (global.IS_TESTING && typeof binding !== 'string' && !bindingName) {
    bindingName = bindingValue.toString();
  }

  bindingName = typeof binding === 'string' ? binding : bindingName;

  if (bindingName == null) {
    throw new Error('Binding name is now required');
  }

  // Get the current sheet name, and unresolve the binding name if
  // necessary (you might pass a fully resolved name like foo!name)
  let sheetName = useContext(NamespaceContext) || '__global';
  let unresolved = unresolveName(bindingName);
  if (unresolved.sheet) {
    sheetName = unresolved.sheet;
    bindingName = unresolved.name;
  }

  return {
    sheetName,
    bindingName,
    fullSheetName: `${sheetName}!${bindingName}`,
  };
}
