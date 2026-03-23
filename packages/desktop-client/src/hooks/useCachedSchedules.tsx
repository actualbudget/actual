import React, { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';

import { useSchedules } from './useSchedules';
import type { UseSchedulesProps, UseSchedulesResult } from './useSchedules';

type SchedulesContextValue = Pick<
  UseSchedulesResult,
  'data' | 'isLoading' | 'error'
>;

const SchedulesContext = createContext<SchedulesContextValue | null>(null);

type SchedulesProviderProps = PropsWithChildren<UseSchedulesProps>;

export function SchedulesProvider({
  children,
  ...props
}: SchedulesProviderProps) {
  const { isLoading, data, error } = useSchedules(props);

  return (
    <SchedulesContext.Provider value={{ data, isLoading, error }}>
      {children}
    </SchedulesContext.Provider>
  );
}

export function useCachedSchedules() {
  const context = useContext(SchedulesContext);
  if (!context) {
    throw new Error(
      'useCachedSchedules must be used within a SchedulesProvider',
    );
  }
  return context;
}
