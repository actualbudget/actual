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

import { envelopeBudget, trackingBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';
import type { CategoryEntity } from 'loot-core/types/models';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useSyncedPref } from '../../hooks/useSyncedPref';
import type { SheetNames } from '../spreadsheet';
import { CellValue, CellValueText } from '../spreadsheet/CellValue';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';
import { useSheetValue } from '../spreadsheet/useSheetValue';

import { balanceColumnPaddingStyle } from './BudgetCategoriesV2';
import { BalanceMenu as EnvelopeBalanceMenu } from './envelope/BalanceMenu';
import { CoverMenu } from './envelope/CoverMenu';
import { TransferMenu } from './envelope/TransferMenu';
import { BalanceMenu as TrackingBalanceMenu } from './tracking/BalanceMenu';
import { makeBalanceAmountStyle } from './util';

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

  const [activeBalanceMenu, setActiveBalanceMenu] = useState<
    'balance' | 'transfer' | 'cover' | null
  >(null);

  const { pressProps } = usePress({
    onPress: () => setActiveBalanceMenu('balance'),
  });

  const { focusableProps } = useFocusable(
    {
      onKeyUp: e => {
        if (e.key === 'Enter') {
          setActiveBalanceMenu('balance');
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
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
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
          isOpen={activeBalanceMenu !== null}
          onOpenChange={() => {
            if (activeBalanceMenu !== 'balance') {
              setActiveBalanceMenu(null);
            }
          }}
          isNonModal
        >
          {budgetType === 'rollover' ? (
            <>
              {activeBalanceMenu === 'balance' && (
                <EnvelopeBalanceMenu
                  categoryId={category.id}
                  onCarryover={carryover => {
                    onBudgetAction(month, 'carryover', {
                      category: category.id,
                      flag: carryover,
                    });
                    setActiveBalanceMenu(null);
                  }}
                  onTransfer={() => setActiveBalanceMenu('transfer')}
                  onCover={() => setActiveBalanceMenu('cover')}
                />
              )}
              {activeBalanceMenu === 'transfer' && (
                <TransferMenu
                  categoryId={category.id}
                  initialAmount={balanceValue}
                  showToBeBudgeted={true}
                  onSubmit={(amount, toCategoryId) => {
                    onBudgetAction(month, 'transfer-category', {
                      amount,
                      from: category.id,
                      to: toCategoryId,
                    });
                  }}
                  onClose={() => setActiveBalanceMenu(null)}
                />
              )}
              {activeBalanceMenu === 'cover' && (
                <CoverMenu
                  categoryId={category.id}
                  onSubmit={fromCategoryId => {
                    onBudgetAction(month, 'cover-overspending', {
                      to: category.id,
                      from: fromCategoryId,
                    });
                  }}
                  onClose={() => setActiveBalanceMenu(null)}
                />
              )}
            </>
          ) : (
            <TrackingBalanceMenu
              categoryId={category.id}
              onCarryover={carryover => {
                onBudgetAction(month, 'carryover', {
                  category: category.id,
                  flag: carryover,
                });
                setActiveBalanceMenu(null);
              }}
            />
          )}
        </Popover>
      </NamespaceContext.Provider>
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
