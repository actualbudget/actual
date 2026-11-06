import React from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import type {
  balanceTypeOpType,
  ComparisonBreakdown,
} from '@actual-app/core/types/models';

import { FinancialText } from '#components/FinancialText';
import type { FormatType } from '#hooks/useFormat';

import { getSpendingSign } from './getSpendingSign';
import { TooltipCard } from './TooltipCard';
import { useFormatComparisonWindow } from './useFormatComparisonWindow';

type ComparisonTooltipLinesProps = {
  breakdown: ComparisonBreakdown;
  balanceTypeOp: balanceTypeOpType;
  format: (value: unknown, type: FormatType) => string;
  // With an offset comparison: the interval's past window
  comparisonStartDate?: string;
  comparisonEndDate?: string;
};

/**
 * What an amount offset against a comparison was built from, for chart tooltips.
 */
export function ComparisonTooltipLines({
  breakdown,
  balanceTypeOp,
  format,
  comparisonStartDate,
  comparisonEndDate,
}: ComparisonTooltipLinesProps) {
  const { t } = useTranslation();
  const formatComparisonWindow = useFormatComparisonWindow();
  // Spending is shown as positive, like the bars it describes
  const sign = getSpendingSign(balanceTypeOp);
  const show = (value: number) => format(sign * value || 0, 'financial');
  const comparisonLabel = breakdown.budgeted
    ? t('Budgeted:')
    : t('Comparison:');
  const comparisonWindow = formatComparisonWindow(
    comparisonStartDate,
    comparisonEndDate,
  );
  const windowLine = comparisonWindow && (
    <AlignedText left={t('Compared with:')} right={comparisonWindow} />
  );

  // A window before the earliest transaction has nothing to compare
  if (breakdown.noData) {
    return (
      <>
        {windowLine}
        <AlignedText left={comparisonLabel} right={t('No data')} />
        <AlignedText
          left={t('Current:')}
          right={
            <FinancialText>
              {show(breakdown.actual[balanceTypeOp])}
            </FinancialText>
          }
          style={{ fontWeight: 600 }}
        />
      </>
    );
  }

  // Intervals that haven't started only have a comparison to show
  if (breakdown.upcoming) {
    return (
      <>
        {windowLine}
        <AlignedText
          left={comparisonLabel}
          right={
            <FinancialText>
              {show(breakdown.upcoming[balanceTypeOp])}
            </FinancialText>
          }
          style={{ fontWeight: 600 }}
        />
      </>
    );
  }

  const compared = breakdown.projected ?? breakdown.actual;
  const change = compared[balanceTypeOp] - breakdown.expected[balanceTypeOp];

  return (
    <>
      {windowLine}
      <AlignedText
        left={comparisonLabel}
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

type ComparisonTooltipProps = ComparisonTooltipLinesProps & {
  title: string;
};

/**
 * A whole tooltip for a single amount offset against a comparison.
 */
export function ComparisonTooltip({ title, ...props }: ComparisonTooltipProps) {
  return (
    <TooltipCard title={title}>
      <ComparisonTooltipLines {...props} />
    </TooltipCard>
  );
}
