import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type { ReactNode } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { useForecastScheduledTransactions } from '#hooks/useForecastScheduledTransactions';

type EnvelopeBudgetContextDefinition = {
  summaryCollapsed: boolean;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onToggleSummaryCollapse: () => void;
  currentMonth: string;
  forecastTransactionsByCategoryAndMonth: Map<string, TransactionEntity[]>;
  totalScheduledIncomeForCurrentMonth: number;
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
  totalScheduledIncomeForCurrentMonth: 0,
});

type EnvelopeBudgetProviderProps = Omit<
  EnvelopeBudgetContextDefinition,
  | 'currentMonth'
  | 'forecastTransactionsByCategoryAndMonth'
  | 'totalScheduledIncomeForCurrentMonth'
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

  const prevMapRef = useRef<Map<string, TransactionEntity[]>>(new Map());

  useEffect(() => {
    const prevMap = prevMapRef.current;
    const newMap = forecastTransactionsByCategoryAndMonth;
    prevMapRef.current = newMap;

    const categoryAmounts: Array<{
      categoryId: string;
      month: string;
      amount: number;
    }> = [];
    const incomeByMonth = new Map<string, number>();

    for (const [key, txs] of newMap.entries()) {
      const month = key.slice(-7);
      const categoryId = key.slice(0, -8);

      const expenseTotal = txs.reduce(
        (sum, tx) => sum + Math.min(0, tx.amount ?? 0),
        0,
      );
      const incomeTotal = txs.reduce(
        (sum, tx) => sum + Math.max(0, tx.amount ?? 0),
        0,
      );

      if (expenseTotal !== 0) {
        categoryAmounts.push({ categoryId, month, amount: expenseTotal });
      }
      if (incomeTotal !== 0) {
        incomeByMonth.set(month, (incomeByMonth.get(month) ?? 0) + incomeTotal);
      }
    }

    // Clear entries that were in the previous map but are no longer present
    for (const [key, prevTxs] of prevMap.entries()) {
      if (!newMap.has(key)) {
        const month = key.slice(-7);
        const categoryId = key.slice(0, -8);
        const wasExpense = prevTxs.some(tx => (tx.amount ?? 0) < 0);
        if (wasExpense) {
          categoryAmounts.push({ categoryId, month, amount: 0 });
        } else if (!incomeByMonth.has(month)) {
          incomeByMonth.set(month, 0);
        }
      }
    }

    const incomeAmounts = Array.from(incomeByMonth.entries()).map(
      ([month, amount]) => ({ month, amount }),
    );

    void send('budget/set-scheduled-amounts', {
      categoryAmounts,
      incomeAmounts,
    });
  }, [forecastTransactionsByCategoryAndMonth]);

  const totalScheduledIncomeForCurrentMonth = useMemo(() => {
    const monthSuffix = `-${currentMonth}`;
    let total = 0;
    for (const [key, txs] of forecastTransactionsByCategoryAndMonth.entries()) {
      if (!key.endsWith(monthSuffix)) continue;
      for (const tx of txs) {
        if ((tx.amount ?? 0) > 0) {
          total += tx.amount ?? 0;
        }
      }
    }
    return total;
  }, [forecastTransactionsByCategoryAndMonth, currentMonth]);

  return (
    <EnvelopeBudgetContext.Provider
      value={{
        currentMonth,
        summaryCollapsed,
        onBudgetAction,
        onToggleSummaryCollapse,
        forecastTransactionsByCategoryAndMonth,
        totalScheduledIncomeForCurrentMonth,
      }}
    >
      {children}
    </EnvelopeBudgetContext.Provider>
  );
}

export function useEnvelopeBudget() {
  return useContext(EnvelopeBudgetContext);
}
