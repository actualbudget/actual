import React, {
  type ComponentPropsWithoutRef,
  useRef,
  useState,
  useCallback,
} from 'react';
import { usePress, useFocusable } from 'react-aria';
import { Cell as ReactAriaCell } from 'react-aria-components';

import { SvgArrowThinRight } from '@actual-app/components/icons/v1';
import { Popover } from '@actual-app/components/popover';
import { type CSSProperties } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import * as monthUtils from 'loot-core/shared/months';
import { type CategoryEntity } from 'loot-core/types/models';

import { balanceColumnPaddingStyle } from './BudgetCategoriesV2';
import { BalanceMovementMenu as EnvelopeBalanceMovementMenu } from './envelope/BalanceMovementMenu';
import { BalanceMenu as TrackingBalanceMenu } from './tracking/BalanceMenu';
import { makeBalanceAmountStyle } from './util';

import {
  CellValue,
  CellValueText,
} from '@desktop-client/components/spreadsheet/CellValue';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { type SheetNames } from '@desktop-client/spreadsheet';
import {
  envelopeBudget,
  trackingBudget,
} from '@desktop-client/spreadsheet/bindings';

type CategoryBalanceCellProps = ComponentPropsWithoutRef<
  typeof ReactAriaCell
> & {
  month: string;
  category: CategoryEntity;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
};

export function CategoryBalanceCell({
  month,
  category,
  onBudgetAction,
  style,
  ...props
}: CategoryBalanceCellProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const triggerRef = useRef<HTMLSpanElement | null>(null);

  const bindingBudgetType: SheetNames =
    budgetType === 'rollover' ? 'envelope-budget' : 'tracking-budget';

  const categoryCarryoverBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.catCarryover(category.id)
      : trackingBudget.catCarryover(category.id);

  const categoryBalanceBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.catBalance(category.id)
      : trackingBudget.catBalance(category.id);

  const categoryBudgetedBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.catBudgeted(category.id)
      : trackingBudget.catBudgeted(category.id);

  const categoryGoalBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.catGoal(category.id)
      : trackingBudget.catGoal(category.id);

  const categoryLongGoalBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.catLongGoal(category.id)
      : trackingBudget.catLongGoal(category.id);

  const budgetedValue = useSheetValue<
    typeof bindingBudgetType,
    typeof categoryBudgetedBinding
  >(categoryBudgetedBinding);

  const balanceValue = useSheetValue<
    typeof bindingBudgetType,
    typeof categoryBalanceBinding
  >(categoryBalanceBinding);

  const goalValue = useSheetValue<
    typeof bindingBudgetType,
    typeof categoryGoalBinding
  >(categoryGoalBinding);

  const longGoalValue = useSheetValue<
    typeof bindingBudgetType,
    typeof categoryLongGoalBinding
  >(categoryLongGoalBinding);

  const [isBalanceMenuOpen, setIsBalanceMenuOpen] = useState(false);

  const [activeBalanceMenu, setActiveBalanceMenu] = useState<
    'balance' | 'transfer' | 'cover' | null
  >(null);

  const { pressProps } = usePress({
    onPress: () => setIsBalanceMenuOpen(true),
  });

  const { focusableProps } = useFocusable(
    {
      onKeyUp: e => {
        if (e.key === 'Enter') {
          setIsBalanceMenuOpen(true);
        }
      },
    },
    triggerRef,
  );

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

  // TODO: Refactor balance cell tooltips
  return (
    <ReactAriaCell style={{ textAlign: 'right', ...style }} {...props}>
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
        <CellValue<typeof bindingBudgetType, typeof categoryBalanceBinding>
          type="financial"
          binding={categoryBalanceBinding}
        >
          {balanceProps => (
            <View
              style={{
                position: 'relative',
                display: 'inline-block',
                ...balanceColumnPaddingStyle,
              }}
            >
              <CellValueText
                innerRef={triggerRef}
                {...pressProps}
                {...focusableProps}
                {...balanceProps}
                className={css({
                  ...getBalanceAmountStyle(balanceProps.value),
                  '&:hover': {
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  },
                })}
              />
              <CellValue<
                typeof bindingBudgetType,
                typeof categoryCarryoverBinding
              >
                binding={categoryCarryoverBinding}
              >
                {carryOverProps =>
                  carryOverProps.value && (
                    <CarryoverIndicator
                      style={getBalanceAmountStyle(balanceProps.value)}
                    />
                  )
                }
              </CellValue>
            </View>
          )}
        </CellValue>
        <Popover
          triggerRef={triggerRef}
          placement="bottom end"
          isOpen={isBalanceMenuOpen}
          onOpenChange={() => {
            setIsBalanceMenuOpen(false);
          }}
          isNonModal
        >
          {budgetType === 'rollover' ? (
            <EnvelopeBalanceMovementMenu
              categoryId={category.id}
              month={month}
              onBudgetAction={onBudgetAction}
              onSelect={() => setIsBalanceMenuOpen(false)}
            />
          ) : (
            <TrackingBalanceMenu
              categoryId={category.id}
              onCarryover={carryover => {
                onBudgetAction(month, 'carryover', {
                  category: category.id,
                  flag: carryover,
                });
                setIsBalanceMenuOpen(false);
              }}
            />
          )}
        </Popover>
      </SheetNameProvider>
    </ReactAriaCell>
  );
}
type CarryoverIndicatorProps = {
  style?: CSSProperties;
};

function CarryoverIndicator({ style }: CarryoverIndicatorProps) {
  return (
    <View
      style={{
        position: 'absolute',
        right: 0,
        transform: 'translateY(-50%)',
        top: '50%',
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
