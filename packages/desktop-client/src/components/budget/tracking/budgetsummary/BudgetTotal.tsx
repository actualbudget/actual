import React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { ProgressBar } from '#components/common/ProgressBar';
import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';
import { useSheetValue } from '#hooks/useSheetValue';
import type { Binding, SheetFields } from '#spreadsheet';

import { fraction } from './fraction';

type BudgetTotalKind = 'income' | 'expense';

type BudgetTotalProps<
  CurrentField extends SheetFields<'tracking-budget'>,
  TargetField extends SheetFields<'tracking-budget'>,
> = {
  title: ReactNode;
  kind: BudgetTotalKind;
  current: Binding<'tracking-budget', CurrentField>;
  target: Binding<'tracking-budget', TargetField>;
  style?: CSSProperties;
};

/**
 * One row of the tracking budget summary ("Income" or "Expenses"): a
 * progress bar comparing what actually happened with what was budgeted, with
 * captions that spell out both numbers so "X of Y" is never ambiguous.
 */
export function BudgetTotal<
  CurrentField extends SheetFields<'tracking-budget'>,
  TargetField extends SheetFields<'tracking-budget'>,
>({
  title,
  kind,
  current,
  target,
  style,
}: BudgetTotalProps<CurrentField, TargetField>) {
  const { t } = useTranslation();
  const format = useFormat();

  const rawActual = (useSheetValue(current) as number | null) || 0;
  const budgeted = (useSheetValue(target) as number | null) || 0;

  // Spending is stored as a negative number; show it as the positive amount
  // that left the account. Income is already positive.
  const actual = kind === 'expense' ? Math.max(-rawActual, 0) : rawActual;
  const hasBudget = budgeted > 0;
  const remaining = budgeted - actual;
  const isOver = hasBudget && actual > budgeted;

  const progress = hasBudget ? fraction(actual, budgeted) : actual > 0 ? 1 : 0;

  const actualLabel =
    kind === 'income'
      ? t('{{amount}} received', { amount: format(actual, 'financial') })
      : t('{{amount}} spent', { amount: format(actual, 'financial') });

  let remainingLabel: string;
  if (!hasBudget) {
    remainingLabel =
      kind === 'income'
        ? t('No income budgeted yet')
        : t('No expenses budgeted yet');
  } else if (kind === 'income') {
    remainingLabel =
      remaining > 0
        ? t('{{amount}} still expected', {
            amount: format(remaining, 'financial'),
          })
        : t('{{amount}} above plan', {
            amount: format(-remaining, 'financial'),
          });
  } else {
    remainingLabel = isOver
      ? t('{{amount}} over budget', { amount: format(-remaining, 'financial') })
      : t('{{amount}} remaining', { amount: format(remaining, 'financial') });
  }

  const barColor = !hasBudget
    ? theme.pageTextSubdued
    : kind === 'expense' && isOver
      ? theme.numberNegative
      : theme.numberPositive;

  return (
    <View data-testid={`budget-total-${kind}`} style={{ gap: 6, ...style }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 8,
        }}
      >
        <Text style={{ fontWeight: 600, fontSize: 13, color: theme.pageText }}>
          {title}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: theme.pageTextLight,
            ...styles.tnum,
          }}
        >
          <PrivacyFilter>
            {hasBudget
              ? t('{{amount}} budgeted', {
                  amount: format(budgeted, 'financial'),
                })
              : t('Not budgeted')}
          </PrivacyFilter>
        </Text>
      </View>
      <ProgressBar
        value={progress}
        color={barColor}
        aria-label={`${actualLabel}. ${remainingLabel}`}
      />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: 12,
          ...styles.tnum,
        }}
      >
        <Text style={{ fontWeight: 600, color: theme.pageText }}>
          <PrivacyFilter>
            <FinancialText>{actualLabel}</FinancialText>
          </PrivacyFilter>
        </Text>
        <Text
          style={{
            color: isOver
              ? theme.numberNegative
              : hasBudget
                ? theme.numberPositive
                : theme.pageTextSubdued,
            fontWeight: hasBudget ? 600 : 400,
            fontStyle: hasBudget ? 'normal' : 'italic',
            textAlign: 'right',
          }}
        >
          <PrivacyFilter>{remainingLabel}</PrivacyFilter>
        </Text>
      </View>
    </View>
  );
}
