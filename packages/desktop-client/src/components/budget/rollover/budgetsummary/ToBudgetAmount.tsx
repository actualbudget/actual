import React from 'react';

import { css } from 'glamor';

import { rolloverBudget } from 'loot-core/src/client/queries';

import { theme, styles, type CSSProperties } from '../../../../style';
import { Block } from '../../../common/Block';
import { Tooltip } from '../../../common/Tooltip';
import { View } from '../../../common/View';
import { PrivacyFilter } from '../../../PrivacyFilter';
import { useFormat } from '../../../spreadsheet/useFormat';
import { useSheetName } from '../../../spreadsheet/useSheetName';
import { useSheetValue } from '../../../spreadsheet/useSheetValue';

import { TotalsList } from './TotalsList';

type ToBudgetAmountProps = {
  prevMonthName: string;
  style?: CSSProperties;
  amountStyle?: CSSProperties;
  onClick: () => void;
};

export function ToBudgetAmount({
  prevMonthName,
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
        <Tooltip
          content={
            <TotalsList
              prevMonthName={prevMonthName}
              style={{
                padding: 7,
              }}
            />
          }
          placement="bottom"
          triggerProps={{ delay: 0 }}
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
        </Tooltip>
      </View>
    </View>
  );
}
