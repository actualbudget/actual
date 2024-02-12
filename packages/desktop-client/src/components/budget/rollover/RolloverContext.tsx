// @ts-strict-ignore
import React, { type ReactNode, createContext, useContext } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

const Context = createContext(null);

type RolloverContextProps = {
  summaryCollapsed: boolean;
  onBudgetAction: (idx: number, action: string, arg?: unknown) => void;
  onToggleSummaryCollapse: () => void;
  children: ReactNode;
};
export function RolloverContext({
  summaryCollapsed,
  onBudgetAction,
  onToggleSummaryCollapse,
  children,
}: RolloverContextProps) {
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

export function useRollover() {
  return useContext(Context);
}
