import React, { type CSSProperties, type MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { getCurrency } from 'loot-core/shared/currencies';
import { getNumberFormat } from 'loot-core/shared/util';

import { TotalsList } from './TotalsList';

import {
  useEnvelopeSheetName,
  useEnvelopeSheetValue,
} from '@desktop-client/components/budget/envelope/EnvelopeBudgetComponents';
import { FinancialText } from '@desktop-client/components/FinancialText';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useOnBudgetCurrencies } from '@desktop-client/hooks/useOnBudgetCurrencies';
import { useDynamicSheetValue } from '@desktop-client/hooks/useSheetValue';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

/**
 * Splits a formatted currency string into parts for decimal-aligned display.
 * Returns [wholePart, decimalSeparator, fractionPart] or [wholePart, '', ''] for currencies without decimals.
 */
function splitFormattedAmount(
  formatted: string,
  currencyCode: string,
): [string, string, string] {
  const currency = getCurrency(currencyCode);
  const { decimalSeparator } = getNumberFormat({
    format: currency.numberFormat,
  });

  // For currencies with no decimal places (like JPY), return just the whole part
  if (currency.decimalPlaces === 0) {
    return [formatted, '', ''];
  }

  // Find the last occurrence of the decimal separator
  const sepIndex = formatted.lastIndexOf(decimalSeparator);
  if (sepIndex === -1) {
    return [formatted, '', ''];
  }

  return [
    formatted.slice(0, sepIndex),
    decimalSeparator,
    formatted.slice(sepIndex + 1),
  ];
}

type ToBudgetAmountProps = {
  prevMonthName: string;
  style?: CSSProperties;
  amountStyle?: CSSProperties;
  onClick: () => void;
  onCurrencyClick?: (currencyCode: string) => void;
  onContextMenu?: MouseEventHandler;
  isTotalsListTooltipDisabled?: boolean;
};

type ToBudgetCurrencyAmountProps = {
  currencyCode: string;
  onClick: () => void;
  onContextMenu?: MouseEventHandler;
  amountStyle?: CSSProperties;
};

function ToBudgetCurrencyAmount({
  currencyCode,
  onClick,
  onContextMenu,
  amountStyle,
}: ToBudgetCurrencyAmountProps) {
  const sheetValue = useDynamicSheetValue(
    envelopeBudget.toBudgetByCurrency(currencyCode),
    0,
  );
  const format = useFormat();
  const num = typeof sheetValue === 'number' ? sheetValue : 0;
  const isNegative = num < 0;
  const formatted = format(num, 'financial', currencyCode);
  const [wholePart, separator, fractionPart] = splitFormattedAmount(
    formatted,
    currencyCode,
  );

  const amountColor = isNegative ? theme.errorText : theme.pageTextPositive;
  const hoverBorderColor = isNegative
    ? theme.errorBorder
    : theme.pageTextPositive;

  // Use display: contents so children participate in parent grid
  return (
    <>
      <Text
        data-testid={`to-budget-${currencyCode}`}
        style={{
          fontSize: 11,
          color: theme.pageTextSubdued,
          textAlign: 'left',
        }}
      >
        {currencyCode}:
      </Text>
      <PrivacyFilter>
        <View
          data-testid={`to-budget-${currencyCode}-amount`}
          onClick={onClick}
          onContextMenu={onContextMenu}
          className={css([
            styles.largeText,
            {
              fontWeight: 400,
              userSelect: 'none',
              cursor: 'pointer',
              color: amountColor,
              borderBottom: '1px solid transparent',
              ':hover': {
                borderColor: hoverBorderColor,
              },
            },
            amountStyle,
          ])}
          style={{
            display: 'contents',
          }}
        >
          <Text style={{ textAlign: 'right' }}>{wholePart}</Text>
          <Text style={{ textAlign: 'center' }}>{separator}</Text>
          <Text style={{ textAlign: 'left' }}>{fractionPart}</Text>
        </View>
      </PrivacyFilter>
    </>
  );
}

export function ToBudgetAmount({
  prevMonthName,
  style,
  amountStyle,
  onClick,
  onCurrencyClick,
  isTotalsListTooltipDisabled = false,
  onContextMenu,
}: ToBudgetAmountProps) {
  const { t } = useTranslation();
  const currencies = useOnBudgetCurrencies();
  const [enableMultiCurrencyOnBudget] = useSyncedPref(
    'enableMultiCurrencyOnBudget',
  );
  const isMultiCurrency =
    enableMultiCurrencyOnBudget === 'true' && currencies.length > 1;

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
  const isPositive = num > 0;

  if (isMultiCurrency) {
    return (
      <View style={{ alignItems: 'center', ...styles.tnum, ...style }}>
        <Block>{t('To Budget:')}</Block>
        <View
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto auto auto',
            gap: '2px 0',
            marginTop: 4,
            alignItems: 'baseline',
          }}
        >
          {currencies.map(currencyCode => (
            <ToBudgetCurrencyAmount
              key={currencyCode}
              currencyCode={currencyCode}
              onClick={() =>
                onCurrencyClick ? onCurrencyClick(currencyCode) : onClick()
              }
              onContextMenu={onContextMenu}
              amountStyle={amountStyle}
            />
          ))}
        </View>
      </View>
    );
  }

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
                  color: isPositive
                    ? theme.toBudgetPositive
                    : isNegative
                      ? theme.toBudgetNegative
                      : theme.toBudgetZero,
                  marginBottom: -1,
                  borderBottom: '1px solid transparent',
                  ':hover': {
                    borderColor: isPositive
                      ? theme.toBudgetPositive
                      : isNegative
                        ? theme.toBudgetNegative
                        : theme.toBudgetZero,
                  },
                },
                amountStyle,
              ])}
            >
              <FinancialText>{format(num, 'financial')}</FinancialText>
            </Block>
          </PrivacyFilter>
        </Tooltip>
      </View>
    </View>
  );
}
