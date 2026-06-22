import React from 'react';

import { theme } from '@actual-app/components/theme';

import { useTrackingSheetValue } from '#components/budget/tracking/TrackingBudgetComponents';
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
  const value = useTrackingSheetValue(binding);
  return children(value || 0);
}

type ExpenseProgressProps = {
  current: Binding<'tracking-budget', SheetFields<'tracking-budget'>> | number;
  target: Binding<'tracking-budget', SheetFields<'tracking-budget'>> | number;
};

function ExpenseProgressLogic({
  currentNum,
  targetNum,
}: {
  currentNum: number;
  targetNum: number;
}) {
  let totalSpent = Math.max(-currentNum, 0);

  let frac;
  let over = false;

  if (totalSpent > targetNum) {
    frac = (totalSpent - targetNum) / targetNum;
    over = true;
  } else {
    frac = fraction(totalSpent, targetNum);
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

export function ExpenseProgress({ current, target }: ExpenseProgressProps) {
  if (typeof current === 'number') {
    if (typeof target === 'number') {
      return <ExpenseProgressLogic currentNum={current} targetNum={target} />;
    } else {
      return (
        <BoundValue binding={target}>
          {t => <ExpenseProgressLogic currentNum={current} targetNum={t} />}
        </BoundValue>
      );
    }
  } else {
    if (typeof target === 'number') {
      return (
        <BoundValue binding={current}>
          {c => <ExpenseProgressLogic currentNum={c} targetNum={target} />}
        </BoundValue>
      );
    } else {
      return (
        <BoundValue binding={current}>
          {c => (
            <BoundValue binding={target}>
              {t => <ExpenseProgressLogic currentNum={c} targetNum={t} />}
            </BoundValue>
          )}
        </BoundValue>
      );
    }
  }
}
