import React from 'react';

import { theme } from '@actual-app/components/theme';

import { useSheetValue } from '#hooks/useSheetValue';
import type { Binding, SheetFields } from '#spreadsheet';

import { fraction } from './fraction';
import { PieProgress } from './PieProgress';

function BoundValue({
  binding,
  children,
}: {
  binding: Binding<'tracking-budget', SheetFields<'tracking-budget'>>;
  children: (value: number) => React.JSX.Element;
}) {
  const value = useSheetValue(binding);
  return children(value || 0);
}

type IncomeProgressProps = {
  current: Binding<'tracking-budget', SheetFields<'tracking-budget'>> | number;
  target: Binding<'tracking-budget', SheetFields<'tracking-budget'>> | number;
};

function IncomeProgressLogic({
  currentNum,
  targetNum,
}: {
  currentNum: number;
  targetNum: number;
}) {
  let totalIncome = currentNum;
  const totalBudgeted = targetNum;

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

export function IncomeProgress({ current, target }: IncomeProgressProps) {
  if (typeof current === 'number') {
    if (typeof target === 'number') {
      return <IncomeProgressLogic currentNum={current} targetNum={target} />;
    } else {
      return (
        <BoundValue binding={target}>
          {t => <IncomeProgressLogic currentNum={current} targetNum={t} />}
        </BoundValue>
      );
    }
  } else {
    if (typeof target === 'number') {
      return (
        <BoundValue binding={current}>
          {c => <IncomeProgressLogic currentNum={c} targetNum={target} />}
        </BoundValue>
      );
    } else {
      return (
        <BoundValue binding={current}>
          {c => (
            <BoundValue binding={target}>
              {t => <IncomeProgressLogic currentNum={c} targetNum={t} />}
            </BoundValue>
          )}
        </BoundValue>
      );
    }
  }
}
