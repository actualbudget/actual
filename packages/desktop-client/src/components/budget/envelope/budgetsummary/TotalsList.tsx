import React from 'react';
import type { CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { EnvelopeCellValue } from '#components/budget/envelope/EnvelopeBudgetComponents';
import { CellValueText } from '#components/spreadsheet/CellValue';
import { useFormat } from '#hooks/useFormat';
import type { FormatType } from '#hooks/useFormat';
import { useFutureBufferMode } from '#hooks/useFutureBufferMode';
import { SheetNameProvider } from '#hooks/useSheetName';
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
      return '-' + v;
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
  month: string;
  prevMonthName: string;
  style?: CSSProperties;
};

export function TotalsList({ month, prevMonthName, style }: TotalsListProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const { isManagedMonth } = useFutureBufferMode(month);
  const signedFormatter = makeSignedFormatter(format);
  const invertedSignedFormatter = makeSignedFormatter(format, true);
  return (
    <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
      <View
        style={{
          flexDirection: 'row',
          lineHeight: 1.5,
          justifyContent: 'center',
          ...styles.smallText,
          ...style,
        }}
      >
        <View
          style={{
            textAlign: 'right',
            marginRight: 10,
            minWidth: 50,
          }}
        >
          <Tooltip
            style={{ ...styles.tooltip, lineHeight: 1.5, padding: '6px 10px' }}
            content={
              <>
                <AlignedText
                  left="Income:"
                  right={
                    <EnvelopeCellValue
                      binding={envelopeBudget.totalIncome}
                      type="financial"
                    />
                  }
                />
                <AlignedText
                  left="From Last Month:"
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
              {props => (
                <CellValueText {...props} style={{ fontWeight: 600 }} />
              )}
            </EnvelopeCellValue>
          </Tooltip>

          <EnvelopeCellValue
            binding={envelopeBudget.lastMonthOverspent}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                style={{ fontWeight: 600 }}
                formatter={signedFormatter}
              />
            )}
          </EnvelopeCellValue>

          <EnvelopeCellValue
            binding={envelopeBudget.totalBudgeted}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                style={{ fontWeight: 600 }}
                formatter={signedFormatter}
              />
            )}
          </EnvelopeCellValue>

          <EnvelopeCellValue
            binding={envelopeBudget.forNextMonth}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                style={{ fontWeight: 600 }}
                formatter={invertedSignedFormatter}
              />
            )}
          </EnvelopeCellValue>
        </View>

        <View>
          <Block>
            <Trans>Available funds</Trans>
          </Block>

          <Block>
            <Trans>Overspent in {{ prevMonthName }}</Trans>
          </Block>

          <Block>
            <Trans>Budgeted</Trans>
          </Block>

          {isManagedMonth ? (
            <Tooltip
              style={{ ...styles.tooltip, lineHeight: 1.5, maxWidth: 280 }}
              content={t(
                'Held automatically for what your future months need. It updates as you budget ahead. Change this from the To Budget menu.',
              )}
              placement="bottom start"
            >
              <Block>
                <Trans>For next month</Trans>
              </Block>
            </Tooltip>
          ) : (
            <Block>
              <Trans>For next month</Trans>
            </Block>
          )}
        </View>
      </View>
    </SheetNameProvider>
  );
}
