import React from 'react';
import type { CSSProperties } from 'react';
import { Trans } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { styles } from '@actual-app/components/styles';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import { EnvelopeCellValue } from '#components/budget/envelope/EnvelopeBudgetComponents';
import { SummaryRow } from '#components/budget/SummaryCard';
import { Term } from '#components/common/Term';
import { CellValueText } from '#components/spreadsheet/CellValue';
import { useFormat } from '#hooks/useFormat';
import type { FormatType } from '#hooks/useFormat';
import { envelopeBudget } from '#spreadsheet/bindings';

/**
 * Creates a formatter that displays values with explicit +/- signs.
 * Uses Math.abs to avoid double-negative display (e.g., "--$0.00").
 *
 * @param format - The format function from useFormat hook
 * @param invert - If true, shows '-' for positive and '+' for negative
 */
function makeSignedFormatter(
  format: ReturnType<typeof useFormat>,
  invert = false,
) {
  return (value: number, type?: FormatType) => {
    const v = format(Math.abs(value), type);
    if (value === 0) {
      return v;
    }
    const isPositive = value > 0;
    return invert
      ? isPositive
        ? '-' + v
        : '+' + v
      : isPositive
        ? '+' + v
        : '-' + v;
  };
}

type TotalsListProps = {
  prevMonthName: string;
  style?: CSSProperties;
  /** Render as a compact tooltip body instead of summary rows. */
  compact?: boolean;
};

/**
 * Explains how the "To budget" figure is calculated: available funds, minus
 * last month's overspending, minus what has been budgeted, minus money put
 * aside for next month.
 */
export function TotalsList({ prevMonthName, style, compact }: TotalsListProps) {
  const format = useFormat();
  const signedFormatter = makeSignedFormatter(format);
  const invertedSignedFormatter = makeSignedFormatter(format, true);

  const availableFunds = (
    <Tooltip
      style={{ ...styles.tooltip, lineHeight: 1.5, padding: '6px 10px' }}
      content={
        <>
          <AlignedText
            left={<Trans>Income this month:</Trans>}
            right={
              <EnvelopeCellValue
                binding={envelopeBudget.totalIncome}
                type="financial"
              />
            }
          />
          <AlignedText
            left={<Trans>Left over from last month:</Trans>}
            right={
              <EnvelopeCellValue
                binding={envelopeBudget.fromLastMonth}
                type="financial"
              />
            }
          />
        </>
      }
      placement="bottom end"
    >
      <EnvelopeCellValue
        binding={envelopeBudget.incomeAvailable}
        type="financial"
      >
        {props => <CellValueText {...props} />}
      </EnvelopeCellValue>
    </Tooltip>
  );

  const overspent = (
    <EnvelopeCellValue
      binding={envelopeBudget.lastMonthOverspent}
      type="financial"
    >
      {props => <CellValueText {...props} formatter={signedFormatter} />}
    </EnvelopeCellValue>
  );

  const budgeted = (
    <EnvelopeCellValue binding={envelopeBudget.totalBudgeted} type="financial">
      {props => <CellValueText {...props} formatter={signedFormatter} />}
    </EnvelopeCellValue>
  );

  const forNextMonth = (
    <EnvelopeCellValue binding={envelopeBudget.forNextMonth} type="financial">
      {props => (
        <CellValueText {...props} formatter={invertedSignedFormatter} />
      )}
    </EnvelopeCellValue>
  );

  if (compact) {
    return (
      <View style={{ gap: 2, ...styles.smallText, ...style }}>
        <AlignedText
          left={<Trans>Available funds</Trans>}
          right={availableFunds}
        />
        <AlignedText
          left={<Trans>Overspent in {{ prevMonthName }}</Trans>}
          right={overspent}
        />
        <AlignedText left={<Trans>Budgeted</Trans>} right={budgeted} />
        <AlignedText
          left={<Trans>For next month</Trans>}
          right={forNextMonth}
        />
      </View>
    );
  }

  return (
    <View data-testid="budget-totals-list" style={{ gap: 8, ...style }}>
      <SummaryRow
        emphasized
        label={
          <Term id="available-funds" isFocusable={false}>
            <Trans>Available funds</Trans>
          </Term>
        }
        value={availableFunds}
      />
      <SummaryRow
        label={
          <Term id="overspent-last-month" isFocusable={false}>
            <Trans>Overspent in {{ prevMonthName }}</Trans>
          </Term>
        }
        value={overspent}
      />
      <SummaryRow
        label={
          <Term id="budgeted-this-month" isFocusable={false}>
            <Trans>Budgeted</Trans>
          </Term>
        }
        value={budgeted}
      />
      <SummaryRow
        label={
          <Term id="for-next-month" isFocusable={false}>
            <Trans>For next month</Trans>
          </Term>
        }
        value={forNextMonth}
      />
    </View>
  );
}
