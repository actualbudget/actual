// @ts-strict-ignore
import React, {
  type ComponentType,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  useCallback,
} from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { css } from '@emotion/css';

import { type TransObjectLiteral } from 'loot-core/types/util';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { SvgArrowThinRight } from '../../icons/v1';
import { theme, styles } from '../../style';
import { Tooltip } from '../common/Tooltip';
import { View } from '../common/View';
import { useResponsive } from '../responsive/ResponsiveProvider';
import { type Binding } from '../spreadsheet';
import { CellValue, CellValueText } from '../spreadsheet/CellValue';
import { useFormat } from '../spreadsheet/useFormat';
import { useSheetValue } from '../spreadsheet/useSheetValue';

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
  carryover: Binding<'envelope-budget', 'carryover'>;
  balance: Binding<'envelope-budget', 'leftover'>;
  goal: Binding<'envelope-budget', 'goal'>;
  budgeted: Binding<'envelope-budget', 'budget'>;
  longGoal: Binding<'envelope-budget', 'long-goal'>;
  isDisabled?: boolean;
  CarryoverIndicator?: ComponentType<CarryoverIndicatorProps>;
};

export function BalanceWithCarryover({
  carryover,
  balance,
  goal,
  budgeted,
  longGoal,
  isDisabled,
  CarryoverIndicator: CarryoverIndicatorComponent = CarryoverIndicator,
  children,
  ...props
}: BalanceWithCarryoverProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
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
  const format = useFormat();

  const getDifferenceToGoal = useCallback(
    (balanceValue: number) =>
      longGoalValue === 1
        ? balanceValue - goalValue
        : budgetedValue - goalValue,
    [budgetedValue, goalValue, longGoalValue],
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
        }),
        ':hover': { textDecoration: 'underline' },
      }),
    [getBalanceAmountStyle, isDisabled],
  );

  return (
    <CellValue binding={balance} type="financial" {...props}>
      {({ type, name, value: balanceValue }) => (
        <>
          <Tooltip
            content={
              <View style={{ padding: 10 }}>
                <span style={{ fontWeight: 'bold' }}>
                  {getDifferenceToGoal(balanceValue) === 0 ? (
                    <span style={{ color: theme.noticeText }}>
                      <Trans>Fully funded</Trans>
                    </span>
                  ) : getDifferenceToGoal(balanceValue) > 0 ? (
                    <span style={{ color: theme.noticeText }}>
                      <Trans>
                        Overfunded (
                        {{
                          amount: format(
                            getDifferenceToGoal(balanceValue),
                            'financial',
                          ),
                        }}
                        )
                      </Trans>
                    </span>
                  ) : (
                    <span style={{ color: theme.errorText }}>
                      <Trans>
                        Underfunded (
                        {{
                          amount: format(
                            getDifferenceToGoal(balanceValue),
                            'financial',
                          ),
                        }}
                        )
                      </Trans>
                    </span>
                  )}
                </span>
                <GoalTooltipRow>
                  <Trans>
                    <div>Goal Type:</div>
                    <div>
                      {
                        {
                          type: longGoalValue === 1 ? t('Long') : t('Template'),
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
                            amount: format(balanceValue, type),
                          } as TransObjectLiteral
                        }
                      </div>
                    </Trans>
                  )}
                </GoalTooltipRow>
              </View>
            }
            style={{ ...styles.tooltip, borderRadius: '0px 5px 5px 0px' }}
            placement="bottom"
            triggerProps={{
              delay: 750,
              isDisabled:
                !isGoalTemplatesEnabled || goalValue == null || isNarrowWidth,
            }}
          >
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
          </Tooltip>

          {carryoverValue && (
            <CarryoverIndicatorComponent
              style={getBalanceAmountStyle(balanceValue)}
            />
          )}
        </>
      )}
    </CellValue>
  );
}
