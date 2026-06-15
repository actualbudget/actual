import React, { useMemo } from 'react';

import { theme } from '@actual-app/components/theme';

import { useTrackingSheetValue } from '#components/budget/tracking/TrackingBudgetComponents';
import type { Binding, SheetFields } from '#spreadsheet';

import { fraction } from './fraction';
import { PieProgress } from './PieProgress';

type ExpenseProgressProps = {
  current: Binding<'tracking-budget', SheetFields<'tracking-budget'>> | number;
  target: Binding<'tracking-budget', SheetFields<'tracking-budget'>> | number;
};
export function ExpenseProgress({ current, target }: ExpenseProgressProps) {
  const dummyBinding = useMemo(
    () =>
      ({ name: 'dummy' }) as unknown as Binding<
        'tracking-budget',
        SheetFields<'tracking-budget'>
      >,
    [],
  );
  const currentBound = useTrackingSheetValue(
    typeof current === 'number' ? dummyBinding : current,
  );
  const targetBound = useTrackingSheetValue(
    typeof target === 'number' ? dummyBinding : target,
  );

  let totalSpent = (typeof current === 'number' ? current : currentBound) || 0;
  const totalBudgeted =
    (typeof target === 'number' ? target : targetBound) || 0;

  // Reverse total spent, and also set a bottom boundary of 0 (in case
  // income goes into an expense category and it's "positive", don't
  // show that in the graph)
  totalSpent = Math.max(-totalSpent, 0);

  let frac;
  let over = false;

  if (totalSpent > totalBudgeted) {
    frac = (totalSpent - totalBudgeted) / totalBudgeted;
    over = true;
  } else {
    frac = fraction(totalSpent, totalBudgeted);
  }

  return (
    <PieProgress
      progress={frac}
      color={over ? theme.numberNegative : theme.numberPositive}
      backgroundColor={over ? theme.errorBackground : theme.budgetCurrentMonth}
      style={{ width: 20, height: 20 }}
    />
  );
}
