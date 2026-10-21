// @ts-strict-ignore
import type {
  ComponentPropsWithoutRef,
  ComponentType,
  CSSProperties,
  ReactNode,
  SVGProps,
} from 'react';
import { useTranslation } from 'react-i18next';

import {
  SvgArrowThinRight,
  SvgCheckmark,
  SvgExclamationOutline,
  SvgTime,
} from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';
import type { TFunction } from 'i18next';

import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useSheetValue } from '#hooks/useSheetValue';
import type { Binding } from '#spreadsheet';

import { GoalStatus } from './GoalStatus';
import { getGoalFundingState, makeBalanceAmountStyle } from './util';
import type { GoalFundingState } from './util';

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
  /** Set when the category has a goal, to draw the goal status pill. */
  goalState: GoalFundingState | null,
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
  // Long goals count the balance towards the goal, others the budgeted amount
  const getHave = (balanceValue: number) =>
    longGoalValue === 1 ? balanceValue : budgetedValue;
  const getBalanceAmountStyle = (balanceValue: number) =>
    makeBalanceAmountStyle(
      balanceValue,
      isGoalTemplatesEnabled ? goalValue : null,
      getHave(balanceValue),
    );
  const getGoalState = (balanceValue: number) =>
    isGoalTemplatesEnabled && goalValue != null
      ? getGoalFundingState(balanceValue, goalValue, getHave(balanceValue))
      : null;

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
        const goalState = getGoalState(balanceValue);
        const hasPill = !children && goalState != null;
        return (
          <>
            <View
              style={
                hasPill
                  ? // Fill the cell so the pill can fit itself to the space
                    {
                      minHeight: 'auto',
                      flex: '1 1 0',
                      minWidth: 0,
                      alignItems: 'flex-end',
                      containerType: 'inline-size',
                    }
                  : { minHeight: 'auto', flexShrink: 0, maxWidth: '100%' }
              }
            >
              {children ? (
                children(
                  {
                    type,
                    name,
                    value: balanceValue,
                    className: getDefaultClassName(balanceValue),
                  },
                  goalState,
                )
              ) : goalState ? (
                <GoalStatusPill
                  state={goalState}
                  className={getDefaultClassName(balanceValue)}
                >
                  <CellValueText
                    type={type}
                    name={name}
                    value={balanceValue}
                    className={css({
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    })}
                  />
                </GoalStatusPill>
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
        );
      }}
    </CellValue>
  );
}

const GOAL_STATUS_PILLS = {
  underfunded: {
    Icon: SvgTime,
    colors: {
      backgroundColor: theme.templatePillUnderFundedBackground,
      color: theme.templatePillUnderFundedText,
    },
  },
  funded: {
    Icon: SvgCheckmark,
    colors: {
      backgroundColor: theme.templatePillFundedBackground,
      color: theme.templatePillFundedText,
    },
  },
  overspent: {
    Icon: SvgExclamationOutline,
    colors: {
      backgroundColor: theme.templatePillOverspentBackground,
      color: theme.templatePillOverspentText,
    },
  },
} satisfies Record<
  GoalFundingState,
  { Icon: ComponentType<SVGProps<SVGSVGElement>>; colors: CSSProperties }
>;

export function getGoalStatusPill(state: GoalFundingState, t: TFunction) {
  const labels = {
    underfunded: t('Underfunded'),
    funded: t('Funded'),
    overspent: t('Overspent'),
  } satisfies Record<GoalFundingState, string>;
  return { ...GOAL_STATUS_PILLS[state], label: labels[state] };
}

type GoalStatusPillProps = {
  state: GoalFundingState;
  className: string;
  children: ReactNode;
};

function GoalStatusPill({ state, className, children }: GoalStatusPillProps) {
  const { t } = useTranslation();
  const { Icon, colors, label } = getGoalStatusPill(state, t);
  return (
    <span
      className={cx(
        className,
        css({
          ...colors,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          borderRadius: 12,
          padding: '2px 7px',
          lineHeight: '18px',
          maxWidth: '100%',
          // Narrow month columns keep the colour but drop the icon to fit the amount
          '@container (max-width: 100px)': {
            padding: '2px 4px',
            '& > svg': { display: 'none' },
          },
        }),
      )}
      data-goal-status={state}
    >
      <Icon
        aria-hidden="true"
        width={12}
        height={12}
        style={{ flexShrink: 0 }}
      />
      <span className={css(styles.visuallyHidden)}>
        {t('{{status}}:', { status: label })}{' '}
      </span>
      {children}
    </span>
  );
}
