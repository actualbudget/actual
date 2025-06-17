// @ts-strict-ignore
import { createContext, type PropsWithChildren, useContext } from 'react';

import {
  type SheetNames,
  type SheetFields,
  type Binding,
} from '@desktop-client/spreadsheet';

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

const SheetNameContext = createContext<string | undefined>(undefined);

type SheetNameProviderProps = PropsWithChildren<{ name: string }>;

export function SheetNameProvider({ children, name }: SheetNameProviderProps) {
  return (
    <SheetNameContext.Provider value={name}>
      {children}
    </SheetNameContext.Provider>
  );
}

export function useSheetName<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>(binding: Binding<SheetName, FieldName>) {
  if (!binding) {
    throw new Error('Sheet binding is required');
  }

  const isStringBinding = typeof binding === 'string';

  let bindingName: string = isStringBinding ? binding : binding.name;

  if (global.IS_TESTING && !isStringBinding && !bindingName) {
    bindingName = binding.value.toString();
  }

  if (bindingName == null) {
    throw new Error('Binding name is now required');
  }

  // Get the current sheet name, and unresolve the binding name if
  // necessary (you might pass a fully resolved name like foo!name)
  let sheetName = useContext(SheetNameContext) || '__global';
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
