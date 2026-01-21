import React, {
  createContext,
  useContext,
  type PropsWithChildren,
} from 'react';

import {
  useSchedules,
  useSchedulesOptimized,
  type UseSchedulesProps,
  type UseSchedulesResult,
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

type SchedulesProviderOptimizedProps = PropsWithChildren<{
  accountId?: string;
}>;

/**
 * Optimized schedules provider that uses direct API calls
 * instead of AQL liveQuery for better performance.
 */
export function SchedulesProviderOptimized({
  accountId,
  children,
}: SchedulesProviderOptimizedProps) {
  const data = useSchedulesOptimized({ accountId });
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
