import React, { type ComponentPropsWithoutRef } from 'react';

import { css } from 'glamor';

import { rolloverBudget } from 'loot-core/src/client/queries';

import { theme, styles, type CSSProperties } from '../../../../style';
import { Block } from '../../../common/Block';
import { HoverTarget } from '../../../common/HoverTarget';
import { View } from '../../../common/View';
import { PrivacyFilter } from '../../../PrivacyFilter';
import { useFormat } from '../../../spreadsheet/useFormat';
import { useSheetName } from '../../../spreadsheet/useSheetName';
import { useSheetValue } from '../../../spreadsheet/useSheetValue';
import { Tooltip } from '../../../tooltips';

import { TotalsList } from './TotalsList';

type ToBudgetAmountProps = {
  prevMonthName: string;
  showTotalsTooltipOnHover?: boolean;
  totalsTooltipProps?: ComponentPropsWithoutRef<typeof Tooltip>;
  style?: CSSProperties;
  amountStyle?: CSSProperties;
  onClick: () => void;
};

export function ToBudgetAmount({
  prevMonthName,
  showTotalsTooltipOnHover,
  totalsTooltipProps,
  style,
  amountStyle,
  onClick,
}: ToBudgetAmountProps) {
  const sheetName = useSheetName(rolloverBudget.toBudget);
  const sheetValue = useSheetValue({
    name: rolloverBudget.toBudget,
    value: 0,
  });
  const format = useFormat();
  const availableValue = parseInt(sheetValue);
  const num = isNaN(availableValue) ? 0 : availableValue;
  const isNegative = num < 0;

  return (
    <View style={{ alignItems: 'center', ...style }}>
      <Block>{isNegative ? 'Overbudgeted:' : 'To Budget:'}</Block>
      <View>
        <HoverTarget
          disabled={!showTotalsTooltipOnHover}
          renderContent={() => (
            <Tooltip position="bottom-center" {...totalsTooltipProps}>
              <TotalsList
                prevMonthName={prevMonthName}
                style={{
                  padding: 7,
                }}
              />
            </Tooltip>
          )}
        >
          <PrivacyFilter blurIntensity={7}>
            <Block
              onClick={onClick}
              data-cellname={sheetName}
              className={`${css([
                styles.veryLargeText,
                {
                  fontWeight: 400,
                  userSelect: 'none',
                  cursor: 'pointer',
                  color: isNegative ? theme.errorText : theme.pageTextPositive,
                  marginBottom: -1,
                  borderBottom: '1px solid transparent',
                  ':hover': {
                    borderColor: isNegative
                      ? theme.errorBorder
                      : theme.pageTextPositive,
                  },
                },
                amountStyle,
              ])}`}
            >
              {format(num, 'financial')}
            </Block>
          </PrivacyFilter>
        </HoverTarget>
      </View>
    </View>
  );
}
