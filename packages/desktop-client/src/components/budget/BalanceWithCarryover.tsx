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
import { useFormat } from '#hooks/useFormat';
import { useSheetValue } from '#hooks/useSheetValue';
import { useSyncedPref } from '#hooks/useSyncedPref';
import type { Binding } from '#spreadsheet';

import { GoalProgressRing } from './GoalProgressRing';
import { GoalStatus } from './GoalStatus';
import { getGoalRingProgress, makeBalanceAmountStyle } from './util';

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
   * How much of the goal is funded, to draw the goal progress ring beside the
   * balance, or null when the balance has no ring: no goal, overspent or
   * already funded.
   */
  ringProgress: number | null,
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
  /**
   * Only tracking budgets use goals on income categories, so envelope budgets
   * ignore any goal left on one
   */
  isIncome?: boolean;
  // Leaves the arrow out even while the flag is on, for months that ignore it
  isCarryoverHidden?: boolean;
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
  isIncome,
  isCarryoverHidden = false,
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
  const { decimalPlaces } = useFormat().currency;

  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const canShowGoal =
    isGoalTemplatesEnabled && !(isIncome && budgetType !== 'tracking');
  // Long goals count the balance towards the goal, others the budgeted amount
  const getHave = (balanceValue: number) =>
    longGoalValue === 1 ? balanceValue : budgetedValue;

  const getRingProgress = (balanceValue: number) =>
    canShowGoal
      ? getGoalRingProgress(
          balanceValue,
          goalValue,
          getHave(balanceValue),
          decimalPlaces,
        )
      : null;

  const getBalanceAmountStyle = (balanceValue: number) =>
    makeBalanceAmountStyle(
      balanceValue,
      canShowGoal ? goalValue : null,
      getHave(balanceValue),
      decimalPlaces,
    );

  const getDefaultClassName = (balanceValue: number) =>
    css({
      ...getBalanceAmountStyle(balanceValue),
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
        const ringProgress = getRingProgress(balanceValue);
        return (
          <>
            <View
              style={{
                minHeight: 'auto',
                maxWidth: '100%',
                // Let a long amount give way to the ring rather than push it
                // out of the column
                ...(ringProgress != null && !children
                  ? { flexShrink: 1, minWidth: 0 }
                  : { flexShrink: 0 }),
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
                  ringProgress,
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
            {!children && ringProgress != null && (
              // Drawn before the amount, after it in the DOM so the button
              // reads as the amount followed by its status
              <GoalProgressRing
                progress={ringProgress}
                style={{ order: -1, marginRight: 4 }}
              />
            )}

            {carryoverValue && !isCarryoverHidden && (
              <CarryoverIndicatorComponent
                style={getBalanceAmountStyle(balanceValue)}
              />
            )}
            {shouldInlineGoalStatus && canShowGoal && goalValue != null && (
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
