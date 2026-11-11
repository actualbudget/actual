import React from 'react';
import type { CSSProperties, MouseEventHandler } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import {
  useEnvelopeSheetName,
  useEnvelopeSheetValue,
} from '#components/budget/envelope/EnvelopeBudgetComponents';
import { Term } from '#components/common/Term';
import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';
import { envelopeBudget } from '#spreadsheet/bindings';

import { TotalsList } from './TotalsList';

type ToBudgetAmountProps = {
  prevMonthName: string;
  style?: CSSProperties;
  amountStyle?: CSSProperties;
  onClick?: () => void;
  onContextMenu?: MouseEventHandler;
  isTotalsListTooltipDisabled?: boolean;
  /** Center the number, e.g. inside a modal. Defaults to left aligned. */
  align?: 'left' | 'center';
};

/**
 * The "To budget" headline: the single most important number on the budget
 * page. A short status line underneath tells a new user what to do next.
 */
export function ToBudgetAmount({
  prevMonthName,
  style,
  amountStyle,
  onClick,
  isTotalsListTooltipDisabled = false,
  onContextMenu,
  align = 'left',
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
  const availableFunds =
    useEnvelopeSheetValue(envelopeBudget.incomeAvailable) ?? 0;
  const num = availableValue ?? 0;
  const isNegative = num < 0;
  const isPositive = num > 0;
  const hasNoMoneyYet = num === 0 && availableFunds === 0;

  const color = isPositive
    ? theme.toBudgetPositive
    : isNegative
      ? theme.toBudgetNegative
      : theme.toBudgetZero;

  const statusText = isPositive
    ? t('Click the amount to assign it to categories.')
    : isNegative
      ? t('You assigned more than you have. Lower some budgeted amounts.')
      : hasNoMoneyYet
        ? t(
            'Add an account with a balance or some income, and the money will show up here ready to assign.',
          )
        : t('Every dollar has a job — nice work.');

  return (
    <View
      style={{
        alignItems: align === 'center' ? 'center' : 'flex-start',
        ...style,
      }}
    >
      <Tooltip
        content={
          <TotalsList
            compact
            prevMonthName={prevMonthName}
            style={{ padding: 7 }}
          />
        }
        placement="bottom"
        offset={3}
        triggerProps={{ isDisabled: isTotalsListTooltipDisabled }}
      >
        <PrivacyFilter
          style={{
            textAlign: align,
          }}
        >
          <Block
            onClick={onClick}
            onContextMenu={onContextMenu}
            data-cellname={sheetName}
            data-testid="to-budget-amount"
            className={css([
              {
                fontSize: 30,
                lineHeight: '1.1em',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                userSelect: 'none',
                cursor: onClick ? 'pointer' : 'default',
                color,
                borderBottom: '2px solid transparent',
                ...styles.tnum,
                ':hover': {
                  borderColor: color,
                },
              },
              amountStyle,
            ])}
          >
            <FinancialText>{format(num, 'financial')}</FinancialText>
          </Block>
        </PrivacyFilter>
      </Tooltip>
      <Block style={{ marginTop: 4, fontSize: 14, fontWeight: 500 }}>
        {isNegative ? (
          <Term id="overbudgeted" isFocusable={false}>
            <Trans>Overbudgeted</Trans>
          </Term>
        ) : (
          <Term id="to-budget" isFocusable={false}>
            <Trans>Left to budget</Trans>
          </Term>
        )}
      </Block>
      <Text
        data-testid="to-budget-status"
        style={{
          marginTop: 4,
          fontSize: 12,
          lineHeight: '1.4em',
          color: isNegative ? theme.errorText : theme.pageTextLight,
          textAlign: align,
        }}
      >
        {statusText}
      </Text>
    </View>
  );
}
