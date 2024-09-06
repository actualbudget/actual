// @ts-strict-ignore
import React, {
  type ComponentType,
  type ComponentPropsWithoutRef,
  useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { SvgArrowThinRight } from '../../icons/v1';
import { type CSSProperties, theme, styles } from '../../style';
import { Tooltip } from '../common/Tooltip';
import { View } from '../common/View';
import { type Binding } from '../spreadsheet';
import { CellValue, DefaultCellValueText } from '../spreadsheet/CellValue';
import { useFormat } from '../spreadsheet/useFormat';
import { useSheetValue } from '../spreadsheet/useSheetValue';

import { makeBalanceAmountStyle } from './util';

type CarryoverIndicatorProps = {
  style?: CSSProperties;
};

export function DefaultCarryoverIndicator({ style }: CarryoverIndicatorProps) {
  return (
    <View
      style={{
        marginLeft: 2,
        position: 'absolute',
        right: '-4px',
        alignSelf: 'center',
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

type BalanceWithCarryoverProps = Omit<
  ComponentPropsWithoutRef<typeof CellValue>,
  'binding'
> & {
  carryover: Binding<'rollover-budget', 'carryover'>;
  balance: Binding<'rollover-budget', 'leftover'>;
  goal: Binding<'rollover-budget', 'goal'>;
  budgeted: Binding<'rollover-budget', 'budget'>;
  longGoal: Binding<'rollover-budget', 'long-goal'>;
  disabled?: boolean;
  CarryoverIndicator?: ComponentType<CarryoverIndicatorProps>;
};

export function BalanceWithCarryover({
  carryover,
  balance,
  goal,
  budgeted,
  longGoal,
  disabled,
  CarryoverIndicator = DefaultCarryoverIndicator,
  children,
  ...props
}: BalanceWithCarryoverProps) {
  const { t } = useTranslation();
  const carryoverValue = useSheetValue(carryover);
  const goalValue = useSheetValue(goal);
  const budgetedValue = useSheetValue(budgeted);
  const longGoalValue = useSheetValue(longGoal);
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const getBalanceStyle = useCallback(
    (balanceValue: number) =>
      makeBalanceAmountStyle(
        balanceValue,
        isGoalTemplatesEnabled ? goalValue : null,
        longGoalValue === 1 ? balanceValue : budgetedValue,
      ),
    [budgetedValue, goalValue, isGoalTemplatesEnabled, longGoalValue],
  );
  const format = useFormat();

  const differenceToGoal = useCallback(
    (balanceValue: number) =>
      longGoalValue === 1
        ? balanceValue - goalValue
        : budgetedValue - goalValue,
    [budgetedValue, goalValue, longGoalValue],
  );

  return (
    <CellValue binding={balance} type="financial" {...props}>
      {({ type, name, value: balanceValue }) => (
        <>
          {children ? (
            children({ type, name, value: balanceValue })
          ) : (
            <Tooltip
              content={
                <View style={{ padding: 10 }}>
                  <span style={{ fontWeight: 'bold' }}>
                    {differenceToGoal(balanceValue) === 0 ? (
                      <span style={{ color: theme.noticeText }}>
                        {t('Fully funded')}
                      </span>
                    ) : differenceToGoal(balanceValue) > 0 ? (
                      <span style={{ color: theme.noticeText }}>
                        {t('Overfunded ({{amount}})', {
                          amount: format(differenceToGoal, 'financial'),
                        })}
                      </span>
                    ) : (
                      <span style={{ color: theme.errorText }}>
                        {t('Underfunded ({{amount}})', {
                          amount: format(differenceToGoal, 'financial'),
                        })}
                      </span>
                    )}
                  </span>
                  <GoalTooltipRow>
                    <div>{t('Goal Type:')}</div>
                    <div>{longGoalValue === 1 ? 'Long' : 'Template'}</div>
                  </GoalTooltipRow>
                  <GoalTooltipRow>
                    <div>{t('Goal:')}</div>
                    <div>{format(goalValue, 'financial')}</div>
                  </GoalTooltipRow>
                  <GoalTooltipRow>
                    {longGoalValue !== 1 ? (
                      <>
                        <div>{t('Budgeted:')}</div>
                        <div>{format(budgetedValue, 'financial')}</div>
                      </>
                    ) : (
                      <>
                        <div>{t('Balance:')}</div>
                        <div>{format(balanceValue, type)}</div>
                      </>
                    )}
                  </GoalTooltipRow>
                </View>
              }
              style={{ ...styles.tooltip, borderRadius: '0px 5px 5px 0px' }}
              placement="bottom"
              triggerProps={{
                delay: 750,
                isDisabled: !isGoalTemplatesEnabled || goalValue == null,
              }}
            >
              <DefaultCellValueText
                type={type}
                name={name}
                value={balanceValue}
                style={{
                  ...getBalanceStyle(balanceValue),
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: 'right',
                  ...(!disabled && {
                    cursor: 'pointer',
                  }),
                  ':hover': { textDecoration: 'underline' },
                }}
              />
            </Tooltip>
          )}
          {carryoverValue && (
            <CarryoverIndicator style={getBalanceStyle(balanceValue)} />
          )}
        </>
      )}
    </CellValue>
  );
}
