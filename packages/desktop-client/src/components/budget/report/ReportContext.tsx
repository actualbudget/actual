// @ts-strict-ignore
import React, { type ReactNode, createContext, useContext } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

const Context = createContext(null);

type ReportProviderProps = {
  summaryCollapsed: boolean;
  onBudgetAction: (month: string, action: string, arg: unknown) => void;
  onToggleSummaryCollapse: () => void;
  children: ReactNode;
};
export function ReportProvider({
  summaryCollapsed,
  onBudgetAction,
  onToggleSummaryCollapse,
  children,
}: ReportProviderProps) {
  const currentMonth = monthUtils.currentMonth();

  return (
    <Context.Provider
      value={{
        currentMonth,
        summaryCollapsed,
        onBudgetAction,
        onToggleSummaryCollapse,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useReport() {
  return useContext(Context);
}
