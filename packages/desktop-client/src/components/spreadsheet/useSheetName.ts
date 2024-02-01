// @ts-strict-ignore
import { useContext } from 'react';

import { NamespaceContext } from './NamespaceContext';

import { type Binding } from '.';

function unresolveName(name) {
  const idx = name.indexOf('!');
  if (idx !== -1) {
    return {
      sheet: name.slice(0, idx),
      name: name.slice(idx + 1),
    };
  }
  return { sheet: null, name };
}

export function useSheetName(binding: Binding) {
  if (!binding) {
    throw new Error('Sheet binding is required');
  }

  const isStringBinding = typeof binding === 'string';

  let bindingName = isStringBinding ? binding : binding.name;

  if (global.IS_TESTING && !isStringBinding && !bindingName) {
    bindingName = binding.value.toString();
  }

  if (bindingName == null) {
    throw new Error('Binding name is now required');
  }

  // Get the current sheet name, and unresolve the binding name if
  // necessary (you might pass a fully resolved name like foo!name)
  let sheetName = useContext(NamespaceContext) || '__global';
  const unresolved = unresolveName(bindingName);
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
