import React, { type ReactNode, createContext, useContext } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

type RolloverContextDefinition = {
  summaryCollapsed: boolean;
  onBudgetAction: (idx: string, action: string, arg?: unknown) => void;
  onToggleSummaryCollapse: () => void;
  currentMonth: string;
};

const Context = createContext<RolloverContextDefinition>({
  summaryCollapsed: false,
  onBudgetAction: () => {
    throw new Error('Unitialised context method called: onBudgetAction');
  },
  onToggleSummaryCollapse: () => {
    throw new Error(
      'Unitialised context method called: onToggleSummaryCollapse',
    );
  },
  currentMonth: 'unknown',
});

type RolloverProviderProps = Omit<RolloverContextDefinition, 'currentMonth'> & {
  children: ReactNode;
};
export function RolloverProvider({
  summaryCollapsed,
  onBudgetAction,
  onToggleSummaryCollapse,
  children,
}: RolloverProviderProps) {
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
