import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import * as monthUtils from '@actual-app/core/shared/months';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { useForecastScheduledTransactions } from '#hooks/useForecastScheduledTransactions';

type EnvelopeBudgetContextDefinition = {
  summaryCollapsed: boolean;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onToggleSummaryCollapse: () => void;
  currentMonth: string;
  forecastTransactionsByCategoryAndMonth: Map<string, TransactionEntity[]>;
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
  forecastTransactionsByCategoryAndMonth: new Map(),
});

type EnvelopeBudgetProviderProps = Omit<
  EnvelopeBudgetContextDefinition,
  'currentMonth' | 'forecastTransactionsByCategoryAndMonth'
> & {
  children: ReactNode;
};
export function EnvelopeBudgetProvider({
  summaryCollapsed,
  onBudgetAction,
  onToggleSummaryCollapse,
  children,
}: EnvelopeBudgetProviderProps) {
  const currentMonth = monthUtils.currentMonth();
  const { forecastTransactionsByCategoryAndMonth } =
    useForecastScheduledTransactions();

  return (
    <EnvelopeBudgetContext.Provider
      value={{
        currentMonth,
        summaryCollapsed,
        onBudgetAction,
        onToggleSummaryCollapse,
        forecastTransactionsByCategoryAndMonth,
      }}
    >
      {children}
    </EnvelopeBudgetContext.Provider>
  );
}

export function useEnvelopeBudget() {
  return useContext(EnvelopeBudgetContext);
}
