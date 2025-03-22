import React, {
  type ComponentProps,
  type CSSProperties,
  memo,
  useRef,
  useState,
} from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { envelopeBudget } from 'loot-core/client/queries';
import { evalArithmetic } from 'loot-core/shared/arithmetic';
import * as monthUtils from 'loot-core/shared/months';
import { integerToCurrency, amountToInteger } from 'loot-core/shared/util';
import {
  type CategoryGroupEntity,
  type CategoryEntity,
} from 'loot-core/types/models';

import { useContextMenu } from '../../../hooks/useContextMenu';
import { useUndo } from '../../../hooks/useUndo';
import { type Binding, type SheetFields } from '../../spreadsheet';
import { CellValue, CellValueText } from '../../spreadsheet/CellValue';
import { useSheetName } from '../../spreadsheet/useSheetName';
import { useSheetValue } from '../../spreadsheet/useSheetValue';
import { Row, Field, SheetCell, type SheetCellProps } from '../../table';
import { BalanceWithCarryover } from '../BalanceWithCarryover';
import { makeAmountGrey } from '../util';

import { BalanceMenu } from './BalanceMenu';
import { BudgetMenu } from './BudgetMenu';
import { CoverMenu } from './CoverMenu';
import { TransferMenu } from './TransferMenu';

export function useEnvelopeSheetName<
  FieldName extends SheetFields<'envelope-budget'>,
>(binding: Binding<'envelope-budget', FieldName>) {
  return useSheetName(binding);
}

export function useEnvelopeSheetValue<
  FieldName extends SheetFields<'envelope-budget'>,
>(binding: Binding<'envelope-budget', FieldName>) {
  return useSheetValue(binding);
}

export const EnvelopeCellValue = <
  FieldName extends SheetFields<'envelope-budget'>,
>(
  props: ComponentProps<typeof CellValue<'envelope-budget', FieldName>>,
) => {
  return <CellValue {...props} />;
};

const EnvelopeSheetCell = <FieldName extends SheetFields<'envelope-budget'>>(
  props: SheetCellProps<'envelope-budget', FieldName>,
) => {
  return <SheetCell {...props} />;
};

const headerLabelStyle: CSSProperties = {
  flex: 1,
  padding: '0 5px',
  textAlign: 'right',
};

const cellStyle: CSSProperties = {
  color: theme.tableHeaderText,
  fontWeight: 600,
};

export const BudgetTotalsMonth = memo(function BudgetTotalsMonth() {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        marginRight: styles.monthRightPadding,
        paddingTop: 10,
        paddingBottom: 10,
      }}
    >
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText }}>
          <Trans>Budgeted</Trans>
        </Text>
        <EnvelopeCellValue
          binding={envelopeBudget.totalBudgeted}
          type="financial"
        >
          {props => (
            <CellValueText {...props} value={-props.value} style={cellStyle} />
          )}
        </EnvelopeCellValue>
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText }}>Spent</Text>
        <EnvelopeCellValue binding={envelopeBudget.totalSpent} type="financial">
          {props => <CellValueText {...props} style={cellStyle} />}
        </EnvelopeCellValue>
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText }}>Balance</Text>
        <EnvelopeCellValue
          binding={envelopeBudget.totalBalance}
          type="financial"
        >
          {props => <CellValueText {...props} style={cellStyle} />}
        </EnvelopeCellValue>
      </View>
    </View>
  );
});

export function IncomeHeaderMonth() {
  return (
    <Row
      style={{
        color: theme.tableHeaderText,
        alignItems: 'center',
        paddingRight: 10,
      }}
    >
      <View style={{ flex: 1, textAlign: 'right' }}>
        <Trans>Received</Trans>
      </View>
    </Row>
  );
}

type ExpenseGroupMonthProps = {
  month: string;
  group: CategoryGroupEntity;
};
export const ExpenseGroupMonth = memo(function ExpenseGroupMonth({
  month,
  group,
}: ExpenseGroupMonthProps) {
  const { id } = group;

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetHeaderCurrentMonth
          : theme.budgetHeaderOtherMonth,
      }}
    >
      <EnvelopeSheetCell
        name="budgeted"
        width="flex"
        textAlign="right"
        style={{ fontWeight: 600, ...styles.tnum }}
        valueProps={{
          binding: envelopeBudget.groupBudgeted(id),
          type: 'financial',
        }}
      />
      <EnvelopeSheetCell
        name="spent"
        width="flex"
        textAlign="right"
        style={{ fontWeight: 600, ...styles.tnum }}
        valueProps={{
          binding: envelopeBudget.groupSumAmount(id),
          type: 'financial',
        }}
      />
      <EnvelopeSheetCell
        name="balance"
        width="flex"
        textAlign="right"
        style={{
          fontWeight: 600,
          paddingRight: styles.monthRightPadding,
          ...styles.tnum,
        }}
        valueProps={{
          binding: envelopeBudget.groupBalance(id),
          type: 'financial',
        }}
      />
    </View>
  );
});

type ExpenseCategoryMonthProps = {
  month: string;
  category: CategoryEntity;
  editing: boolean;
  onEdit: (id: CategoryEntity['id'] | null, month?: string) => void;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onShowActivity: (id: CategoryEntity['id'], month: string) => void;
};
export const ExpenseCategoryMonth = memo(function ExpenseCategoryMonth({
  month,
  category,
  editing,
  onEdit,
  onBudgetAction,
  onShowActivity,
}: ExpenseCategoryMonthProps) {
  const { t } = useTranslation();

  const budgetMenuTriggerRef = useRef(null);
  const balanceMenuTriggerRef = useRef(null);
  const {
    setMenuOpen: setBudgetMenuOpen,
    menuOpen: budgetMenuOpen,
    handleContextMenu: handleBudgetContextMenu,
    resetPosition: resetBudgetPosition,
    position: budgetPosition,
  } = useContextMenu();
  const {
    setMenuOpen: setBalanceMenuOpen,
    menuOpen: balanceMenuOpen,
    handleContextMenu: handleBalanceContextMenu,
    resetPosition: resetBalancePosition,
    position: balancePosition,
  } = useContextMenu();

  const onMenuAction = (...args: Parameters<typeof onBudgetAction>) => {
    onBudgetAction(...args);
    setBudgetMenuOpen(false);
  };

  const { showUndoNotification } = useUndo();
  const [activeBalanceMenu, setActiveBalanceMenu] = useState<
    'balance' | 'transfer' | 'cover' | null
  >(null);
  const catBalance = useEnvelopeSheetValue(
    envelopeBudget.catBalance(category.id),
  );

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetCurrentMonth
          : theme.budgetOtherMonth,
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        '&:hover .hover-visible': {
          opacity: 1,
        },
      }}
    >
      <View
        ref={budgetMenuTriggerRef}
        style={{
          flex: 1,
          flexDirection: 'row',
        }}
        onContextMenu={e => {
          if (editing) return;
          handleBudgetContextMenu(e);
        }}
      >
        {!editing && (
          <View
            style={{
              flexDirection: 'row',
              flexShrink: 1,
              paddingLeft: 3,
              alignItems: 'center',
              justifyContent: 'center',
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: theme.tableBorder,
            }}
          >
            <Button
              variant="bare"
              onPress={() => {
                resetBudgetPosition(2, -4);
                setBudgetMenuOpen(true);
              }}
              style={{
                padding: 3,
              }}
            >
              <SvgCheveronDown
                width={14}
                height={14}
                className="hover-visible"
                style={budgetMenuOpen ? { opacity: 1 } : {}}
              />
            </Button>

            <Popover
              triggerRef={budgetMenuTriggerRef}
              placement="bottom left"
              isOpen={budgetMenuOpen}
              onOpenChange={() => setBudgetMenuOpen(false)}
              style={{ width: 200 }}
              isNonModal
              {...budgetPosition}
            >
              <BudgetMenu
                onCopyLastMonthAverage={() => {
                  onMenuAction(month, 'copy-single-last', {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: t(`Budget set to last month’s budget.`),
                  });
                }}
                onSetMonthsAverage={numberOfMonths => {
                  if (
                    numberOfMonths !== 3 &&
                    numberOfMonths !== 6 &&
                    numberOfMonths !== 12
                  ) {
                    return;
                  }

                  onMenuAction(month, `set-single-${numberOfMonths}-avg`, {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: t(
                      'Budget set to {{numberOfMonths}}-month average.',
                      { numberOfMonths },
                    ),
                  });
                }}
                onApplyBudgetTemplate={() => {
                  onMenuAction(month, 'apply-single-category-template', {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: t(`Budget template applied.`),
                  });
                }}
              />
            </Popover>
          </View>
        )}
        <EnvelopeSheetCell
          name="budget"
          exposed={editing}
          focused={editing}
          width="flex"
          onExpose={() => onEdit(category.id, month)}
          style={{ ...(editing && { zIndex: 100 }), ...styles.tnum }}
          textAlign="right"
          valueStyle={{
            cursor: 'default',
            margin: 1,
            padding: '0 4px',
            borderRadius: 4,
            ':hover': {
              boxShadow: 'inset 0 0 0 1px ' + theme.mobileAccountShadow,
              backgroundColor: theme.tableBackground,
            },
          }}
          valueProps={{
            binding: envelopeBudget.catBudgeted(category.id),
            type: 'financial',
            getValueStyle: makeAmountGrey,
            formatExpr: expr => {
              return integerToCurrency(expr);
            },
            unformatExpr: expr => {
              return amountToInteger(evalArithmetic(expr, 0));
            },
          }}
          inputProps={{
            onBlur: () => {
              onEdit(null);
            },
            style: {
              backgroundColor: theme.tableBackground,
            },
          }}
          onSave={amount => {
            onBudgetAction(month, 'budget-amount', {
              category: category.id,
              amount,
            });
          }}
        />
      </View>
      <Field name="spent" width="flex" style={{ textAlign: 'right' }}>
        <span
          data-testid="category-month-spent"
          onClick={() => onShowActivity(category.id, month)}
        >
          <EnvelopeCellValue
            binding={envelopeBudget.catSumAmount(category.id)}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                className={css({
                  cursor: 'pointer',
                  ':hover': { textDecoration: 'underline' },
                  ...makeAmountGrey(props.value),
                })}
              />
            )}
          </EnvelopeCellValue>
        </span>
      </Field>
      <Field
        ref={balanceMenuTriggerRef}
        name="balance"
        width="flex"
        style={{ paddingRight: styles.monthRightPadding, textAlign: 'right' }}
      >
        <span
          onClick={() => {
            resetBalancePosition(-6, -4);
            setBalanceMenuOpen(true);
            setActiveBalanceMenu('balance');
          }}
          onContextMenu={e => {
            handleBalanceContextMenu(e);
            // We need to calculate differently from the hook ue to being aligned to the right
            const rect = e.currentTarget.getBoundingClientRect();
            resetBalancePosition(
              e.clientX - rect.right + 200 - 8,
              e.clientY - rect.bottom - 8,
            );
          }}
        >
          <BalanceWithCarryover
            carryover={envelopeBudget.catCarryover(category.id)}
            balance={envelopeBudget.catBalance(category.id)}
            goal={envelopeBudget.catGoal(category.id)}
            budgeted={envelopeBudget.catBudgeted(category.id)}
            longGoal={envelopeBudget.catLongGoal(category.id)}
          />
        </span>

        <Popover
          triggerRef={balanceMenuTriggerRef}
          placement="bottom end"
          isOpen={balanceMenuOpen && activeBalanceMenu !== null}
          onOpenChange={() => {
            if (activeBalanceMenu !== 'balance') {
              setBalanceMenuOpen(false);
              setActiveBalanceMenu(null);
            }
          }}
          style={{ width: 200, margin: 1 }}
          isNonModal
          {...balancePosition}
        >
          {activeBalanceMenu === 'balance' && (
            <BalanceMenu
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
              initialAmount={catBalance}
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
        </Popover>
      </Field>
    </View>
  );
});

type IncomeGroupMonthProps = {
  month: string;
};
export function IncomeGroupMonth({ month }: IncomeGroupMonthProps) {
  return (
    <View style={{ flex: 1 }}>
      <EnvelopeSheetCell
        name="received"
        width="flex"
        textAlign="right"
        style={{
          fontWeight: 600,
          paddingRight: styles.monthRightPadding,
          ...styles.tnum,
          backgroundColor: monthUtils.isCurrentMonth(month)
            ? theme.budgetHeaderCurrentMonth
            : theme.budgetHeaderOtherMonth,
        }}
        valueProps={{
          binding: envelopeBudget.groupIncomeReceived,
          type: 'financial',
        }}
      />
    </View>
  );
}

type IncomeCategoryMonthProps = {
  category: CategoryEntity;
  isLast: boolean;
  month: string;
  onShowActivity: (id: CategoryEntity['id'], month: string) => void;
};
export function IncomeCategoryMonth({
  category,
  isLast,
  month,
  onShowActivity,
}: IncomeCategoryMonthProps) {
  return (
    <View style={{ flex: 1 }}>
      <Field
        name="received"
        width="flex"
        style={{
          paddingRight: styles.monthRightPadding,
          textAlign: 'right',
          ...(isLast && { borderBottomWidth: 0 }),
          backgroundColor: monthUtils.isCurrentMonth(month)
            ? theme.budgetCurrentMonth
            : theme.budgetOtherMonth,
        }}
      >
        <span onClick={() => onShowActivity(category.id, month)}>
          <EnvelopeCellValue
            binding={envelopeBudget.catSumAmount(category.id)}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                className={css({
                  cursor: 'pointer',
                  ':hover': { textDecoration: 'underline' },
                  ...makeAmountGrey(props.value),
                })}
              />
            )}
          </EnvelopeCellValue>
        </span>
      </Field>
    </View>
  );
}

export { BudgetSummary } from './budgetsummary/BudgetSummary';
