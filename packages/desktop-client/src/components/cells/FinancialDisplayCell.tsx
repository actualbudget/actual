import React, { type ComponentProps } from 'react';

import { type IntegerAmount } from 'loot-core/shared/util';

import { Cell } from '@desktop-client/components/table';
import { useFormat } from '@desktop-client/hooks/useFormat';

type FinancialDisplayCellProps = Omit<
  ComponentProps<typeof Cell>,
  'value' | 'formatter' | 'children' | 'exposed' | 'onExpose'
> & {
  value: IntegerAmount | null;
};

export function FinancialDisplayCell({
  value,
  textAlign = 'right',
  ...restCellProps
}: FinancialDisplayCellProps) {
  const format = useFormat();

  const displayValue = value == null ? '' : format(value, 'financial');

  return <Cell textAlign={textAlign} {...restCellProps} value={displayValue} />;
}
