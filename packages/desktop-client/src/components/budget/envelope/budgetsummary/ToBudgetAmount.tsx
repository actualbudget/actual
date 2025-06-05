import React, { type CSSProperties, type MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { TotalsList } from './TotalsList';

import {
  useEnvelopeSheetName,
  useEnvelopeSheetValue,
} from '@desktop-client/components/budget/envelope/EnvelopeBudgetComponents';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type ToBudgetAmountProps = {
  prevMonthName: string;
  style?: CSSProperties;
  amountStyle?: CSSProperties;
  onClick: () => void;
  onContextMenu?: MouseEventHandler;
  isTotalsListTooltipDisabled?: boolean;
};

export function ToBudgetAmount({
  prevMonthName,
  style,
  amountStyle,
  onClick,
  isTotalsListTooltipDisabled = false,
  onContextMenu,
}: ToBudgetAmountProps) {
  const { t } = useTranslation();
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
      <Block>{isNegative ? t('Overbudgeted:') : t('To Budget:')}</Block>
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
              onContextMenu={onContextMenu}
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
