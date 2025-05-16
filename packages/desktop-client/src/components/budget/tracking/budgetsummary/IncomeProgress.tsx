import React, { type ComponentProps } from 'react';

import { theme } from '@actual-app/components/theme';

import { fraction } from './fraction';
import { PieProgress } from './PieProgress';

import { type CellValue } from '@desktop-client/components/spreadsheet/CellValue';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';

type IncomeProgressProps = {
  current: ComponentProps<typeof CellValue>['binding'];
  target: ComponentProps<typeof CellValue>['binding'];
};
export function IncomeProgress({ current, target }: IncomeProgressProps) {
  let totalIncome = useSheetValue(current) || 0;
  const totalBudgeted = useSheetValue(target) || 0;

  let over = false;

  if (totalIncome < 0) {
    over = true;
    totalIncome = -totalIncome;
  }

  const frac = fraction(totalIncome, totalBudgeted);

  return (
    <PieProgress
      progress={frac}
      color={over ? theme.errorText : theme.noticeTextLight}
      backgroundColor={over ? theme.errorBackground : theme.tableBackground}
      style={{ width: 20, height: 20 }}
    />
  );
}
