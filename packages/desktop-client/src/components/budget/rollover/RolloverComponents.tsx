import type React from 'react';
import { memo, useRef, useState } from 'react';

import { rolloverBudget } from 'loot-core/src/client/queries';
import { evalArithmetic } from 'loot-core/src/shared/arithmetic';
import { integerToCurrency, amountToInteger } from 'loot-core/src/shared/util';

import { SvgCheveronDown } from '../../../icons/v1';
import { styles, theme, type CSSProperties } from '../../../style';
import { Button } from '../../common/Button2';
import { Popover } from '../../common/Popover';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { type Binding, type SheetFields } from '../../spreadsheet';
import { CellValue, type CellValueProps } from '../../spreadsheet/CellValue';
import { useFormat } from '../../spreadsheet/useFormat';
import { useSheetName } from '../../spreadsheet/useSheetName';
import { useSheetValue } from '../../spreadsheet/useSheetValue';
import { Row, Field, SheetCell, type SheetCellProps } from '../../table';
import { BalanceWithCarryover } from '../BalanceWithCarryover';
import { makeAmountGrey } from '../util';

import { BalanceMovementMenu } from './BalanceMovementMenu';
import { BudgetMenu } from './BudgetMenu';

export function useRolloverSheetName<
  FieldName extends SheetFields<'rollover-budget'>,
>(binding: Binding<'rollover-budget', FieldName>) {
  return useSheetName(binding);
}

export function useRolloverSheetValue<
  FieldName extends SheetFields<'rollover-budget'>,
>(binding: Binding<'rollover-budget', FieldName>) {
  return useSheetValue(binding);
}

export const RolloverCellValue = <
  FieldName extends SheetFields<'rollover-budget'>,
>(
  props: CellValueProps<'rollover-budget', FieldName>,
) => {
  return <CellValue {...props} />;
};

const RolloverSheetCell = <FieldName extends SheetFields<'rollover-budget'>>(
  props: SheetCellProps<'rollover-budget', FieldName>,
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
        <Text style={{ color: theme.tableHeaderText }}>Budgeted</Text>
        <RolloverCellValue
          binding={rolloverBudget.totalBudgeted}
          type="financial"
          style={{ color: theme.tableHeaderText, fontWeight: 600 }}
          formatter={value => {
            return format(-parseFloat(value || '0'), 'financial');
          }}
        />
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText }}>Spent</Text>
        <RolloverCellValue
          binding={rolloverBudget.totalSpent}
          type="financial"
          style={{ color: theme.tableHeaderText, fontWeight: 600 }}
        />
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText }}>Balance</Text>
        <RolloverCellValue
          binding={rolloverBudget.totalBalance}
          type="financial"
          style={{ color: theme.tableHeaderText, fontWeight: 600 }}
        />
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
      <View style={{ flex: 1, textAlign: 'right' }}>Received</View>
    </Row>
  );
}

type ExpenseGroupMonthProps = {
  group: { id: string };
};
export const ExpenseGroupMonth = memo(function ExpenseGroupMonth({
  group,
}: ExpenseGroupMonthProps) {
  const { id } = group;

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <RolloverSheetCell
        name="budgeted"
        width="flex"
        textAlign="right"
        style={{ fontWeight: 600, ...styles.tnum }}
        valueProps={{
          binding: rolloverBudget.groupBudgeted(id),
          type: 'financial',
        }}
      />
      <RolloverSheetCell
        name="spent"
        width="flex"
        textAlign="right"
        style={{ fontWeight: 600, ...styles.tnum }}
        valueProps={{
          binding: rolloverBudget.groupSumAmount(id),
          type: 'financial',
        }}
      />
      <RolloverSheetCell
        name="balance"
        width="flex"
        textAlign="right"
        style={{
          fontWeight: 600,
          paddingRight: styles.monthRightPadding,
          ...styles.tnum,
        }}
        valueProps={{
          binding: rolloverBudget.groupBalance(id),
          type: 'financial',
          privacyFilter: {
            style: {
              paddingRight: styles.monthRightPadding,
            },
          },
        }}
      />
    </View>
  );
});

type ExpenseCategoryMonthProps = {
  month: string;
  category: { id: string; name: string; is_income: boolean };
  editing: boolean;
  onEdit: (id: string | null, month?: string) => void;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onShowActivity: (id: string, month: string) => void;
};
export const ExpenseCategoryMonth = memo(function ExpenseCategoryMonth({
  month,
  category,
  editing,
  onEdit,
  onBudgetAction,
  onShowActivity,
}: ExpenseCategoryMonthProps) {
  const budgetMenuTriggerRef = useRef(null);
  const balanceMenuTriggerRef = useRef(null);
  const [budgetMenuOpen, setBudgetMenuOpen] = useState(false);
  const [balanceMenuOpen, setBalanceMenuOpen] = useState(false);
  const [hover, setHover] = useState(false);

  const onMenuAction = (...args: Parameters<typeof onBudgetAction>) => {
    onBudgetAction(...args);
    setBudgetMenuOpen(false);
  };

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
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
        onMouseOverCapture={() => setHover(true)}
        onMouseLeave={() => {
          setHover(false);
        }}
      >
        {!editing && (hover || budgetMenuOpen) ? (
          <View
            style={{
              flexShrink: 1,
              paddingLeft: 3,
              justifyContent: 'center',
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: theme.tableBorder,
            }}
          >
            <Button
              ref={budgetMenuTriggerRef}
              variant="bare"
              onPress={() => setBudgetMenuOpen(true)}
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
              placement="bottom start"
              isOpen={budgetMenuOpen}
              onOpenChange={() => setBudgetMenuOpen(false)}
              style={{ width: 200 }}
            >
              <BudgetMenu
                onCopyLastMonthAverage={() => {
                  onMenuAction(month, 'copy-single-last', {
                    category: category.id,
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
                }}
                onApplyBudgetTemplate={() => {
                  onMenuAction(month, 'apply-single-category-template', {
                    category: category.id,
                  });
                }}
              />
            </Popover>
          </View>
        ) : null}
        <RolloverSheetCell
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
            binding: rolloverBudget.catBudgeted(category.id),
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
          <RolloverCellValue
            binding={rolloverBudget.catSumAmount(category.id)}
            type="financial"
            getStyle={makeAmountGrey}
            style={{
              cursor: 'pointer',
              ':hover': { textDecoration: 'underline' },
            }}
          />
        </span>
      </Field>
      <Field
        name="balance"
        width="flex"
        style={{ paddingRight: styles.monthRightPadding, textAlign: 'right' }}
      >
        <span
          ref={balanceMenuTriggerRef}
          onClick={() => setBalanceMenuOpen(true)}
        >
          <BalanceWithCarryover
            carryover={rolloverBudget.catCarryover(category.id)}
            balance={rolloverBudget.catBalance(category.id)}
            goal={rolloverBudget.catGoal(category.id)}
            budgeted={rolloverBudget.catBudgeted(category.id)}
            longGoal={rolloverBudget.catLongGoal(category.id)}
            style={{
              ':hover': { textDecoration: 'underline' },
            }}
          />
        </span>

        <Popover
          triggerRef={balanceMenuTriggerRef}
          placement="bottom end"
          isOpen={balanceMenuOpen}
          onOpenChange={() => setBalanceMenuOpen(false)}
          style={{ width: 200 }}
        >
          <BalanceMovementMenu
            categoryId={category.id}
            month={month}
            onBudgetAction={onBudgetAction}
            onClose={() => setBalanceMenuOpen(false)}
          />
        </Popover>
      </Field>
    </View>
  );
});

export function IncomeGroupMonth() {
  return (
    <View style={{ flex: 1 }}>
      <RolloverSheetCell
        name="received"
        width="flex"
        textAlign="right"
        style={{
          fontWeight: 600,
          paddingRight: styles.monthRightPadding,
          ...styles.tnum,
        }}
        valueProps={{
          binding: rolloverBudget.groupIncomeReceived,
          type: 'financial',
          privacyFilter: {
            style: {
              paddingRight: styles.monthRightPadding,
            },
          },
        }}
      />
    </View>
  );
}

type IncomeCategoryMonthProps = {
  category: { id: string; name: string };
  isLast: boolean;
  month: string;
  onShowActivity: (id: string, month: string) => void;
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
        }}
      >
        <span onClick={() => onShowActivity(category.id, month)}>
          <RolloverCellValue
            binding={rolloverBudget.catSumAmount(category.id)}
            type="financial"
            style={{
              cursor: 'pointer',
              ':hover': { textDecoration: 'underline' },
            }}
          />
        </span>
      </Field>
    </View>
  );
}

export { BudgetSummary } from './budgetsummary/BudgetSummary';
