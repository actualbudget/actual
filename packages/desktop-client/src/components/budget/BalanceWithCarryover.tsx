// @ts-strict-ignore
import React, { type ComponentPropsWithoutRef } from 'react';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { SvgArrowThinRight } from '../../icons/v1';
import { type CSSProperties } from '../../style';
import { View } from '../common/View';
import { type Binding } from '../spreadsheet';
import { CellValue } from '../spreadsheet/CellValue';
import { useSheetValue } from '../spreadsheet/useSheetValue';

import { makeBalanceAmountStyle } from './util';

type CarryoverIndicatorProps = {
  style?: CSSProperties;
};

type BalanceWithCarryoverProps = Omit<
  ComponentPropsWithoutRef<typeof CellValue>,
  'binding'
> & {
  carryover: Binding;
  balance: Binding;
  goal: Binding;
  budgeted: Binding;
  longGoal: Binding;
  disabled?: boolean;
  carryoverIndicator?: ({ style }: CarryoverIndicatorProps) => JSX.Element;
};

export function DefaultCarryoverIndicator({ style }: CarryoverIndicatorProps) {
  return (
    <View
      style={{
        marginLeft: 2,
        position: 'absolute',
        right: '-4px',
        alignSelf: 'center',
        top: 0,
        bottom: 0,
        ...style,
      }}
    >
      <SvgArrowThinRight
        width={style?.width || 7}
        height={style?.height || 7}
        style={style}
      />
    </View>
  );
}

export function BalanceWithCarryover({
  carryover,
  balance,
  goal,
  budgeted,
  longGoal,
  disabled,
  carryoverIndicator = DefaultCarryoverIndicator,
  ...props
}: BalanceWithCarryoverProps) {
  const carryoverValue = useSheetValue(carryover);
  const balanceValue = useSheetValue(balance);
  const goalValue = useSheetValue(goal);
  const budgetedValue = useSheetValue(budgeted);
  const longGoalValue = useSheetValue(longGoal);
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const valueStyle = makeBalanceAmountStyle(
    balanceValue,
    isGoalTemplatesEnabled ? goalValue : null,
    longGoalValue === 1 ? balanceValue : budgetedValue,
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
            longGoalValue === 1 ? balanceValue : budgetedValue,
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
      {carryoverValue && carryoverIndicator({ style: valueStyle })}
    </span>
  );
}
