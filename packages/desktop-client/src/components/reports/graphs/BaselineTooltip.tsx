import React from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import type {
  balanceTypeOpType,
  BaselineBreakdown,
} from '@actual-app/core/types/models';

import { FinancialText } from '#components/FinancialText';
import type { FormatType } from '#hooks/useFormat';

import { getSpendingSign } from './getSpendingSign';
import { TooltipCard } from './TooltipCard';

type BaselineTooltipLinesProps = {
  breakdown: BaselineBreakdown;
  balanceTypeOp: balanceTypeOpType;
  format: (value: unknown, type: FormatType) => string;
};

/**
 * What an amount offset against a baseline was built from, for chart tooltips.
 */
export function BaselineTooltipLines({
  breakdown,
  balanceTypeOp,
  format,
}: BaselineTooltipLinesProps) {
  const { t } = useTranslation();
  // Spending is shown as positive, like the bars it describes
  const sign = getSpendingSign(balanceTypeOp);
  const show = (value: number) => format(sign * value || 0, 'financial');

  // Intervals that haven't started only have a baseline to show
  if (breakdown.upcoming) {
    return (
      <AlignedText
        left={t('Baseline:')}
        right={
          <FinancialText>
            {show(breakdown.upcoming[balanceTypeOp])}
          </FinancialText>
        }
        style={{ fontWeight: 600 }}
      />
    );
  }

  const compared = breakdown.projected ?? breakdown.actual;
  const change = compared[balanceTypeOp] - breakdown.expected[balanceTypeOp];

  return (
    <>
      <AlignedText
        left={t('Baseline:')}
        right={
          <FinancialText>
            {show(breakdown.expected[balanceTypeOp])}
          </FinancialText>
        }
      />
      <AlignedText
        left={t('Current:')}
        right={
          <FinancialText>{show(breakdown.actual[balanceTypeOp])}</FinancialText>
        }
      />
      {breakdown.projected && (
        <AlignedText
          left={t('Projected:')}
          right={
            <FinancialText>
              {show(breakdown.projected[balanceTypeOp])}
            </FinancialText>
          }
        />
      )}
      <AlignedText
        left={t('Change:')}
        right={<FinancialText>{show(change)}</FinancialText>}
        style={{ fontWeight: 600 }}
      />
    </>
  );
}

type BaselineTooltipProps = BaselineTooltipLinesProps & {
  title: string;
};

/**
 * A whole tooltip for a single amount offset against a baseline.
 */
export function BaselineTooltip({ title, ...props }: BaselineTooltipProps) {
  return (
    <TooltipCard title={title}>
      <BaselineTooltipLines {...props} />
    </TooltipCard>
  );
}
