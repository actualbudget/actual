// @ts-strict-ignore
import React, { useCallback } from 'react';
import type {
  ComponentPropsWithoutRef,
  ComponentType,
  CSSProperties,
} from 'react';
import { ProgressBar } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { SvgArrowThinRight } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { TransObjectLiteral } from '@actual-app/core/types/util';
import { css } from '@emotion/css';

import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useFormat } from '#hooks/useFormat';
import { useSheetValue } from '#hooks/useSheetValue';
import type { Binding } from '#spreadsheet';

import { makeBalanceAmountStyle } from './util';

type CarryoverIndicatorProps = {
  style?: CSSProperties;
};

export function CarryoverIndicator({ style }: CarryoverIndicatorProps) {
  return (
    <View
      style={{
        marginLeft: 2,
        position: 'absolute',
        right: '-4px',
        alignSelf: 'center',
        justifyContent: 'center',
        top: 0,
        bottom: 0,
        ...style,
      }}
    >
      <SvgArrowThinRight
        width={style?.width || 7}
        height={style?.height || 7}
        style={style}
      />
    </View>
  );
}

function GoalTooltipRow({ children }) {
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

type CellValueChildren = ComponentPropsWithoutRef<typeof CellValue>['children'];

type ChildrenWithClassName = (
  props: Parameters<CellValueChildren>[0] & {
    className: string;
  },
) => ReturnType<CellValueChildren>;

type BalanceWithCarryoverProps = Omit<
  ComponentPropsWithoutRef<typeof CellValue>,
  'children' | 'binding'
> & {
  children?: ChildrenWithClassName;
  carryover: Binding<'envelope-budget' | 'tracking-budget', 'carryover'>;
  /**
   * Expense category balance binding is `leftover`,
   * while income category balance binding is `sum-amount`.
   */
  balance: Binding<
    'envelope-budget' | 'tracking-budget',
    'leftover' | 'sum-amount'
  >;
  goal: Binding<'envelope-budget' | 'tracking-budget', 'goal'>;
  budgeted: Binding<'envelope-budget' | 'tracking-budget', 'budget'>;
  longGoal: Binding<'envelope-budget' | 'tracking-budget', 'long-goal'>;
  isDisabled?: boolean;
  shouldInlineGoalStatus?: boolean;
  CarryoverIndicator?: ComponentType<CarryoverIndicatorProps>;
};

export function BalanceWithCarryover({
  carryover,
  balance,
  goal,
  budgeted,
  longGoal,
  isDisabled,
  shouldInlineGoalStatus,
  CarryoverIndicator: CarryoverIndicatorComponent = CarryoverIndicator,
  children,
  ...props
}: BalanceWithCarryoverProps) {
  const carryoverValue = useSheetValue(carryover);
  const goalValue = useSheetValue(goal);
  const budgetedValue = useSheetValue(budgeted);
  const longGoalValue = useSheetValue(longGoal);
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const getBalanceAmountStyle = useCallback(
    (balanceValue: number) =>
      makeBalanceAmountStyle(
        balanceValue,
        isGoalTemplatesEnabled ? goalValue : null,
        longGoalValue === 1 ? balanceValue : budgetedValue,
      ),
    [budgetedValue, goalValue, isGoalTemplatesEnabled, longGoalValue],
  );

  const getDefaultClassName = useCallback(
    (balanceValue: number) =>
      css({
        ...getBalanceAmountStyle(balanceValue),
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: 'right',
        ...(!isDisabled && {
          cursor: 'pointer',
          ':hover': { textDecoration: 'underline' },
        }),
      }),
    [getBalanceAmountStyle, isDisabled],
  );

  return (
    <CellValue binding={balance} type="financial" {...props}>
      {({ type, name, value: balanceValue }) => (
        <>
          <View style={{ minHeight: 'auto', flexShrink: 0, maxWidth: '100%' }}>
            {children ? (
              children({
                type,
                name,
                value: balanceValue,
                className: getDefaultClassName(balanceValue),
              })
            ) : (
              <CellValueText
                type={type}
                name={name}
                value={balanceValue}
                className={getDefaultClassName(balanceValue)}
              />
            )}
          </View>

          {carryoverValue && (
            <CarryoverIndicatorComponent
              style={getBalanceAmountStyle(balanceValue)}
            />
          )}
          {shouldInlineGoalStatus &&
            isGoalTemplatesEnabled &&
            goalValue != null && (
              <>
                <View
                  style={{
                    borderTop: '1px solid ' + theme.tableBorderSeparator,
                    width: '160px',
                    margin: '3px 0px',
                  }}
                />
                <GoalStatus
                  balance={balance}
                  goal={goal}
                  budgeted={budgeted}
                  longGoal={longGoal}
                />
              </>
            )}
        </>
      )}
    </CellValue>
  );
}

type GoalStatusProps = {
  balance: BalanceWithCarryoverProps['balance'];
  goal: BalanceWithCarryoverProps['goal'];
  budgeted: BalanceWithCarryoverProps['budgeted'];
  longGoal: BalanceWithCarryoverProps['longGoal'];
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
      <GoalTooltipRow>
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
      </GoalTooltipRow>
      <GoalTooltipRow>
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
      </GoalTooltipRow>
      <GoalTooltipRow>
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
      </GoalTooltipRow>
    </View>
  );
}
