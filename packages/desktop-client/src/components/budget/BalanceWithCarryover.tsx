import React, { type ComponentProps } from 'react';

import useFeatureFlag from '../../hooks/useFeatureFlag';
import ArrowThinRight from '../../icons/v1/ArrowThinRight';
import { type CSSProperties } from '../../style';
import View from '../common/View';
import CellValue from '../spreadsheet/CellValue';
import useSheetValue from '../spreadsheet/useSheetValue';

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
export default function BalanceWithCarryover({
  carryover,
  balance,
  goal,
  budgeted,
  disabled,
  style,
  balanceStyle,
  carryoverStyle,
}: BalanceWithCarryoverProps) {
  let carryoverValue = useSheetValue(carryover);
  let balanceValue = useSheetValue(balance);
  let goalValue = useSheetValue(goal);
  let budgetedValue = useSheetValue(budgeted);
  let isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
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
          <ArrowThinRight
            width={7}
            height={7}
            style={makeAmountStyle(balanceValue, goalValue, budgetedValue)}
          />
        </View>
      )}
    </View>
  );
}
