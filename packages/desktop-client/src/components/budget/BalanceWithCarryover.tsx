// @ts-strict-ignore
import React, { type ReactNode, type ComponentPropsWithoutRef } from 'react';

import { type Property as CSSProperty } from 'csstype';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { SvgArrowThinRight } from '../../icons/v1';
import { type CSSProperties } from '../../style';
import { View } from '../common/View';
import { type Binding } from '../spreadsheet';
import { CellValue } from '../spreadsheet/CellValue';
import { useSheetValue } from '../spreadsheet/useSheetValue';

import { makeBalanceAmountStyle } from './util';

type BalanceWithCarryoverProps = Omit<
  ComponentPropsWithoutRef<typeof CellValue>,
  'binding'
> & {
  carryover: Binding;
  balance: Binding;
  goal: Binding;
  budgeted: Binding;
  disabled?: boolean;
  carryoverStyle?: CSSProperties;
  carryoverView?: (valueColor: CSSProperty.Color | undefined) => ReactNode;
};
export function BalanceWithCarryover({
  carryover,
  balance,
  goal,
  budgeted,
  disabled,
  carryoverStyle,
  carryoverView,
  ...props
}: BalanceWithCarryoverProps) {
  const carryoverValue = useSheetValue(carryover);
  const balanceValue = useSheetValue(balance);
  const goalValue = useSheetValue(goal);
  const budgetedValue = useSheetValue(budgeted);
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const valueStyle = makeBalanceAmountStyle(
    balanceValue,
    isGoalTemplatesEnabled ? goalValue : null,
    budgetedValue,
  );

  return (
    <span
      style={{
        alignItems: 'center',
        display: 'inline-flex',
        justifyContent: 'right',
        maxWidth: '100%',
      }}
    >
      <CellValue
        {...props}
        binding={balance}
        type="financial"
        getStyle={value =>
          makeBalanceAmountStyle(
            value,
            isGoalTemplatesEnabled ? goalValue : null,
            budgetedValue,
          )
        }
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'right',
          ...(!disabled && {
            cursor: 'pointer',
          }),
          ...props.style,
        }}
      />
      {carryoverValue &&
        (carryoverView ? (
          carryoverView(valueStyle?.color)
        ) : (
          <View
            style={{
              marginLeft: 2,
              position: 'absolute',
              right: '-4px',
              alignSelf: 'center',
              top: 0,
              bottom: 0,
              ...carryoverStyle,
            }}
          >
            <SvgArrowThinRight
              width={carryoverStyle?.width || 7}
              height={carryoverStyle?.height || 7}
              style={valueStyle}
            />
          </View>
        ))}
    </span>
  );
}
