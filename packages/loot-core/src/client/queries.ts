// @ts-strict-ignore
import { parse as parseDate, isValid as isDateValid } from 'date-fns';

import {
  dayFromDate,
  getDayMonthRegex,
  getDayMonthFormat,
  getShortYearRegex,
  getShortYearFormat,
} from '../shared/months';
import { q } from '../shared/query';
import { currencyToAmount, amountToInteger } from '../shared/util';

export type SpreadsheetFieldTypes = {
  account: {
    // Common fields
    'uncategorized-amount': number;
    'uncategorized-balance': number;

    // Account fields
    balance: number;
    'accounts-balance': number;
    'budgeted-accounts-balance': number;
    'offbudget-accounts-balance': number;
    balanceCleared: number;
    balanceUncleared: number;
  };
};

export type SheetNames = keyof SpreadsheetFieldTypes & string;

export type BudgetField<SheetName extends SheetNames> =
  keyof SpreadsheetFieldTypes[SheetName] & string;

export function getAccountFilter(accountId, field = 'account') {
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

export function makeTransactionsQuery(accountId) {
  let query = q('transactions').options({ splits: 'grouped' });

  const filter = getAccountFilter(accountId);
  if (filter) {
    query = query.filter(filter);
  }

  return query;
}

export function makeTransactionSearchQuery(currentQuery, search, dateFormat) {
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

export function accountBalance(acct) {
  return {
    name: `balance-${acct.id}`,
    query: q('transactions')
      .filter({ account: acct.id })
      .options({ splits: 'none' })
      .calculate({ $sum: '$amount' }),
  };
}

export function accountBalanceCleared(acct) {
  return {
    name: `balanceCleared-${acct.id}`,
    query: q('transactions')
      .filter({ account: acct.id, cleared: true })
      .options({ splits: 'none' })
      .calculate({ $sum: '$amount' }),
  };
}

export function accountBalanceUncleared(acct) {
  return {
    name: `balanceUncleared-${acct.id}`,
    query: q('transactions')
      .filter({ account: acct.id, cleared: false })
      .options({ splits: 'none' })
      .calculate({ $sum: '$amount' }),
  };
}

export function allAccountBalance() {
  return {
    query: q('transactions')
      .filter({ 'account.closed': false })
      .calculate({ $sum: '$amount' }),
    name: 'accounts-balance',
  };
}

export function budgetedAccountBalance() {
  return {
    name: `budgeted-accounts-balance`,
    query: q('transactions')
      .filter({ 'account.offbudget': false, 'account.closed': false })
      .calculate({ $sum: '$amount' }),
  };
}

export function offbudgetAccountBalance() {
  return {
    name: `offbudget-accounts-balance`,
    query: q('transactions')
      .filter({ 'account.offbudget': true, 'account.closed': false })
      .calculate({ $sum: '$amount' }),
  };
}

export function categoryBalance(category, month) {
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

export function categoryBalanceCleared(category, month) {
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

export function categoryBalanceUncleared(category, month) {
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

export function uncategorizedCount() {
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

  groupSumAmount: id => `group-sum-amount-${id}`,
  groupIncomeReceived: 'total-income',

  groupBudgeted: id => `group-budget-${id}`,
  groupBalance: id => `group-leftover-${id}`,

  catBudgeted: id => `budget-${id}`,
  catSumAmount: id => `sum-amount-${id}`,
  catBalance: id => `leftover-${id}`,
  catCarryover: id => `carryover-${id}`,
  catGoal: id => `goal-${id}`,
};

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
};
