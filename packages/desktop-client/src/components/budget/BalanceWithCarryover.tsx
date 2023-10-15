import React, { type ComponentProps } from 'react';

import ArrowThinRight from '../../icons/v1/ArrowThinRight';
import { type CSSProperties } from '../../style';
import View from '../common/View';
import CellValue from '../spreadsheet/CellValue';
import useSheetValue from '../spreadsheet/useSheetValue';

import { makeAmountStyle } from './util';

type BalanceWithCarryoverProps = {
  carryover: ComponentProps<typeof CellValue>['binding'];
  balance: ComponentProps<typeof CellValue>['binding'];
  disabled?: boolean;
  style?: CSSProperties;
  carryoverStyle?: CSSProperties;
};
export default function BalanceWithCarryover({
  carryover,
  balance,
  disabled,
  style,
  carryoverStyle,
}: BalanceWithCarryoverProps) {
  let carryoverValue = useSheetValue(carryover);
  let balanceValue = useSheetValue(balance);

  return (
    <View style={style}>
      <CellValue
        binding={balance}
        type="financial"
        getStyle={makeAmountStyle}
        style={{
          textAlign: 'right',
          ...(!disabled && {
            cursor: 'pointer',
            ':hover': { textDecoration: 'underline' },
          }),
          ...style,
        }}
      />
      {carryoverValue && (
        <View
          style={{
            alignSelf: 'center',
            marginLeft: 2,
            position: 'absolute',
            right: -4,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
            ...carryoverStyle,
          }}
        >
          <ArrowThinRight
            width={7}
            height={7}
            style={makeAmountStyle(balanceValue)}
          />
        </View>
      )}
    </View>
  );
}
