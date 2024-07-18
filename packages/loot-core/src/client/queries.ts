// @ts-strict-ignore
import { parse as parseDate, isValid as isDateValid } from 'date-fns';

import {
  parametrizedField,
  type SheetFields,
  type Binding,
  type SheetNames,
} from '../../../desktop-client/src/components/spreadsheet';
import {
  dayFromDate,
  getDayMonthRegex,
  getDayMonthFormat,
  getShortYearRegex,
  getShortYearFormat,
} from '../shared/months';
import { q, type Query } from '../shared/query';
import { currencyToAmount, amountToInteger } from '../shared/util';
import { type CategoryEntity, type AccountEntity } from '../types/models';
import { type LocalPrefs } from '../types/prefs';

type BudgetType<SheetName extends SheetNames> = Record<
  string,
  SheetFields<SheetName> | ((id: string) => SheetFields<SheetName>)
>;

const accountParametrizedField = parametrizedField<'account'>();
const rolloverParametrizedField = parametrizedField<'rollover-budget'>();

export function getAccountFilter(accountId: string, field = 'account') {
  if (accountId) {
    if (accountId === 'budgeted') {
      return {
        $and: [
          { [`${field}.offbudget`]: false },
          { [`${field}.closed`]: false },
        ],
      };
    } else if (accountId === 'offbudget') {
      return {
        $and: [
          { [`${field}.offbudget`]: true },
          { [`${field}.closed`]: false },
        ],
      };
    } else if (accountId === 'uncategorized') {
      return {
        [`${field}.offbudget`]: false,
        category: null,
        is_parent: false,
        $or: [
          {
            'payee.transfer_acct.offbudget': true,
            'payee.transfer_acct': null,
          },
        ],
      };
    } else {
      return { [field]: accountId };
    }
  }

  return null;
}

export function makeTransactionsQuery(accountId: string) {
  let query = q('transactions').options({ splits: 'grouped' });

  const filter = getAccountFilter(accountId);
  if (filter) {
    query = query.filter(filter);
  }

  return query;
}

export function makeTransactionSearchQuery(
  currentQuery: Query,
  search: string,
  dateFormat: LocalPrefs['dateFormat'],
) {
  const amount = currencyToAmount(search);

  // Support various date formats
  let parsedDate;
  if (getDayMonthRegex(dateFormat).test(search)) {
    parsedDate = parseDate(search, getDayMonthFormat(dateFormat), new Date());
  } else if (getShortYearRegex(dateFormat).test(search)) {
    parsedDate = parseDate(search, getShortYearFormat(dateFormat), new Date());
  } else {
    parsedDate = parseDate(search, dateFormat, new Date());
  }

  return currentQuery.filter({
    $or: {
      'payee.name': { $like: `%${search}%` },
      notes: { $like: `%${search}%` },
      'category.name': { $like: `%${search}%` },
      'account.name': { $like: `%${search}%` },
      $or: [
        isDateValid(parsedDate) && { date: dayFromDate(parsedDate) },
        amount != null && {
          amount: { $transform: '$abs', $eq: amountToInteger(amount) },
        },
        amount != null &&
          Number.isInteger(amount) && {
            amount: {
              $transform: { $abs: { $idiv: ['$', 100] } },
              $eq: amount,
            },
          },
      ].filter(Boolean),
    },
  });
}

export function accountBalance(
  acct: AccountEntity,
): Binding<'account', 'balance'> {
  return {
    name: accountParametrizedField('balance')(acct.id),
    query: q('transactions')
      .filter({ account: acct.id })
      .options({ splits: 'none' })
      .calculate({ $sum: '$amount' }),
  };
}

export function accountBalanceCleared(
  acct: AccountEntity,
): Binding<'account', 'balanceCleared'> {
  return {
    name: accountParametrizedField('balanceCleared')(acct.id),
    query: q('transactions')
      .filter({ account: acct.id, cleared: true })
      .options({ splits: 'none' })
      .calculate({ $sum: '$amount' }),
  };
}

export function accountBalanceUncleared(
  acct: AccountEntity,
): Binding<'account', 'balanceUncleared'> {
  return {
    name: accountParametrizedField('balanceUncleared')(acct.id),
    query: q('transactions')
      .filter({ account: acct.id, cleared: false })
      .options({ splits: 'none' })
      .calculate({ $sum: '$amount' }),
  };
}

export function allAccountBalance(): Binding<'account', 'accounts-balance'> {
  return {
    query: q('transactions')
      .filter({ 'account.closed': false })
      .calculate({ $sum: '$amount' }),
    name: 'accounts-balance',
  };
}

export function budgetedAccountBalance(): Binding<
  'account',
  'budgeted-accounts-balance'
> {
  return {
    name: `budgeted-accounts-balance`,
    query: q('transactions')
      .filter({ 'account.offbudget': false, 'account.closed': false })
      .calculate({ $sum: '$amount' }),
  };
}

export function offbudgetAccountBalance(): Binding<
  'account',
  'offbudget-accounts-balance'
> {
  return {
    name: `offbudget-accounts-balance`,
    query: q('transactions')
      .filter({ 'account.offbudget': true, 'account.closed': false })
      .calculate({ $sum: '$amount' }),
  };
}

export function categoryBalance(category: CategoryEntity, month: string) {
  return {
    name: `balance-${category.id}`,
    query: q('transactions')
      .filter({
        category: category.id,
        date: { $transform: '$month', $eq: month },
      })
      .options({ splits: 'inline' })
      .calculate({ $sum: '$amount' }),
  };
}

export function categoryBalanceCleared(
  category: CategoryEntity,
  month: string,
) {
  return {
    name: `balanceCleared-${category.id}`,
    query: q('transactions')
      .filter({
        category: category.id,
        date: { $transform: '$month', $eq: month },
        cleared: true,
      })
      .options({ splits: 'inline' })
      .calculate({ $sum: '$amount' }),
  };
}

export function categoryBalanceUncleared(
  category: CategoryEntity,
  month: string,
) {
  return {
    name: `balanceUncleared-${category.id}`,
    query: q('transactions')
      .filter({
        category: category.id,
        date: { $transform: '$month', $eq: month },
        cleared: false,
      })
      .options({ splits: 'inline' })
      .calculate({ $sum: '$amount' }),
  };
}

const uncategorizedQuery = q('transactions').filter({
  'account.offbudget': false,
  category: null,
  $or: [
    {
      'payee.transfer_acct.offbudget': true,
      'payee.transfer_acct': null,
    },
  ],
});

export function uncategorizedBalance() {
  return {
    name: 'uncategorized-balance',
    query: uncategorizedQuery.calculate({ $sum: '$amount' }),
  };
}

export function uncategorizedCount<SheetName extends SheetNames>(): Binding<
  SheetName,
  'uncategorized-amount'
> {
  return {
    name: 'uncategorized-amount',
    query: uncategorizedQuery.calculate({ $count: '$id' }),
  };
}

export const rolloverBudget = {
  incomeAvailable: 'available-funds',
  lastMonthOverspent: 'last-month-overspent',
  forNextMonth: 'buffered',
  totalBudgeted: 'total-budgeted',
  toBudget: 'to-budget',

  fromLastMonth: 'from-last-month',
  totalIncome: 'total-income',
  totalSpent: 'total-spent',
  totalBalance: 'total-leftover',

  groupSumAmount: rolloverParametrizedField('group-sum-amount'),
  groupIncomeReceived: 'total-income',

  groupBudgeted: rolloverParametrizedField('group-budget'),
  groupBalance: rolloverParametrizedField('group-leftover'),

  catBudgeted: rolloverParametrizedField('budget'),
  catSumAmount: rolloverParametrizedField('sum-amount'),
  catBalance: rolloverParametrizedField('leftover'),
  catCarryover: rolloverParametrizedField('carryover'),
  catGoal: rolloverParametrizedField('goal'),
  catLongGoal: rolloverParametrizedField('long-goal'),
} satisfies BudgetType<'rollover-budget'>;

export const reportBudget = {
  totalBudgetedExpense: 'total-budgeted',
  totalBudgetedIncome: 'total-budget-income',
  totalBudgetedSaved: 'total-saved',

  totalIncome: 'total-income',
  totalSpent: 'total-spent',
  totalSaved: 'real-saved',

  totalLeftover: 'total-leftover',
  groupSumAmount: id => `group-sum-amount-${id}`,
  groupIncomeReceived: 'total-income',

  groupBudgeted: id => `group-budget-${id}`,
  groupBalance: id => `group-leftover-${id}`,

  catBudgeted: id => `budget-${id}`,
  catSumAmount: id => `sum-amount-${id}`,
  catBalance: id => `leftover-${id}`,
  catCarryover: id => `carryover-${id}`,
  catGoal: id => `goal-${id}`,
  catLongGoal: id => `long-goal-${id}`,
};
