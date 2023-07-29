import React, { memo, useState } from 'react';

import { reportBudget } from 'loot-core/src/client/queries';
import evalArithmetic from 'loot-core/src/shared/arithmetic';
import { integerToCurrency, amountToInteger } from 'loot-core/src/shared/util';

import useFeatureFlag from '../../../hooks/useFeatureFlag';
import CheveronDown from '../../../icons/v1/CheveronDown';
import { styles, colors } from '../../../style';
import Button from '../../common/Button';
import Menu from '../../common/Menu';
import Text from '../../common/Text';
import View from '../../common/View';
import CellValue from '../../spreadsheet/CellValue';
import format from '../../spreadsheet/format';
import useSheetValue from '../../spreadsheet/useSheetValue';
import { Field, SheetCell } from '../../table';
import { Tooltip, useTooltip } from '../../tooltips';
import BalanceWithCarryover from '../BalanceWithCarryover';
import { MONTH_RIGHT_PADDING } from '../constants';
import { makeAmountGrey } from '../util';

export { BudgetSummary } from './BudgetSummary';

let headerLabelStyle = { flex: 1, padding: '0 5px', textAlign: 'right' };

export const BudgetTotalsMonth = memo(function BudgetTotalsMonth() {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        marginRight: MONTH_RIGHT_PADDING,
        paddingTop: 10,
        paddingBottom: 10,
      }}
    >
      <View style={headerLabelStyle}>
        <Text style={{ color: colors.n4 }}>Budgeted</Text>
        <CellValue
          binding={reportBudget.totalBudgetedExpense}
          type="financial"
          style={{ color: colors.n4, fontWeight: 600 }}
          formatter={value => {
            return format(parseFloat(value || '0'), 'financial');
          }}
        />
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: colors.n4 }}>Spent</Text>
        <CellValue
          binding={reportBudget.totalSpent}
          type="financial"
          style={{ color: colors.n4, fontWeight: 600 }}
        />
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: colors.n4 }}>Balance</Text>
        <CellValue
          binding={reportBudget.totalLeftover}
          type="financial"
          style={{ color: colors.n4, fontWeight: 600 }}
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
        marginRight: MONTH_RIGHT_PADDING,
        paddingBottom: 5,
      }}
    >
      <View style={headerLabelStyle}>
        <Text style={{ color: colors.n4 }}>Budgeted</Text>
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: colors.n4 }}>Received</Text>
      </View>
    </View>
  );
}

type GroupMonthProps = {
  group: { id: string; is_income: boolean };
};
export const GroupMonth = memo(function GroupMonth({ group }: GroupMonthProps) {
  let borderColor = colors.border;
  let { id } = group;

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <SheetCell
        name="budgeted"
        width="flex"
        borderColor={borderColor}
        textAlign="right"
        style={[{ fontWeight: 600 }, styles.tnum]}
        valueProps={{
          binding: reportBudget.groupBudgeted(id),
          type: 'financial',
        }}
      />
      <SheetCell
        name="spent"
        width="flex"
        textAlign="right"
        borderColor={borderColor}
        style={[{ fontWeight: 600 }, styles.tnum]}
        valueProps={{
          binding: reportBudget.groupSumAmount(id),
          type: 'financial',
        }}
      />
      {!group.is_income && (
        <SheetCell
          name="balance"
          width="flex"
          borderColor={borderColor}
          textAlign="right"
          style={[
            { fontWeight: 600, paddingRight: MONTH_RIGHT_PADDING },
            styles.tnum,
          ]}
          valueProps={{
            binding: reportBudget.groupBalance(id),
            type: 'financial',
            privacyFilter: {
              style: {
                paddingRight: MONTH_RIGHT_PADDING,
              },
            },
          }}
        />
      )}
    </View>
  );
});

type BalanceTooltipProps = {
  categoryId: string;
  tooltip: { close: () => void };
  monthIndex: number;
  onBudgetAction: (idx: number, action: string, arg: unknown) => void;
};
function BalanceTooltip({
  categoryId,
  tooltip,
  monthIndex,
  onBudgetAction,
}: BalanceTooltipProps) {
  let carryover = useSheetValue(reportBudget.catCarryover(categoryId));

  return (
    <Tooltip
      position="bottom-right"
      width={200}
      style={{ padding: 0 }}
      onClose={tooltip.close}
    >
      <Menu
        onMenuSelect={type => {
          onBudgetAction(monthIndex, 'carryover', {
            category: categoryId,
            flag: !carryover,
          });
          tooltip.close();
        }}
        items={[
          {
            name: 'carryover',
            text: carryover
              ? 'Remove overspending rollover'
              : 'Rollover overspending',
          },
        ]}
      />
    </Tooltip>
  );
}

type CategoryMonthProps = {
  monthIndex: number;
  category: { id: string; name: string; is_income: boolean };
  editing: boolean;
  onEdit: (id: string | null, idx?: number) => void;
  onBudgetAction: (idx: number, action: string, arg: unknown) => void;
  onShowActivity: (name: string, id: string, idx: number) => void;
};
export const CategoryMonth = memo(function CategoryMonth({
  monthIndex,
  category,
  editing,
  onEdit,
  onBudgetAction,
  onShowActivity,
}: CategoryMonthProps) {
  let borderColor = colors.border;
  let balanceTooltip = useTooltip();
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
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor,
          backgroundColor: 'white',
        }}
        onMouseOverCapture={() => setHover(true)}
        onMouseLeave={() => {
          setHover(false);
        }}
      >
        {!editing && (hover || menuOpen) && (
          <View
            style={{
              flexShrink: 0,
              marginRight: 0,
              marginLeft: 3,
              justifyContent: 'center',
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
              <CheveronDown
                width={14}
                height={14}
                className="hover-visible"
                style={menuOpen && { opacity: 1 }}
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
                    isGoalTemplatesEnabled && {
                      name: 'apply-single-category-template',
                      text: 'Apply budget template',
                    },
                  ]}
                />
              </Tooltip>
            )}
          </View>
        )}
        <SheetCell
          name="budget"
          exposed={editing}
          focused={editing}
          width="flex"
          borderColor="white"
          onExpose={() => onEdit(category.id, monthIndex)}
          style={[editing && { zIndex: 100 }, styles.tnum]}
          textAlign="right"
          valueStyle={[
            {
              cursor: 'default',
              margin: 1,
              padding: '0 4px',
              borderRadius: 4,
            },
            {
              ':hover': {
                boxShadow: 'inset 0 0 0 1px ' + colors.n7,
                backgroundColor: 'white',
              },
            },
          ]}
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
          }}
          onSave={amount => {
            onBudgetAction(monthIndex, 'budget-amount', {
              category: category.id,
              amount,
            });
          }}
        />
      </View>
      <Field
        name="spent"
        width="flex"
        borderColor={borderColor}
        style={{ textAlign: 'right' }}
      >
        <span
          data-testid="category-month-spent"
          onClick={() => onShowActivity(category.name, category.id, monthIndex)}
        >
          <CellValue
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
          borderColor={borderColor}
          style={{ paddingRight: MONTH_RIGHT_PADDING, textAlign: 'right' }}
        >
          <span {...(category.is_income ? {} : balanceTooltip.getOpenEvents())}>
            <BalanceWithCarryover
              disabled={category.is_income}
              carryover={reportBudget.catCarryover(category.id)}
              balance={reportBudget.catBalance(category.id)}
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
      )}
    </View>
  );
});

export const ExpenseGroupMonth = GroupMonth;
export const ExpenseCategoryMonth = CategoryMonth;

export const IncomeGroupMonth = GroupMonth;
export const IncomeCategoryMonth = CategoryMonth;
