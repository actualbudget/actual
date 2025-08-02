import React, { type CSSProperties } from 'react';
import { Trans } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import { TrackingCellValue } from '@desktop-client/components/budget/tracking/TrackingBudgetComponents';
import { CellValueText } from '@desktop-client/components/spreadsheet/CellValue';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { trackingBudget } from '@desktop-client/spreadsheet/bindings';

type TrackingTotalsListProps = {
  prevMonthName: string;
  style?: CSSProperties;
};

export function TrackingTotalsList({ prevMonthName, style }: TrackingTotalsListProps) {
  const format = useFormat();
  return (
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
                  <TrackingCellValue
                    binding={trackingBudget.totalIncome}
                    type="financial"
                  />
                }
              />
              <AlignedText
                left="From Last Month:"
                right={
                  <TrackingCellValue
                    binding={trackingBudget.fromLastMonth}
                    type="financial"
                  />
                }
              />
            </>
          }
          placement="bottom end"
        >
          <TrackingCellValue
            binding={trackingBudget.availableFunds}
            type="financial"
          >
            {props => <CellValueText {...props} style={{ fontWeight: 600 }} />}
          </TrackingCellValue>
        </Tooltip>

        <TrackingCellValue
          binding={trackingBudget.totalBudgetedExpense}
          type="financial"
        >
          {props => (
            <CellValueText
              {...props}
              style={{ fontWeight: 600 }}
              formatter={(value, type) => {
                const v = format(value, type);
                return value > 0 ? '+' + v : value === 0 ? '-' + v : v;
              }}
            />
          )}
        </TrackingCellValue>

        <TrackingCellValue
          binding={trackingBudget.buffered}
          type="financial"
        >
          {props => (
            <CellValueText
              {...props}
              style={{ fontWeight: 600 }}
              formatter={(value, type) => {
                const v = format(Math.abs(value), type);
                return value >= 0 ? '-' + v : '+' + v;
              }}
            />
          )}
        </TrackingCellValue>
      </View>

      <View>
        <Block>
          <Trans>Available funds</Trans>
        </Block>

        <Block>
          <Trans>Budgeted</Trans>
        </Block>

        <Block>
          <Trans>Buffered</Trans>
        </Block>
      </View>
    </View>
  );
} 