// @ts-strict-ignore
import React, { memo, useRef, useState } from 'react';
import { Trans } from 'react-i18next';

import { reportBudget } from 'loot-core/src/client/queries';
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
import { CellValue, type CellValueProps } from '../../spreadsheet/CellValue';
import { useFormat } from '../../spreadsheet/useFormat';
import { useSheetValue } from '../../spreadsheet/useSheetValue';
import { Field, SheetCell, type SheetCellProps } from '../../table';
import { BalanceWithCarryover } from '../BalanceWithCarryover';
import { makeAmountGrey } from '../util';

import { BalanceMenu } from './BalanceMenu';
import { BudgetMenu } from './BudgetMenu';

export const useReportSheetValue = <
  FieldName extends SheetFields<'report-budget'>,
>(
  binding: Binding<'report-budget', FieldName>,
) => {
  return useSheetValue(binding);
};

const ReportCellValue = <FieldName extends SheetFields<'report-budget'>>(
  props: CellValueProps<'report-budget', FieldName>,
) => {
  return <CellValue {...props} />;
};

const ReportSheetCell = <FieldName extends SheetFields<'report-budget'>>(
  props: SheetCellProps<'report-budget', FieldName>,
) => {
  return <SheetCell {...props} />;
};

const headerLabelStyle: CSSProperties = {
  flex: 1,
  padding: '0 5px',
  textAlign: 'right',
};
export const BudgetTotalsMonth = memo(function BudgetTotalsMonth() {
  const format = useFormat();
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
        <ReportCellValue
          binding={reportBudget.totalBudgetedExpense}
          type="financial"
          style={{ color: theme.pageTextLight, fontWeight: 600 }}
          formatter={value => {
            return format(parseFloat(value || '0'), 'financial');
          }}
        />
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.pageTextLight }}>
          <Trans>Spent</Trans>
        </Text>
        <ReportCellValue
          binding={reportBudget.totalSpent}
          type="financial"
          style={{ color: theme.pageTextLight, fontWeight: 600 }}
        />
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.pageTextLight }}>
          <Trans>Balance</Trans>
        </Text>
        <ReportCellValue
          binding={reportBudget.totalLeftover}
          type="financial"
          style={{ color: theme.pageTextLight, fontWeight: 600 }}
        />
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
      <ReportSheetCell
        name="budgeted"
        width="flex"
        textAlign="right"
        style={{ fontWeight: 600, ...styles.tnum }}
        valueProps={{
          binding: reportBudget.groupBudgeted(id),
          type: 'financial',
        }}
      />
      <ReportSheetCell
        name="spent"
        width="flex"
        textAlign="right"
        style={{ fontWeight: 600, ...styles.tnum }}
        valueProps={{
          binding: reportBudget.groupSumAmount(id),
          type: 'financial',
        }}
      />
      {!group.is_income && (
        <ReportSheetCell
          name="balance"
          width="flex"
          textAlign="right"
          style={{
            fontWeight: 600,
            paddingRight: styles.monthRightPadding,
            ...styles.tnum,
          }}
          valueProps={{
            binding: reportBudget.groupBalance(id),
            type: 'financial',
            privacyFilter: {
              style: {
                paddingRight: styles.monthRightPadding,
              },
            },
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
        <ReportSheetCell
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
            binding: reportBudget.catBudgeted(category.id),
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
          <ReportCellValue
            binding={reportBudget.catSumAmount(category.id)}
            type="financial"
            getStyle={makeAmountGrey}
            style={{
              cursor: 'pointer',
              ':hover': {
                textDecoration: 'underline',
              },
            }}
          />
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
            {...(category.is_income
              ? {}
              : { onClick: () => setBalanceMenuOpen(true) })}
          >
            <BalanceWithCarryover
              disabled={category.is_income}
              carryover={reportBudget.catCarryover(category.id)}
              balance={reportBudget.catBalance(category.id)}
              goal={reportBudget.catGoal(category.id)}
              budgeted={reportBudget.catBudgeted(category.id)}
              longGoal={reportBudget.catLongGoal(category.id)}
              style={{
                ':hover': { textDecoration: 'underline' },
              }}
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
