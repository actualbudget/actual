import React, { type CSSProperties } from 'react';
import { Trans } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import { getCurrency } from 'loot-core/shared/currencies';
import { getNumberFormat } from 'loot-core/shared/util';

import { EnvelopeCellValue } from '@desktop-client/components/budget/envelope/EnvelopeBudgetComponents';
import { CellValueText } from '@desktop-client/components/spreadsheet/CellValue';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useOnBudgetCurrencies } from '@desktop-client/hooks/useOnBudgetCurrencies';
import { useDynamicSheetValue } from '@desktop-client/hooks/useSheetValue';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type TotalsListProps = {
  prevMonthName: string;
  style?: CSSProperties;
};

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

type CurrencyTotalsRowProps = {
  currencyCode: string;
  prevMonthName: string;
};

function CurrencyTotalsRow({
  currencyCode,
  prevMonthName,
}: CurrencyTotalsRowProps) {
  const format = useFormat();
  const availableFunds = useDynamicSheetValue(
    envelopeBudget.availableFundsByCurrency(currencyCode),
    0,
  );
  const lastMonthOverspent = useDynamicSheetValue(
    envelopeBudget.lastMonthOverspentByCurrency(currencyCode),
    0,
  );
  const totalBudgeted = useDynamicSheetValue(
    envelopeBudget.totalBudgetedByCurrency(currencyCode),
    0,
  );
  const forNextMonth = useDynamicSheetValue(
    envelopeBudget.forNextMonthByCurrency(currencyCode),
    0,
  );

  const available = typeof availableFunds === 'number' ? availableFunds : 0;
  const overspent =
    typeof lastMonthOverspent === 'number' ? lastMonthOverspent : 0;
  const budgeted = typeof totalBudgeted === 'number' ? totalBudgeted : 0;
  const buffered = typeof forNextMonth === 'number' ? forNextMonth : 0;

  // Format values with signs
  const availableFormatted = format(available, 'financial', currencyCode);
  const overspentFormatted =
    (overspent > 0 ? '+' : '-') +
    format(Math.abs(overspent), 'financial', currencyCode);
  const budgetedFormatted =
    (budgeted > 0 ? '+' : '-') +
    format(Math.abs(budgeted), 'financial', currencyCode);
  const bufferedFormatted =
    (buffered >= 0 ? '-' : '+') +
    format(Math.abs(buffered), 'financial', currencyCode);

  // Split for decimal alignment
  const [availWhole, availSep, availFrac] = splitFormattedAmount(
    availableFormatted,
    currencyCode,
  );
  const [overspentWhole, overspentSep, overspentFrac] = splitFormattedAmount(
    overspentFormatted,
    currencyCode,
  );
  const [budgetedWhole, budgetedSep, budgetedFrac] = splitFormattedAmount(
    budgetedFormatted,
    currencyCode,
  );
  const [bufferedWhole, bufferedSep, bufferedFrac] = splitFormattedAmount(
    bufferedFormatted,
    currencyCode,
  );

  const valueStyle = { fontWeight: 600, textAlign: 'right' } as const;
  const fractionStyle = {
    fontWeight: 600,
    textAlign: 'left',
    marginRight: 8,
  } as const;

  // Render grid cells - 5 columns: currency, whole, separator, fraction, label
  return (
    <>
      {/* Row 1: Available funds */}
      <Text
        style={{
          fontSize: 11,
          color: theme.pageTextSubdued,
          textAlign: 'right',
          marginRight: 4,
        }}
      >
        {currencyCode}:
      </Text>
      <Text style={valueStyle}>{availWhole}</Text>
      <Text style={valueStyle}>{availSep}</Text>
      <Text style={fractionStyle}>{availFrac}</Text>
      <Block>
        <Trans>Available funds</Trans>
      </Block>

      {/* Row 2: Overspent */}
      <Text />
      <Text style={valueStyle}>{overspentWhole}</Text>
      <Text style={valueStyle}>{overspentSep}</Text>
      <Text style={fractionStyle}>{overspentFrac}</Text>
      <Block>
        <Trans>Overspent in {{ prevMonthName }}</Trans>
      </Block>

      {/* Row 3: Budgeted */}
      <Text />
      <Text style={valueStyle}>{budgetedWhole}</Text>
      <Text style={valueStyle}>{budgetedSep}</Text>
      <Text style={fractionStyle}>{budgetedFrac}</Text>
      <Block>
        <Trans>Budgeted</Trans>
      </Block>

      {/* Row 4: For next month */}
      <Text />
      <Text style={valueStyle}>{bufferedWhole}</Text>
      <Text style={valueStyle}>{bufferedSep}</Text>
      <Text style={fractionStyle}>{bufferedFrac}</Text>
      <Block>
        <Trans>For next month</Trans>
      </Block>
    </>
  );
}

export function TotalsList({ prevMonthName, style }: TotalsListProps) {
  const format = useFormat();
  const currencies = useOnBudgetCurrencies();
  const [enableMultiCurrencyOnBudget] = useSyncedPref(
    'enableMultiCurrencyOnBudget',
  );

  // Show per-currency breakdown when multi-currency is enabled and we have multiple currencies
  const showMultiCurrency =
    enableMultiCurrencyOnBudget === 'true' && currencies.length > 1;

  if (showMultiCurrency) {
    return (
      <View style={{ alignItems: 'center', ...style }}>
        <View
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto auto auto auto',
            gap: '0 0',
            alignItems: 'baseline',
            lineHeight: 1.5,
            ...styles.smallText,
          }}
        >
          {currencies.map((currencyCode, index) => (
            <React.Fragment key={currencyCode}>
              <CurrencyTotalsRow
                currencyCode={currencyCode}
                prevMonthName={prevMonthName}
              />
              {index < currencies.length - 1 && (
                <View
                  style={{
                    gridColumn: '1 / -1',
                    borderBottom: `1px solid ${theme.tableBorder}`,
                    margin: '4px 0',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        lineHeight: 1.5,
        justifyContent: 'center',
        ...styles.smallText,
        ...style,
      }}
    >
      <View style={{ textAlign: 'right' }}>
        <Tooltip
          style={{ ...styles.tooltip, lineHeight: 1.5, padding: '6px 10px' }}
          content={
            <>
              <AlignedText
                left="Income:"
                right={
                  <EnvelopeCellValue
                    binding={envelopeBudget.totalIncome}
                    type="financial"
                  />
                }
              />
              <AlignedText
                left="From Last Month:"
                right={
                  <EnvelopeCellValue
                    binding={envelopeBudget.fromLastMonth}
                    type="financial"
                  />
                }
              />
            </>
          }
          placement="bottom end"
        >
          <EnvelopeCellValue
            binding={envelopeBudget.incomeAvailable}
            type="financial"
          >
            {props => <CellValueText {...props} style={{ fontWeight: 600 }} />}
          </EnvelopeCellValue>
        </Tooltip>

        <EnvelopeCellValue
          binding={envelopeBudget.lastMonthOverspent}
          type="financial"
        >
          {props => (
            <CellValueText
              {...props}
              style={{ fontWeight: 600 }}
              formatter={(value, type) => {
                // Format absolute value and add explicit sign to avoid double negative from -0
                const v = format(Math.abs(value), type);
                return value > 0 ? '+' + v : '-' + v;
              }}
            />
          )}
        </EnvelopeCellValue>

        <EnvelopeCellValue
          binding={envelopeBudget.totalBudgeted}
          type="financial"
        >
          {props => (
            <CellValueText
              {...props}
              style={{ fontWeight: 600 }}
              formatter={(value, type) => {
                // Format absolute value and add explicit sign to avoid double negative from -0
                const v = format(Math.abs(value), type);
                return value > 0 ? '+' + v : '-' + v;
              }}
            />
          )}
        </EnvelopeCellValue>

        <EnvelopeCellValue
          binding={envelopeBudget.forNextMonth}
          type="financial"
        >
          {props => (
            <CellValueText
              {...props}
              style={{ fontWeight: 600 }}
              formatter={(value, type) => {
                const v = format(Math.abs(value), type);
                return value >= 0 ? '-' + v : '+' + v;
              }}
            />
          )}
        </EnvelopeCellValue>
      </View>

      <View>
        <Block>
          <Trans>Available funds</Trans>
        </Block>

        <Block>
          <Trans>Overspent in {{ prevMonthName }}</Trans>
        </Block>

        <Block>
          <Trans>Budgeted</Trans>
        </Block>

        <Block>
          <Trans>For next month</Trans>
        </Block>
      </View>
    </View>
  );
}
