import React, { type CSSProperties } from 'react';
import { Trans } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

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

  return (
    <View
      style={{
        flexDirection: 'row',
        lineHeight: 1.5,
        justifyContent: 'center',
        ...styles.smallText,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          color: theme.pageTextSubdued,
          marginRight: 6,
          minWidth: 30,
          textAlign: 'right',
        }}
      >
        {currencyCode}:
      </Text>
      <View
        style={{
          textAlign: 'right',
          marginRight: 10,
          minWidth: 50,
        }}
      >
        <Block style={{ fontWeight: 600 }}>
          {format(available, 'financial', currencyCode)}
        </Block>
        <Block style={{ fontWeight: 600 }}>
          {overspent > 0
            ? '+' + format(overspent, 'financial', currencyCode)
            : '-' + format(Math.abs(overspent), 'financial', currencyCode)}
        </Block>
        <Block style={{ fontWeight: 600 }}>
          {budgeted > 0
            ? '+' + format(budgeted, 'financial', currencyCode)
            : '-' + format(Math.abs(budgeted), 'financial', currencyCode)}
        </Block>
        <Block style={{ fontWeight: 600 }}>
          {buffered >= 0
            ? '-' + format(Math.abs(buffered), 'financial', currencyCode)
            : '+' + format(Math.abs(buffered), 'financial', currencyCode)}
        </Block>
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
      <View style={{ gap: 8, ...style }}>
        {currencies.map(currencyCode => (
          <CurrencyTotalsRow
            key={currencyCode}
            currencyCode={currencyCode}
            prevMonthName={prevMonthName}
          />
        ))}
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
      <View
        style={{
          textAlign: 'right',
          marginRight: 10,
          minWidth: 50,
        }}
      >
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
