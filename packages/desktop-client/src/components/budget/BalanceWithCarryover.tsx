import React, { type ComponentProps } from 'react';

import ArrowThinRight from '../../icons/v1/ArrowThinRight';
import { View } from '../common';
import CellValue from '../spreadsheet/CellValue';
import useSheetValue from '../spreadsheet/useSheetValue';

import { makeAmountStyle } from './util';

type BalanceWithCarryoverProps = {
  carryover: ComponentProps<typeof CellValue>['binding'];
  balance: ComponentProps<typeof CellValue>['binding'];
  disabled?: boolean;
};
export default function BalanceWithCarryover({
  carryover,
  balance,
  disabled,
}: BalanceWithCarryoverProps) {
  let carryoverValue = useSheetValue(carryover);
  let balanceValue = useSheetValue(balance);

  return (
    <>
      <CellValue
        binding={balance}
        type="financial"
        getStyle={makeAmountStyle}
        style={[
          { textAlign: 'right' },
          !disabled && {
            cursor: 'pointer',
            ':hover': { textDecoration: 'underline' },
          },
        ]}
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
            style={{
              ...makeAmountStyle(balanceValue),
            }}
          />
        </View>
      )}
    </>
  );
}
