import React, {
  createContext,
  type PropsWithChildren,
  useContext,
} from 'react';

import {
  type UseSchedulesResult,
  type UseSchedulesProps,
  useSchedules,
} from './useSchedules';

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
