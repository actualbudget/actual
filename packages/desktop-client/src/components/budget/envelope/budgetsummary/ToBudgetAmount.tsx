import React, { type CSSProperties } from 'react';

import { css } from '@emotion/css';

import { envelopeBudget } from 'loot-core/src/client/queries';

import { theme, styles } from '../../../../style';
import { Block } from '../../../common/Block';
import { Tooltip } from '../../../common/Tooltip';
import { View } from '../../../common/View';
import { PrivacyFilter } from '../../../PrivacyFilter';
import { useFormat } from '../../../spreadsheet/useFormat';
import {
  useEnvelopeSheetName,
  useEnvelopeSheetValue,
} from '../EnvelopeBudgetComponents';

import { TotalsList } from './TotalsList';

type ToBudgetAmountProps = {
  prevMonthName: string;
  style?: CSSProperties;
  amountStyle?: CSSProperties;
  onClick: () => void;
  isTotalsListTooltipDisabled?: boolean;
};

export function ToBudgetAmount({
  prevMonthName,
  style,
  amountStyle,
  onClick,
  isTotalsListTooltipDisabled = false,
}: ToBudgetAmountProps) {
  const sheetName = useEnvelopeSheetName(envelopeBudget.toBudget);
  const sheetValue = useEnvelopeSheetValue({
    name: envelopeBudget.toBudget,
    value: 0,
  });
  const format = useFormat();
  const availableValue = sheetValue;
  if (typeof availableValue !== 'number' && availableValue !== null) {
    throw new Error(
      'Expected availableValue to be a number but got ' + availableValue,
    );
  }
  const num = availableValue ?? 0;
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
          offset={3}
          triggerProps={{ isDisabled: isTotalsListTooltipDisabled }}
        >
          <PrivacyFilter
            style={{
              textAlign: 'center',
            }}
          >
            <Block
              onClick={onClick}
              data-cellname={sheetName}
              className={css([
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
              ])}
            >
              {format(num, 'financial')}
            </Block>
          </PrivacyFilter>
        </Tooltip>
      </View>
    </View>
  );
}
