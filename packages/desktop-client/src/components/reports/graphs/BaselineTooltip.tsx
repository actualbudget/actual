import React from 'react';
import { useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { theme } from '@actual-app/components/theme';
import type {
  balanceTypeOpType,
  BaselineBreakdown,
} from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { FinancialText } from '#components/FinancialText';
import type { FormatType } from '#hooks/useFormat';

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
  const compared = breakdown.projected ?? breakdown.actual;
  const change = compared[balanceTypeOp] - breakdown.expected[balanceTypeOp];

  return (
    <>
      <AlignedText
        left={t('Baseline:')}
        right={
          <FinancialText>
            {format(breakdown.expected[balanceTypeOp], 'financial')}
          </FinancialText>
        }
      />
      <AlignedText
        left={t('Current:')}
        right={
          <FinancialText>
            {format(breakdown.actual[balanceTypeOp], 'financial')}
          </FinancialText>
        }
      />
      {breakdown.projected && (
        <AlignedText
          left={t('Projected:')}
          right={
            <FinancialText>
              {format(breakdown.projected[balanceTypeOp], 'financial')}
            </FinancialText>
          }
        />
      )}
      <AlignedText
        left={t('Change:')}
        right={<FinancialText>{format(change, 'financial')}</FinancialText>}
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
    <div
      className={css({
        zIndex: 1000,
        pointerEvents: 'none',
        borderRadius: 2,
        boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
        backgroundColor: theme.menuBackground,
        color: theme.menuItemText,
        padding: 10,
      })}
    >
      <div style={{ marginBottom: 10 }}>
        <strong>{title}</strong>
      </div>
      <div style={{ lineHeight: 1.5 }}>
        <BaselineTooltipLines {...props} />
      </div>
    </div>
  );
}
