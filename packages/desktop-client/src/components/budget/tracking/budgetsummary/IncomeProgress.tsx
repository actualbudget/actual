import React, { useMemo } from 'react';

import { theme } from '@actual-app/components/theme';

import { useSheetValue } from '#hooks/useSheetValue';
import type { Binding, SheetFields } from '#spreadsheet';

import { fraction } from './fraction';
import { PieProgress } from './PieProgress';

type IncomeProgressProps = {
  current: Binding<'tracking-budget', SheetFields<'tracking-budget'>> | number;
  target: Binding<'tracking-budget', SheetFields<'tracking-budget'>> | number;
};
export function IncomeProgress({ current, target }: IncomeProgressProps) {
  const dummyBinding = useMemo(
    () =>
      ({ name: 'dummy' }) as unknown as Binding<
        'tracking-budget',
        SheetFields<'tracking-budget'>
      >,
    [],
  );
  const currentBound = useSheetValue(
    typeof current === 'number' ? dummyBinding : current,
  );
  const targetBound = useSheetValue(
    typeof target === 'number' ? dummyBinding : target,
  );

  let totalIncome = (typeof current === 'number' ? current : currentBound) || 0;
  const totalBudgeted =
    (typeof target === 'number' ? target : targetBound) || 0;

  let over = false;

  if (totalIncome < 0) {
    over = true;
    totalIncome = -totalIncome;
  }

  const frac = fraction(totalIncome, totalBudgeted);

  return (
    <PieProgress
      progress={frac}
      color={over ? theme.numberNegative : theme.numberPositive}
      backgroundColor={over ? theme.errorBackground : theme.budgetCurrentMonth}
      style={{ width: 20, height: 20 }}
    />
  );
}
