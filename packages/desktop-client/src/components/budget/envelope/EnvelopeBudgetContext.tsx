import React, { type ReactNode, createContext, useContext } from 'react';

import * as monthUtils from 'loot-core/shared/months';

type EnvelopeBudgetContextDefinition = {
  summaryCollapsed: boolean;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onToggleSummaryCollapse: () => void;
  currentMonth: string;
  setHoveredMonth: (month: string) => void;
  hoveredMonth: string;
};

const EnvelopeBudgetContext = createContext<EnvelopeBudgetContextDefinition>({
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
  hoveredMonth: 'unknown',
  setHoveredMonth: () => {
    throw new Error('Unitialised context method called: setHoveredMonth');
  },
});

type EnvelopeBudgetProviderProps = Omit<
  EnvelopeBudgetContextDefinition,
  'currentMonth'
> & {
  children: ReactNode;
};
export function EnvelopeBudgetProvider({
  summaryCollapsed,
  onBudgetAction,
  onToggleSummaryCollapse,
  children,
  hoveredMonth,
  setHoveredMonth,
}: EnvelopeBudgetProviderProps) {
  const currentMonth = monthUtils.currentMonth();

  return (
    <EnvelopeBudgetContext.Provider
      value={{
        currentMonth,
        summaryCollapsed,
        onBudgetAction,
        onToggleSummaryCollapse,
        hoveredMonth,
        setHoveredMonth,
      }}
    >
      {children}
    </EnvelopeBudgetContext.Provider>
  );
}

export function useEnvelopeBudget() {
  return useContext(EnvelopeBudgetContext);
}
