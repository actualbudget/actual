import { createContext, useContext } from 'react';

export const ReorderModeContext = createContext(false);

export function useReorderMode() {
  return useContext(ReorderModeContext);
}
