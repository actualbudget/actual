import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import * as monthUtils from 'loot-core/shared/months';

type TrackingBudgetContextDefinition = {
  summaryCollapsed: boolean;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onToggleSummaryCollapse: () => void;
  currentMonth: string;
};

const TrackingBudgetContext = createContext<TrackingBudgetContextDefinition>({
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

type TrackingBudgetProviderProps = Omit<
  TrackingBudgetContextDefinition,
  'currentMonth'
> & {
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
    <TrackingBudgetContext.Provider
      value={{
        currentMonth,
        summaryCollapsed,
        onBudgetAction,
        onToggleSummaryCollapse,
      }}
    >
      {children}
    </TrackingBudgetContext.Provider>
  );
}

export function useTrackingBudget() {
  return useContext(TrackingBudgetContext);
}
