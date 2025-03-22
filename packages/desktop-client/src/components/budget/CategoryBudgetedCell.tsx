import React, { type ComponentPropsWithoutRef, useState } from 'react';
import { useFocusVisible } from 'react-aria';
import { Cell as ReactAriaCell, DialogTrigger } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import { envelopeBudget, trackingBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';
import {
  currencyToAmount,
  currencyToInteger,
  type IntegerAmount,
} from 'loot-core/shared/util';
import type { CategoryEntity } from 'loot-core/types/models';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import { useUndo } from '../../hooks/useUndo';
import type { SheetNames } from '../spreadsheet';
import { CellValue } from '../spreadsheet/CellValue';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';
import { useFormat } from '../spreadsheet/useFormat';

import {
  hoverVisibleStyle,
  getCellBackgroundStyle,
} from './BudgetCategoriesV2';
import { BudgetMenu as EnvelopeBudgetMenu } from './envelope/BudgetMenu';
import { BudgetMenu as TrackingBudgetMenu } from './tracking/BudgetMenu';
import { makeAmountGrey } from './util';

type CategoryBudgetedCellProps = ComponentPropsWithoutRef<
  typeof ReactAriaCell
> & {
  month: string;
  category: CategoryEntity;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
};

export function CategoryBudgetedCell({
  month,
  category,
  onBudgetAction,
  ...props
}: CategoryBudgetedCellProps) {
  const { t } = useTranslation();
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [shouldHideBudgetMenuButton, setShouldHideBudgetMenuButton] =
    useState(false);

  const bindingBudgetType: SheetNames =
    budgetType === 'rollover' ? 'envelope-budget' : 'tracking-budget';

  const budgetedBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.catBudgeted(category.id)
      : trackingBudget.catBudgeted(category.id);

  const BudgetMenuComponent =
    bindingBudgetType === 'envelope-budget'
      ? EnvelopeBudgetMenu
      : TrackingBudgetMenu;

  const { showUndoNotification } = useUndo();

  const onUpdateBudget = (amount: IntegerAmount) => {
    onBudgetAction(month, 'budget-amount', {
      category: category.id,
      amount,
    });
  };

  const { isFocusVisible } = useFocusVisible();

  return (
    <ReactAriaCell {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <View
          className={css({
            flexDirection: 'row',
            alignItems: 'center',
            ...hoverVisibleStyle,
          })}
        >
          <DialogTrigger>
            <Button
              variant="bare"
              aria-label={t('Budget menu')}
              className={cx(
                { 'hover-visible': !isMenuOpen && !isFocusVisible },
                css({
                  display:
                    shouldHideBudgetMenuButton && !isFocusVisible
                      ? 'none'
                      : undefined,
                }),
              )}
              onPress={() => setIsMenuOpen(true)}
            >
              <SvgCheveronDown width={12} height={12} />
            </Button>

            <Popover
              placement="bottom start"
              isOpen={isMenuOpen}
              onOpenChange={() => setIsMenuOpen(false)}
              isNonModal
            >
              <BudgetMenuComponent
                onCopyLastMonthAverage={() => {
                  onBudgetAction(month, 'copy-single-last', {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: t(`Budget set to last month’s budget.`),
                  });
                  setIsMenuOpen(false);
                }}
                onSetMonthsAverage={numberOfMonths => {
                  if (
                    numberOfMonths !== 3 &&
                    numberOfMonths !== 6 &&
                    numberOfMonths !== 12
                  ) {
                    return;
                  }
                  onBudgetAction(month, `set-single-${numberOfMonths}-avg`, {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: t(
                      'Budget set to {{numberOfMonths}}-month average.',
                      { numberOfMonths },
                    ),
                  });
                  setIsMenuOpen(false);
                }}
                onApplyBudgetTemplate={() => {
                  onBudgetAction(month, 'apply-single-category-template', {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: t(`Budget template applied.`),
                  });
                  setIsMenuOpen(false);
                }}
              />
            </Popover>
          </DialogTrigger>
          <View style={{ flex: 1 }}>
            <CellValue<typeof bindingBudgetType, typeof budgetedBinding>
              type="financial"
              binding={budgetedBinding}
            >
              {({ value: budgetedAmount }) => (
                <BudgetedInput
                  value={budgetedAmount}
                  onFocus={() => setShouldHideBudgetMenuButton(true)}
                  onBlur={() => setShouldHideBudgetMenuButton(false)}
                  style={getCellBackgroundStyle('budgeted', month)}
                  onUpdateAmount={onUpdateBudget}
                />
              )}
            </CellValue>
          </View>
        </View>
      </NamespaceContext.Provider>
    </ReactAriaCell>
  );
}

type BudgetedInputProps = Omit<
  ComponentPropsWithoutRef<typeof Input>,
  'value'
> & {
  value: IntegerAmount;
  onUpdateAmount: (newValue: IntegerAmount) => void;
};

function BudgetedInput({
  value,
  onFocus,
  onChangeValue,
  onUpdate,
  onUpdateAmount,
  ...props
}: BudgetedInputProps) {
  const format = useFormat();
  const [currentFormattedAmount, setCurrentFormattedAmount] = useState<
    string | null
  >(null);

  return (
    <Input
      value={currentFormattedAmount ?? format(value, 'financial')}
      onFocus={e => {
        onFocus?.(e);
        if (!e.defaultPrevented) {
          e.target.select();
        }
      }}
      onEscape={() => setCurrentFormattedAmount(format(value, 'financial'))}
      className={css({
        ...makeAmountGrey(
          currentFormattedAmount
            ? currencyToAmount(currentFormattedAmount)
            : value,
        ),
        textAlign: 'right',
        border: '1px solid transparent',
        '&:hover:not(:focus)': {
          border: `1px solid ${theme.formInputBorder}`,
        },
      })}
      onChangeValue={newValue => {
        onChangeValue?.(newValue);
        setCurrentFormattedAmount(newValue);
      }}
      onUpdate={newValue => {
        onUpdate?.(newValue);
        const integerAmount = currencyToInteger(newValue);
        onUpdateAmount?.(integerAmount);
        setCurrentFormattedAmount(format(integerAmount, 'financial'));
      }}
      {...props}
    />
  );
}
