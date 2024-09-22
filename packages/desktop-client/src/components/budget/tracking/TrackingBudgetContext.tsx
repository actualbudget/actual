// @ts-strict-ignore
import React, { type ReactNode, createContext, useContext } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

const Context = createContext(null);

type TrackingBudgetProviderProps = {
  summaryCollapsed: boolean;
  onBudgetAction: (month: string, action: string, arg: unknown) => void;
  onToggleSummaryCollapse: () => void;
  children: ReactNode;
};
export function TrackingBudgetProvider({
  summaryCollapsed,
  onBudgetAction,
  onToggleSummaryCollapse,
  children,
}: TrackingBudgetProviderProps) {
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

export function useTrackingBudget() {
  return useContext(Context);
}
