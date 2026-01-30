import React, { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';

import { useSchedules } from './useSchedules';
import type { UseSchedulesProps, UseSchedulesResult } from './useSchedules';

type SchedulesContextValue = UseSchedulesResult;

const SchedulesContext = createContext<SchedulesContextValue | undefined>(
  undefined,
);

type SchedulesProviderProps = PropsWithChildren<{
  query?: UseSchedulesProps['query'];
}>;

export function SchedulesProvider({ query, children }: SchedulesProviderProps) {
  const data = useSchedules({ query });
  return (
    <SchedulesContext.Provider value={data}>
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
