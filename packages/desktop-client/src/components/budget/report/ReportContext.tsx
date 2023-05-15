import React, { type ReactNode, createContext, useContext } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

let Context = createContext(null);

type ReportProviderProps = {
  summaryCollapsed: boolean;
  onBudgetAction: (idx: number, action: string, arg: unknown) => void;
  onToggleSummaryCollapse: () => void;
  children: ReactNode;
};
export function ReportProvider({
  summaryCollapsed,
  onBudgetAction,
  onToggleSummaryCollapse,
  children,
}: ReportProviderProps) {
  let currentMonth = monthUtils.currentMonth();

  return (
    <Context.Provider
      value={{
        currentMonth,
        summaryCollapsed,
        onBudgetAction,
        onToggleSummaryCollapse,
      }}
      children={children}
    />
  );
}

export function useReport() {
  return useContext(Context);
}
