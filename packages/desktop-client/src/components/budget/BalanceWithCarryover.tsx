import React, { type ComponentProps } from 'react';

import ArrowThinRight from '../../icons/v1/ArrowThinRight';
import View from '../common/View';
import CellValue from '../spreadsheet/CellValue';
import useSheetValue from '../spreadsheet/useSheetValue';

import { makeAmountStyle, makeAmountStyleGoal } from './util';

type BalanceWithCarryoverProps = {
  carryover: ComponentProps<typeof CellValue>['binding'];
  balance: ComponentProps<typeof CellValue>['binding'];
  goal: ComponentProps<typeof CellValue>['binding'];
  disabled?: boolean;
};
export default function BalanceWithCarryover({
  carryover,
  balance,
  goal,
  disabled,
}: BalanceWithCarryoverProps) {
  let carryoverValue = useSheetValue(carryover);
  let balanceValue = useSheetValue(balance);
  //let goalValue = useSheetValue(goal);
  let goalValue = '5000'; //TODO: figure out how to actually get this value for realzies

  return (
    <>
      <CellValue
        binding={balance}
        goalValue={goalValue}
        type="financial"
        getStyle={makeAmountStyleGoal}
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
            style={makeAmountStyleGoal(balanceValue,goalValue)}
          />
        </View>
      )}
    </>
  );
}
