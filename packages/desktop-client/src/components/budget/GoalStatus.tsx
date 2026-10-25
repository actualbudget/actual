import React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ProgressBar } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useFormat } from '#hooks/useFormat';
import { useSheetValue } from '#hooks/useSheetValue';
import type { Binding } from '#spreadsheet';

type GoalStatusProps = {
  balance: Binding<
    'envelope-budget' | 'tracking-budget',
    'leftover' | 'sum-amount'
  >;
  goal: Binding<'envelope-budget' | 'tracking-budget', 'goal'>;
  budgeted: Binding<'envelope-budget' | 'tracking-budget', 'budget'>;
  longGoal: Binding<'envelope-budget' | 'tracking-budget', 'long-goal'>;
  style?: CSSProperties;
};

export function GoalStatus({
  balance,
  goal,
  budgeted,
  longGoal,
  style,
}: GoalStatusProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const balanceValue = useSheetValue(balance) ?? 0;
  const goalValue = useSheetValue(goal);
  const budgetedValue = useSheetValue(budgeted) ?? 0;
  const longGoalValue = useSheetValue(longGoal);

  if (!isGoalTemplatesEnabled || goalValue == null) {
    return null;
  }

  const have = longGoalValue === 1 ? balanceValue : budgetedValue;
  const diff = have - goalValue;
  // Round down while underfunded so the bar only reads 100% once the goal is met
  const progress =
    diff < 0 ? Math.floor(Math.max(0, have / goalValue) * 100) : 100;

  return (
    <View style={{ minWidth: 160, ...style }}>
      <span style={{ fontWeight: 'bold' }}>
        {diff === 0 ? (
          <span style={{ color: theme.templateNumberFunded }}>
            <Trans>Fully funded</Trans>
          </span>
        ) : diff > 0 ? (
          <span style={{ color: theme.templateNumberFunded }}>
            <Trans>
              Overfunded (
              {{
                amount: format(diff, 'financial'),
              }}
              )
            </Trans>
          </span>
        ) : (
          <span style={{ color: theme.templateNumberUnderFunded }}>
            <Trans>
              Underfunded (
              {{
                amount: format(diff, 'financial'),
              }}
              )
            </Trans>
          </span>
        )}
      </span>
      {goalValue > 0 && (
        <ProgressBar
          value={progress}
          aria-label={t('Goal progress')}
          style={{ alignSelf: 'stretch', margin: '6px 0' }}
        >
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.tableBorder,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${progress}%`,
                backgroundColor:
                  diff >= 0
                    ? theme.templateNumberFunded
                    : theme.templateNumberUnderFunded,
              }}
            />
          </View>
        </ProgressBar>
      )}
      <GoalStatusRow>
        <Trans>
          <div>Goal Type:</div>
          <div>
            {
              {
                type: longGoalValue === 1 ? t('Goal') : t('Automation'),
              } as TransObjectLiteral
            }
          </div>
        </Trans>
      </GoalStatusRow>
      <GoalStatusRow>
        <Trans>
          <div>Goal:</div>
          <div>
            {
              {
                amount: format(goalValue, 'financial'),
              } as TransObjectLiteral
            }
          </div>
        </Trans>
      </GoalStatusRow>
      <GoalStatusRow>
        {longGoalValue !== 1 ? (
          <Trans>
            <div>Budgeted:</div>
            <div>
              {
                {
                  amount: format(budgetedValue, 'financial'),
                } as TransObjectLiteral
              }
            </div>
          </Trans>
        ) : (
          <Trans>
            <div>Balance:</div>
            <div>
              {
                {
                  amount: format(balanceValue, 'financial'),
                } as TransObjectLiteral
              }
            </div>
          </Trans>
        )}
      </GoalStatusRow>
    </View>
  );
}

type GoalStatusRowProps = {
  children: ReactNode;
};

function GoalStatusRow({ children }: GoalStatusRowProps) {
  return (
    <div
      style={{
        ...styles.tnum,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {children}
    </div>
  );
}
