// @ts-strict-ignore
import React, { type ComponentProps, memo, useRef, useState } from 'react';
import { Trans } from 'react-i18next';

import { css } from 'glamor';

import { trackingBudget } from 'loot-core/src/client/queries';
import { evalArithmetic } from 'loot-core/src/shared/arithmetic';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency, amountToInteger } from 'loot-core/src/shared/util';

import { useUndo } from '../../../hooks/useUndo';
import { SvgCheveronDown } from '../../../icons/v1';
import { styles, theme, type CSSProperties } from '../../../style';
import { Button } from '../../common/Button2';
import { Popover } from '../../common/Popover';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { type Binding, type SheetFields } from '../../spreadsheet';
import { CellValue, CellValueText } from '../../spreadsheet/CellValue';
import { useSheetValue } from '../../spreadsheet/useSheetValue';
import { Field, SheetCell, type SheetCellProps } from '../../table';
import { BalanceWithCarryover } from '../BalanceWithCarryover';
import { makeAmountGrey } from '../util';

import { BalanceMenu } from './BalanceMenu';
import { BudgetMenu } from './BudgetMenu';

export const useTrackingSheetValue = <
  FieldName extends SheetFields<'tracking-budget'>,
>(
  binding: Binding<'tracking-budget', FieldName>,
) => {
  return useSheetValue(binding);
};

const TrackingCellValue = <FieldName extends SheetFields<'tracking-budget'>>(
  props: ComponentProps<typeof CellValue<'tracking-budget', FieldName>>,
) => {
  return <CellValue {...props} />;
};

const TrackingSheetCell = <FieldName extends SheetFields<'tracking-budget'>>(
  props: SheetCellProps<'tracking-budget', FieldName>,
) => {
  return <SheetCell {...props} />;
};

const headerLabelStyle: CSSProperties = {
  flex: 1,
  padding: '0 5px',
  textAlign: 'right',
};

const cellStyle: CSSProperties = {
  color: theme.pageTextLight,
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
        <Text style={{ color: theme.pageTextLight }}>
          <Trans>Budgeted</Trans>
        </Text>
        <TrackingCellValue
          binding={trackingBudget.totalBudgetedExpense}
          type="financial"
        >
          {props => <CellValueText {...props} style={cellStyle} />}
        </TrackingCellValue>
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.pageTextLight }}>
          <Trans>Spent</Trans>
        </Text>
        <TrackingCellValue binding={trackingBudget.totalSpent} type="financial">
          {props => <CellValueText {...props} style={cellStyle} />}
        </TrackingCellValue>
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.pageTextLight }}>
          <Trans>Balance</Trans>
        </Text>
        <TrackingCellValue
          binding={trackingBudget.totalLeftover}
          type="financial"
        >
          {props => <CellValueText {...props} style={cellStyle} />}
        </TrackingCellValue>
      </View>
    </View>
  );
});

export function IncomeHeaderMonth() {
  return (
    <View
      style={{
        flexDirection: 'row',
        marginRight: styles.monthRightPadding,
        paddingBottom: 5,
      }}
    >
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.pageTextLight }}>
          <Trans>Budgeted</Trans>
        </Text>
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.pageTextLight }}>
          <Trans>Received</Trans>
        </Text>
      </View>
    </View>
  );
}

type GroupMonthProps = {
  month: string;
  group: { id: string; is_income: boolean };
};
export const GroupMonth = memo(function GroupMonth({
  month,
  group,
}: GroupMonthProps) {
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
      <TrackingSheetCell
        name="budgeted"
        width="flex"
        textAlign="right"
        style={{ fontWeight: 600, ...styles.tnum }}
        valueProps={{
          binding: trackingBudget.groupBudgeted(id),
          type: 'financial',
        }}
      />
      <TrackingSheetCell
        name="spent"
        width="flex"
        textAlign="right"
        style={{ fontWeight: 600, ...styles.tnum }}
        valueProps={{
          binding: trackingBudget.groupSumAmount(id),
          type: 'financial',
        }}
      />
      {!group.is_income && (
        <TrackingSheetCell
          name="balance"
          width="flex"
          textAlign="right"
          style={{
            fontWeight: 600,
            paddingRight: styles.monthRightPadding,
            ...styles.tnum,
          }}
          valueProps={{
            binding: trackingBudget.groupBalance(id),
            type: 'financial',
          }}
        />
      )}
    </View>
  );
});

type CategoryMonthProps = {
  month: string;
  category: { id: string; name: string; is_income: boolean };
  editing: boolean;
  onEdit: (id: string | null, month?: string) => void;
  onBudgetAction: (month: string, action: string, arg: unknown) => void;
  onShowActivity: (id: string, month: string) => void;
};
export const CategoryMonth = memo(function CategoryMonth({
  month,
  category,
  editing,
  onEdit,
  onBudgetAction,
  onShowActivity,
}: CategoryMonthProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);

  const [balanceMenuOpen, setBalanceMenuOpen] = useState(false);
  const triggerBalanceMenuRef = useRef(null);

  const onMenuAction = (...args: Parameters<typeof onBudgetAction>) => {
    onBudgetAction(...args);
    setBalanceMenuOpen(false);
    setMenuOpen(false);
  };

  const { showUndoNotification } = useUndo();

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
        style={{
          flex: 1,
          flexDirection: 'row',
        }}
      >
        {!editing && (
          <View
            style={{
              flexDirection: 'row',
              flexShrink: 0,
              paddingLeft: 3,
              alignItems: 'center',
              justifyContent: 'center',
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: theme.tableBorder,
            }}
          >
            <Button
              ref={triggerRef}
              variant="bare"
              onPress={() => setMenuOpen(true)}
              style={{
                padding: 3,
              }}
            >
              <SvgCheveronDown
                width={14}
                height={14}
                className="hover-visible"
                style={menuOpen && { opacity: 1 }}
              />
            </Button>

            <Popover
              triggerRef={triggerRef}
              isOpen={menuOpen}
              onOpenChange={() => setMenuOpen(false)}
              placement="bottom start"
            >
              <BudgetMenu
                onCopyLastMonthAverage={() => {
                  onMenuAction(month, 'copy-single-last', {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: `Budget set to last month’s budget.`,
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
                    message: `Budget set to ${numberOfMonths}-month average.`,
                  });
                }}
                onApplyBudgetTemplate={() => {
                  onMenuAction(month, 'apply-single-category-template', {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: `Budget template applied.`,
                  });
                }}
              />
            </Popover>
          </View>
        )}
        <TrackingSheetCell
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
            binding: trackingBudget.catBudgeted(category.id),
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
          <TrackingCellValue
            binding={trackingBudget.catSumAmount(category.id)}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                className={String(
                  css({
                    cursor: 'pointer',
                    ':hover': {
                      textDecoration: 'underline',
                    },
                    ...makeAmountGrey(props.value),
                  }),
                )}
              />
            )}
          </TrackingCellValue>
        </span>
      </Field>

      {!category.is_income && (
        <Field
          name="balance"
          width="flex"
          style={{ paddingRight: styles.monthRightPadding, textAlign: 'right' }}
        >
          <span
            ref={triggerBalanceMenuRef}
            onClick={() => !category.is_income && setBalanceMenuOpen(true)}
          >
            <BalanceWithCarryover
              isDisabled={category.is_income}
              carryover={trackingBudget.catCarryover(category.id)}
              balance={trackingBudget.catBalance(category.id)}
              goal={trackingBudget.catGoal(category.id)}
              budgeted={trackingBudget.catBudgeted(category.id)}
              longGoal={trackingBudget.catLongGoal(category.id)}
            />
          </span>

          <Popover
            triggerRef={triggerBalanceMenuRef}
            isOpen={balanceMenuOpen}
            onOpenChange={() => setBalanceMenuOpen(false)}
            placement="bottom end"
          >
            <BalanceMenu
              categoryId={category.id}
              onCarryover={carryover => {
                onMenuAction(month, 'carryover', {
                  category: category.id,
                  flag: carryover,
                });
              }}
            />
          </Popover>
        </Field>
      )}
    </View>
  );
});

export { BudgetSummary } from './budgetsummary/BudgetSummary';

export const ExpenseGroupMonth = GroupMonth;
export const ExpenseCategoryMonth = CategoryMonth;

export const IncomeGroupMonth = GroupMonth;
export const IncomeCategoryMonth = CategoryMonth;
