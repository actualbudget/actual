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

type SchedulesProviderProps = PropsWithChildren<UseSchedulesProps>;

export function SchedulesProvider({
  children,
  ...props
}: SchedulesProviderProps) {
  const data = useSchedules(props);
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
