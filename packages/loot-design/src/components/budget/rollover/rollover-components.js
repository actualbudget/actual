import React, { useContext, useState } from 'react';

import { rolloverBudget } from 'loot-core/src/client/queries';
import evalArithmetic from 'loot-core/src/shared/arithmetic';
import { integerToCurrency, amountToInteger } from 'loot-core/src/shared/util';

import { styles, colors } from '../../../style';
import CategoryAutocomplete from '../../CategorySelect';
import {
  View,
  Text,
  useTooltip,
  InitialFocus,
  Tooltip,
  Button,
  Menu
} from '../../common';
import CellValue from '../../spreadsheet/CellValue';
import format from '../../spreadsheet/format';
import useSheetValue from '../../spreadsheet/useSheetValue';
import { Row, Field, SheetCell } from '../../table';
import BalanceWithCarryover from '../BalanceWithCarryover';
import { MONTH_RIGHT_PADDING } from '../constants';
import {
  makeAmountGrey,
  addToBeBudgetedGroup,
  CategoryGroupsContext
} from '../util';

import TransferTooltip from './TransferTooltip';

export BudgetSummary from './BudgetSummary';

function CoverTooltip({
  showToBeBudgeted,
  inline,
  tooltipProps,
  onSubmit,
  onClose
}) {
  let categoryGroups = useContext(CategoryGroupsContext);
  categoryGroups = addToBeBudgetedGroup(
    categoryGroups.filter(g => !g.is_income)
  );
  let [category, setCategory] = useState(null);

  function submit() {
    if (category) {
      onSubmit(category);
      onClose();
    }
  }

  return (
    <Tooltip
      position="bottom-right"
      width={200}
      style={{ padding: 10 }}
      {...tooltipProps}
      onClose={onClose}
    >
      <View style={{ marginBottom: 5 }}>Cover from category:</View>

      <InitialFocus>
        {node => (
          <CategoryAutocomplete
            categoryGroups={categoryGroups}
            value={null}
            openOnFocus={false}
            onUpdate={id => {}}
            onSelect={id => setCategory(id)}
            inputProps={{
              inputRef: node,
              onKeyDown: e => {
                if (e.keyCode === 13) {
                  submit();
                }
              }
            }}
          />
        )}
      </InitialFocus>

      <View
        style={{
          alignItems: 'flex-end',
          marginTop: 10
        }}
      >
        <Button
          primary
          style={{
            fontSize: 12,
            paddingTop: 3
          }}
          onClick={submit}
        >
          Transfer
        </Button>
      </View>
    </Tooltip>
  );
}

function BalanceTooltip({ categoryId, tooltip, monthIndex, onBudgetAction }) {
  let carryover = useSheetValue(rolloverBudget.catCarryover(categoryId));
  let balance = useSheetValue(rolloverBudget.catBalance(categoryId));
  let [menu, setMenu] = useState('menu');

  return (
    <>
      {menu === 'menu' && (
        <Tooltip
          position="bottom-right"
          width={200}
          style={{ padding: 0 }}
          onClose={tooltip.close}
        >
          <Menu
            onMenuSelect={type => {
              if (type === 'carryover') {
                onBudgetAction(monthIndex, 'carryover', {
                  category: categoryId,
                  flag: !carryover
                });
                tooltip.close();
              } else {
                setMenu(type);
              }
            }}
            items={[
              {
                name: 'transfer',
                text: 'Transfer to another category'
              },
              {
                name: 'carryover',
                text: carryover
                  ? 'Remove overspending rollover'
                  : 'Rollover overspending'
              },
              balance < 0 && {
                name: 'cover',
                text: 'Cover overspending'
              }
            ].filter(x => x)}
          />
        </Tooltip>
      )}

      {menu === 'transfer' && (
        <TransferTooltip
          initialAmountName={rolloverBudget.catBalance(categoryId)}
          showToBeBudgeted={true}
          onClose={tooltip.close}
          onSubmit={(amount, toCategory) => {
            onBudgetAction(monthIndex, 'transfer-category', {
              amount,
              from: categoryId,
              to: toCategory
            });
          }}
        />
      )}

      {menu === 'cover' && (
        <CoverTooltip
          showToBeBudgeted={true}
          onClose={tooltip.close}
          onSubmit={fromCategory => {
            onBudgetAction(monthIndex, 'cover', {
              to: categoryId,
              from: fromCategory
            });
          }}
        />
      )}
    </>
  );
}

let headerLabelStyle = { flex: 1, padding: '0 5px', textAlign: 'right' };

export const BudgetTotalsMonth = React.memo(function BudgetTotalsMonth() {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        marginRight: MONTH_RIGHT_PADDING,
        paddingTop: 10,
        paddingBottom: 10
      }}
    >
      <View style={headerLabelStyle}>
        <Text style={{ color: colors.n4 }}>Budgeted</Text>
        <CellValue
          binding={rolloverBudget.totalBudgeted}
          type="financial"
          style={{ color: colors.n4, fontWeight: 600 }}
          formatter={value => {
            return format(-parseFloat(value || '0'), 'financial');
          }}
        />
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: colors.n4 }}>Spent</Text>
        <CellValue
          binding={rolloverBudget.totalSpent}
          type="financial"
          style={{ color: colors.n4, fontWeight: 600 }}
        />
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: colors.n4 }}>Balance</Text>
        <CellValue
          binding={rolloverBudget.totalBalance}
          type="financial"
          style={{ color: colors.n4, fontWeight: 600 }}
        />
      </View>
    </View>
  );
});

export function IncomeHeaderMonth() {
  return (
    <Row
      style={{
        color: colors.n4,
        alignItems: 'center',
        paddingRight: 10
      }}
    >
      <View style={{ flex: 1, textAlign: 'right' }}>Received</View>
    </Row>
  );
}

export const ExpenseGroupMonth = React.memo(function ExpenseGroupMonth({
  group
}) {
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
          binding: rolloverBudget.groupBudgeted(id),
          type: 'financial'
        }}
      />
      <SheetCell
        name="spent"
        width="flex"
        textAlign="right"
        borderColor={borderColor}
        style={[{ fontWeight: 600 }, styles.tnum]}
        valueProps={{
          binding: rolloverBudget.groupSumAmount(id),
          type: 'financial'
        }}
      />
      <SheetCell
        name="balance"
        width="flex"
        borderColor={borderColor}
        textAlign="right"
        style={[
          { fontWeight: 600, paddingRight: MONTH_RIGHT_PADDING },
          styles.tnum
        ]}
        valueProps={{
          binding: rolloverBudget.groupBalance(id),
          type: 'financial'
        }}
      />
    </View>
  );
});

export const ExpenseCategoryMonth = React.memo(function ExpenseCategoryMonth({
  monthIndex,
  category,
  editing,
  onEdit,
  onBudgetAction,
  onShowActivity
}) {
  let borderColor = colors.border;
  let balanceTooltip = useTooltip();

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <SheetCell
        name="budget"
        sync={true}
        exposed={editing}
        width="flex"
        borderColor={borderColor}
        onExpose={() => onEdit(category.id, monthIndex)}
        style={[editing && { zIndex: 100 }, styles.tnum]}
        textAlign="right"
        valueStyle={[
          {
            cursor: 'default',
            margin: 1,
            padding: '0 4px',
            borderRadius: 4
          },
          {
            ':hover': {
              boxShadow: 'inset 0 0 0 1px ' + colors.n7,
              backgroundColor: 'white'
            }
          }
        ]}
        valueProps={{
          binding: rolloverBudget.catBudgeted(category.id),
          type: 'financial',
          getValueStyle: makeAmountGrey,
          formatExpr: expr => {
            return integerToCurrency(expr);
          },
          unformatExpr: expr => {
            return amountToInteger(evalArithmetic(expr, 0));
          }
        }}
        inputProps={{
          onBlur: () => {
            onEdit(null);
          }
        }}
        onSave={amount => {
          onBudgetAction(monthIndex, 'budget-amount', {
            category: category.id,
            amount
          });
        }}
      />

      <Field
        name="spent"
        width="flex"
        borderColor={borderColor}
        style={{ textAlign: 'right' }}
      >
        <span
          onClick={() => onShowActivity(category.name, category.id, monthIndex)}
        >
          <CellValue
            binding={rolloverBudget.catSumAmount(category.id)}
            type="financial"
            getStyle={makeAmountGrey}
            style={{
              cursor: 'pointer',
              ':hover': { textDecoration: 'underline' }
            }}
          />
        </span>
      </Field>

      <Field
        name="balance"
        width="flex"
        borderColor={borderColor}
        style={{ paddingRight: MONTH_RIGHT_PADDING, textAlign: 'right' }}
      >
        <span {...balanceTooltip.getOpenEvents()}>
          <BalanceWithCarryover
            category={category}
            carryover={rolloverBudget.catCarryover(category.id)}
            balance={rolloverBudget.catBalance(category.id)}
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

export function IncomeGroupMonth({ group }) {
  // let { id } = group;

  return (
    <View style={{ flex: 1 }}>
      <SheetCell
        name="received"
        width="flex"
        borderColor={colors.border}
        textAlign="right"
        style={[
          { fontWeight: 600, paddingRight: MONTH_RIGHT_PADDING },
          styles.tnum
        ]}
        valueProps={{
          binding: rolloverBudget.groupIncomeReceived,
          type: 'financial'
        }}
      />
    </View>
  );
}

export function IncomeCategoryMonth({
  category,
  isLast,
  monthIndex,
  onShowActivity
}) {
  return (
    <View style={{ flex: 1 }}>
      <Field
        name="received"
        width="flex"
        borderColor={colors.border}
        style={[
          { paddingRight: MONTH_RIGHT_PADDING, textAlign: 'right' },
          isLast && { borderBottomWidth: 0 }
        ]}
      >
        <span
          onClick={() => onShowActivity(category.name, category.id, monthIndex)}
        >
          <CellValue
            binding={rolloverBudget.catSumAmount(category.id)}
            type="financial"
            style={{
              cursor: 'pointer',
              ':hover': { textDecoration: 'underline' }
            }}
          />
        </span>
      </Field>
    </View>
  );
}
