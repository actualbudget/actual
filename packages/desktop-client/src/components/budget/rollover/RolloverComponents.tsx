import React, { memo, useState } from 'react';

import { rolloverBudget } from 'loot-core/src/client/queries';
import { evalArithmetic } from 'loot-core/src/shared/arithmetic';
import { integerToCurrency, amountToInteger } from 'loot-core/src/shared/util';

import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { SvgCheveronDown } from '../../../icons/v1';
import { styles, theme, type CSSProperties } from '../../../style';
import { Button } from '../../common/Button';
import { Menu } from '../../common/Menu';
import { Text } from '../../common/Text';
import { View } from '../../common/View';
import { CellValue } from '../../spreadsheet/CellValue';
import { useFormat } from '../../spreadsheet/useFormat';
import { Row, Field, SheetCell } from '../../table';
import { Tooltip, useTooltip } from '../../tooltips';
import { BalanceWithCarryover } from '../BalanceWithCarryover';
import { makeAmountGrey } from '../util';

import { BalanceTooltip } from './BalanceTooltip';

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
        <CellValue
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
        <CellValue
          binding={rolloverBudget.totalSpent}
          type="financial"
          style={{ color: theme.tableHeaderText, fontWeight: 600 }}
        />
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText }}>Balance</Text>
        <CellValue
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
      <SheetCell
        name="budgeted"
        width="flex"
        textAlign="right"
        style={{ fontWeight: 600, ...styles.tnum }}
        valueProps={{
          binding: rolloverBudget.groupBudgeted(id),
          type: 'financial',
        }}
      />
      <SheetCell
        name="spent"
        width="flex"
        textAlign="right"
        style={{ fontWeight: 600, ...styles.tnum }}
        valueProps={{
          binding: rolloverBudget.groupSumAmount(id),
          type: 'financial',
        }}
      />
      <SheetCell
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
  monthIndex: number;
  category: { id: string; name: string; is_income: boolean };
  editing: boolean;
  onEdit: (id: string | null, idx?: number) => void;
  onBudgetAction: (idx: number, action: string, arg?: unknown) => void;
  onShowActivity: (id: string, idx: number) => void;
};
export const ExpenseCategoryMonth = memo(function ExpenseCategoryMonth({
  monthIndex,
  category,
  editing,
  onEdit,
  onBudgetAction,
  onShowActivity,
}: ExpenseCategoryMonthProps) {
  const balanceTooltip = useTooltip();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');

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
        {!editing && (hover || menuOpen) ? (
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
              type="bare"
              onClick={e => {
                e.stopPropagation();
                setMenuOpen(true);
              }}
              style={{
                padding: 3,
              }}
            >
              <SvgCheveronDown
                width={14}
                height={14}
                className="hover-visible"
                style={menuOpen ? { opacity: 1 } : {}}
              />
            </Button>
            {menuOpen && (
              <Tooltip
                position="bottom-left"
                width={200}
                style={{ padding: 0 }}
                onClose={() => setMenuOpen(false)}
              >
                <Menu
                  onMenuSelect={type => {
                    onBudgetAction(monthIndex, type, { category: category.id });
                    setMenuOpen(false);
                  }}
                  items={[
                    {
                      name: 'copy-single-last',
                      text: 'Copy last month’s budget',
                    },
                    {
                      name: 'set-single-3-avg',
                      text: 'Set to 3 month average',
                    },
                    {
                      name: 'set-single-6-avg',
                      text: 'Set to 6 month average',
                    },
                    {
                      name: 'set-single-12-avg',
                      text: 'Set to yearly average',
                    },
                    ...(isGoalTemplatesEnabled
                      ? [
                          {
                            name: 'apply-single-category-template',
                            text: 'Apply budget template',
                          },
                        ]
                      : []),
                  ]}
                />
              </Tooltip>
            )}
          </View>
        ) : null}
        <SheetCell
          name="budget"
          exposed={editing}
          focused={editing}
          width="flex"
          onExpose={() => onEdit(category.id, monthIndex)}
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
            onBudgetAction(monthIndex, 'budget-amount', {
              category: category.id,
              amount,
            });
          }}
        />
      </View>
      <Field name="spent" width="flex" style={{ textAlign: 'right' }}>
        <span
          data-testid="category-month-spent"
          onClick={() => onShowActivity(category.id, monthIndex)}
        >
          <CellValue
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
        truncate={false}
        width="flex"
        style={{ paddingRight: styles.monthRightPadding, textAlign: 'right' }}
      >
        <span {...balanceTooltip.getOpenEvents()}>
          <BalanceWithCarryover
            carryover={rolloverBudget.catCarryover(category.id)}
            balance={rolloverBudget.catBalance(category.id)}
            goal={rolloverBudget.catGoal(category.id)}
            budgeted={rolloverBudget.catBudgeted(category.id)}
          />
        </span>
        {balanceTooltip.isOpen && (
          <BalanceTooltip
            categoryId={category.id}
            tooltip={balanceTooltip}
            monthIndex={monthIndex}
            onBudgetAction={onBudgetAction}
          />
        )}
      </Field>
    </View>
  );
});

export function IncomeGroupMonth() {
  return (
    <View style={{ flex: 1 }}>
      <SheetCell
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
  monthIndex: number;
  onShowActivity: (id: string, idx: number) => void;
};
export function IncomeCategoryMonth({
  category,
  isLast,
  monthIndex,
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
        <span onClick={() => onShowActivity(category.id, monthIndex)}>
          <CellValue
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
