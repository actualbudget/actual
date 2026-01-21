import React, {
  createContext,
  useContext,
  type PropsWithChildren,
} from 'react';

import {
  useSchedules,
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
  // Note: We don't memoize the context value here because arrays/Maps get new references
  // on each render. The useDeferredValue in PayeeIcons handles deferring updates to
  // prevent blocking touch scrolling.
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
