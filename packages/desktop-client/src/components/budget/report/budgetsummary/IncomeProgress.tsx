import React, { type ComponentProps } from 'react';

import { theme } from '../../../../style';
import type CellValue from '../../../spreadsheet/CellValue';
import useSheetValue from '../../../spreadsheet/useSheetValue';

import fraction from './fraction';
import PieProgress from './PieProgress';

type IncomeProgressProps = {
  current: ComponentProps<typeof CellValue>['binding'];
  target: ComponentProps<typeof CellValue>['binding'];
};
export default function IncomeProgress({
  current,
  target,
}: IncomeProgressProps) {
  let totalIncome = useSheetValue(current) || 0;
  let totalBudgeted = useSheetValue(target) || 0;

  let over = false;

  if (totalIncome < 0) {
    over = true;
    totalIncome = -totalIncome;
  }

  let frac = fraction(totalIncome, totalBudgeted);

  return (
    <PieProgress
      progress={frac}
      color={over ? theme.errorText : theme.noticeTextLight}
      backgroundColor={over ? theme.errorBackground : theme.pageBackground}
      style={{ width: 20, height: 20 }}
    />
  );
}
