// @ts-strict-ignore
import React, { type ComponentProps } from 'react';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { SvgArrowThinRight } from '../../icons/v1';
import { type CSSProperties } from '../../style';
import { View } from '../common/View';
import { CellValue } from '../spreadsheet/CellValue';
import { useSheetValue } from '../spreadsheet/useSheetValue';

import { makeAmountStyle } from './util';

type BalanceWithCarryoverProps = {
  carryover: ComponentProps<typeof CellValue>['binding'];
  balance: ComponentProps<typeof CellValue>['binding'];
  goal?: ComponentProps<typeof CellValue>['binding'];
  budgeted?: ComponentProps<typeof CellValue>['binding'];
  disabled?: boolean;
  style?: CSSProperties;
  balanceStyle?: CSSProperties;
  carryoverStyle?: CSSProperties;
};
export function BalanceWithCarryover({
  carryover,
  balance,
  goal,
  budgeted,
  disabled,
  style,
  balanceStyle,
  carryoverStyle,
}: BalanceWithCarryoverProps) {
  const carryoverValue = useSheetValue(carryover);
  const balanceValue = useSheetValue<number>(balance);
  const goalValue = useSheetValue<number>(goal);
  const budgetedValue = useSheetValue<number>(budgeted);
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  return (
    <View style={style}>
      <CellValue
        binding={balance}
        type="financial"
        getStyle={value =>
          makeAmountStyle(
            value,
            isGoalTemplatesEnabled ? goalValue : null,
            budgetedValue,
          )
        }
        style={{
          textAlign: 'right',
          ...(!disabled && {
            cursor: 'pointer',
            ':hover': { textDecoration: 'underline' },
          }),
          ...balanceStyle,
        }}
      />
      {carryoverValue && (
        <View
          style={{
            alignSelf: 'center',
            marginLeft: 2,
            position: 'absolute',
            right: -8,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
            ...carryoverStyle,
          }}
        >
          <SvgArrowThinRight
            width={7}
            height={7}
            style={makeAmountStyle(balanceValue, goalValue, budgetedValue)}
          />
        </View>
      )}
    </View>
  );
}
