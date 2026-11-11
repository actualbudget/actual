import React from 'react';
import type { CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { AlignedText } from '@actual-app/components/aligned-text';
import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { useTrackingSheetValue } from '#components/budget/tracking/TrackingBudgetComponents';
import { makeAmountFullStyle } from '#components/budget/util';
import { Term } from '#components/common/Term';
import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';
import { trackingBudget } from '#spreadsheet/bindings';

type SavedProps = {
  projected: boolean;
  style?: CSSProperties;
  align?: 'left' | 'center';
};

/**
 * The headline of the tracking budget summary: how much was saved (income
 * minus spending) this month, or — for the current and future months — how
 * much the plan would save if everything goes as budgeted.
 */
export function Saved({ projected, style, align = 'left' }: SavedProps) {
  const { t } = useTranslation();
  const budgetedSaved =
    useTrackingSheetValue(trackingBudget.totalBudgetedSaved) || 0;
  const totalSaved = useTrackingSheetValue(trackingBudget.totalSaved) || 0;
  const budgetedIncome =
    useTrackingSheetValue(trackingBudget.totalBudgetedIncome) || 0;
  const budgetedExpense =
    useTrackingSheetValue(trackingBudget.totalBudgetedExpense) || 0;
  const nothingBudgeted = budgetedIncome === 0 && budgetedExpense === 0;
  const format = useFormat();
  const saved = projected ? budgetedSaved : totalSaved;
  const isNegative = saved < 0;
  const diff = totalSaved - budgetedSaved;

  const color = projected
    ? theme.templateNumberUnderFunded
    : isNegative
      ? theme.budgetNumberNegative
      : theme.templateNumberFunded;

  const statusText = projected
    ? nothingBudgeted
      ? t(
          'Nothing is budgeted yet. Set targets for your income and expense categories to see what you are on track to save.',
        )
      : t(
          'Budgeted income minus budgeted expenses. Adjust your budget to change it.',
        )
    : isNegative
      ? t('You spent more than you earned this month.')
      : t('Income received minus money spent this month.');

  return (
    <View
      data-testid="saved-summary"
      style={{
        alignItems: align === 'center' ? 'center' : 'flex-start',
        ...style,
      }}
    >
      <Tooltip
        style={{ ...styles.tooltip, fontSize: 14, padding: 10 }}
        content={
          <>
            <AlignedText
              left={t('Projected savings:')}
              right={
                <FinancialText style={makeAmountFullStyle(budgetedSaved)}>
                  {format(budgetedSaved, 'financial-with-sign')}
                </FinancialText>
              }
            />
            <AlignedText
              left={t('Difference:')}
              right={
                <FinancialText style={makeAmountFullStyle(diff)}>
                  {format(diff, 'financial-with-sign')}
                </FinancialText>
              }
            />
          </>
        }
        placement="bottom"
        triggerProps={{
          isDisabled: Boolean(projected),
        }}
      >
        <View
          className={css({
            fontSize: 30,
            lineHeight: '1.1em',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color,
            ...styles.tnum,
          })}
        >
          <PrivacyFilter>
            <FinancialText>{format(saved, 'financial')}</FinancialText>
          </PrivacyFilter>
        </View>
      </Tooltip>
      <Block style={{ marginTop: 4, fontSize: 14, fontWeight: 500 }}>
        {projected ? (
          <Term id="projected-savings" isFocusable={false}>
            <Trans>Projected savings</Trans>
          </Term>
        ) : isNegative ? (
          <Term id="saved" isFocusable={false}>
            <Trans>Overspent</Trans>
          </Term>
        ) : (
          <Term id="saved" isFocusable={false}>
            <Trans>Saved</Trans>
          </Term>
        )}
      </Block>
      <Text
        style={{
          marginTop: 4,
          fontSize: 12,
          lineHeight: '1.4em',
          color:
            !projected && isNegative ? theme.errorText : theme.pageTextLight,
          textAlign: align,
        }}
      >
        {statusText}
      </Text>
    </View>
  );
}
