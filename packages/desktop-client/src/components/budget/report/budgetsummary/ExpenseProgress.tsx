import React, { type ComponentProps } from 'react';

import { theme } from '../../../../style';
import { type CellValue } from '../../../spreadsheet/CellValue';
import { useSheetValue } from '../../../spreadsheet/useSheetValue';

import { fraction } from './fraction';
import { PieProgress } from './PieProgress';

type ExpenseProgressProps = {
  current: ComponentProps<typeof CellValue>['binding'];
  target: ComponentProps<typeof CellValue>['binding'];
};
export function ExpenseProgress({ current, target }: ExpenseProgressProps) {
  let totalSpent = useSheetValue(current) || 0;
  const totalBudgeted = useSheetValue(target) || 0;

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
      color={over ? theme.errorText : theme.noticeTextLight}
      backgroundColor={over ? theme.errorBackground : theme.tableBackground}
      style={{ width: 20, height: 20 }}
    />
  );
}
