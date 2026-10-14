import React from 'react';

import { FinancialText } from '#components/FinancialText';
import type { FormatType } from '#hooks/useFormat';

import { formatChange } from './formatChange';
import { getChangeColor } from './getChangeColor';

export type SeriesRow = {
  key: string;
  name: string;
  color: string;
  value: number;
  // How the amount compares with the baseline, when there is one
  change?: number;
};

type SeriesTooltipRowProps = {
  row: SeriesRow;
  isHovered: boolean;
  format: (value: unknown, type: FormatType) => string;
};

/**
 * One series' cells in a series tooltip's grid.
 */
export function SeriesTooltipRow({
  row,
  isHovered,
  format,
}: SeriesTooltipRowProps) {
  const textDecoration = isHovered ? 'underline' : 'inherit';

  return (
    <>
      <span style={{ color: row.color, textDecoration }}>{row.name}</span>
      <FinancialText
        style={{ color: row.color, textAlign: 'right', textDecoration }}
      >
        {format(row.value, 'financial')}
      </FinancialText>
      {row.change !== undefined && (
        <FinancialText
          style={{ textAlign: 'right', color: getChangeColor(row.change) }}
        >
          {formatChange(row.change, format)}
        </FinancialText>
      )}
    </>
  );
}
