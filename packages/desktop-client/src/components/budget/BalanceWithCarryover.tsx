// @ts-strict-ignore
import type {
  ComponentPropsWithoutRef,
  ComponentType,
  CSSProperties,
} from 'react';

import { SvgArrowThinRight } from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useSheetValue } from '#hooks/useSheetValue';
import type { Binding } from '#spreadsheet';

import { GoalProgressRing } from './GoalProgressRing';
import type { GoalRing } from './GoalProgressRing';
import { GoalStatus } from './GoalStatus';
import {
  getGoalFundingState,
  getGoalProgress,
  makeBalanceAmountStyle,
} from './util';

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

type CellValueChildren = ComponentPropsWithoutRef<typeof CellValue>['children'];

type ChildrenWithClassName = (
  props: Parameters<CellValueChildren>[0] & {
    className: string;
  },
  /**
   * Set when the category has a goal and is not overspent, to draw the goal
   * progress ring beside the balance.
   */
  goalRing: GoalRing | null,
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

  const getGoalRing = (balanceValue: number): GoalRing | null => {
    if (!isGoalTemplatesEnabled || goalValue == null) {
      return null;
    }
    // Long goals count the balance towards the goal, others the budgeted amount
    const have = longGoalValue === 1 ? balanceValue : budgetedValue;
    const state = getGoalFundingState(balanceValue, goalValue, have);
    // An overspent balance is already red, like any other negative amount
    if (state !== 'underfunded' && state !== 'funded') {
      return null;
    }
    return { state, progress: getGoalProgress(have, goalValue) };
  };

  const getDefaultClassName = (balanceValue: number) =>
    css({
      ...makeBalanceAmountStyle(balanceValue),
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      textAlign: 'right',
      ...(!isDisabled && {
        cursor: 'pointer',
        ':hover': { textDecoration: 'underline' },
      }),
    });

  return (
    <CellValue binding={balance} type="financial" {...props}>
      {({ type, name, value: balanceValue }) => {
        const goalRing = getGoalRing(balanceValue);
        const hasRing = !children && goalRing != null;
        return (
          <>
            {hasRing && (
              <GoalProgressRing {...goalRing} style={{ marginRight: 4 }} />
            )}
            <View
              style={{
                minHeight: 'auto',
                flexShrink: 0,
                // Leave room for the ring so a long amount truncates instead
                // of overlapping it
                maxWidth: hasRing ? 'calc(100% - 16px)' : '100%',
              }}
            >
              {children ? (
                children(
                  {
                    type,
                    name,
                    value: balanceValue,
                    className: getDefaultClassName(balanceValue),
                  },
                  goalRing,
                )
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
                style={makeBalanceAmountStyle(balanceValue)}
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
        );
      }}
    </CellValue>
  );
}
