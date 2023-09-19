import React, { type ComponentProps } from 'react';

import ArrowThinRight from '../../icons/v1/ArrowThinRight';
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
};
export default function BalanceWithCarryover({
  carryover,
  balance,
  goal,
  budgeted,
  disabled,
}: BalanceWithCarryoverProps) {
  let carryoverValue = useSheetValue(carryover);
  let balanceValue = useSheetValue(balance);
  let goalValue = useSheetValue(goal);
  let budgetedValue = useSheetValue(budgeted);
  // if a goal is passed in then check if that goal is met or not.
  let goalStatus = goalValue != null ? budgetedValue >= goalValue : null;
  return (
    <>
      <CellValue
        binding={balance}
        goalStatus={goalStatus}
        type="financial"
        getStyle={makeAmountStyle}
        style={{
          textAlign: 'right',
          ...(!disabled && {
            cursor: 'pointer',
            ':hover': { textDecoration: 'underline' },
          }),
        }}
      />
      {carryoverValue === true && (
        <View
          style={{
            alignSelf: 'center',
            marginLeft: 2,
            position: 'absolute',
            right: -4,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
          }}
        >
          <ArrowThinRight
            width={7}
            height={7}
            style={makeAmountStyle(balanceValue, goalStatus)}
          />
        </View>
      )}
    </>
  );
}
