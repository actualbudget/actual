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
import { type SyncedPrefs } from '../types/prefs';

type BudgetType<SheetName extends SheetNames> = Record<
  string,
  SheetFields<SheetName> | ((id: string) => SheetFields<SheetName>)
>;

const accountParametrizedField = parametrizedField<'account'>();
const envelopeParametrizedField = parametrizedField<'envelope-budget'>();
const trackingParametrizedField = parametrizedField<'tracking-budget'>();

export function accountFilter(
  accountId?: AccountEntity['id'] | 'onbudget' | 'offbudget' | 'uncategorized',
  field = 'account',
) {
  if (accountId) {
    if (accountId === 'onbudget') {
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

export function transactions(
  accountId?: AccountEntity['id'] | 'onbudget' | 'offbudget' | 'uncategorized',
) {
  let query = q('transactions').options({ splits: 'grouped' });

  const filter = accountFilter(accountId);
  if (filter) {
    query = query.filter(filter);
  }

  return query;
}

export function transactionsSearch(
  currentQuery: Query,
  search: string,
  dateFormat: SyncedPrefs['dateFormat'],
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

export function accountBalance(acct: AccountEntity) {
  return {
    name: accountParametrizedField('balance')(acct.id),
    query: q('transactions')
      .filter({ account: acct.id })
      .options({ splits: 'none' })
      .calculate({ $sum: '$amount' }),
  } satisfies Binding<'account', 'balance'>;
}

export function accountBalanceCleared(acct: AccountEntity) {
  return {
    name: accountParametrizedField('balanceCleared')(acct.id),
    query: q('transactions')
      .filter({ account: acct.id, cleared: true })
      .options({ splits: 'none' })
      .calculate({ $sum: '$amount' }),
  } satisfies Binding<'account', 'balanceCleared'>;
}

export function accountBalanceUncleared(acct: AccountEntity) {
  return {
    name: accountParametrizedField('balanceUncleared')(acct.id),
    query: q('transactions')
      .filter({ account: acct.id, cleared: false })
      .options({ splits: 'none' })
      .calculate({ $sum: '$amount' }),
  } satisfies Binding<'account', 'balanceUncleared'>;
}

export function allAccountBalance() {
  return {
    query: q('transactions')
      .filter({ 'account.closed': false })
      .calculate({ $sum: '$amount' }),
    name: 'accounts-balance',
  } satisfies Binding<'account', 'accounts-balance'>;
}

export function onBudgetAccountBalance() {
  return {
    name: `onbudget-accounts-balance`,
    query: q('transactions')
      .filter({ 'account.offbudget': false, 'account.closed': false })
      .calculate({ $sum: '$amount' }),
  } satisfies Binding<'account', 'onbudget-accounts-balance'>;
}

export function offBudgetAccountBalance() {
  return {
    name: `offbudget-accounts-balance`,
    query: q('transactions')
      .filter({ 'account.offbudget': true, 'account.closed': false })
      .calculate({ $sum: '$amount' }),
  } satisfies Binding<'account', 'offbudget-accounts-balance'>;
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

export function uncategorizedCount<SheetName extends SheetNames>() {
  return {
    name: 'uncategorized-amount',
    query: uncategorizedQuery.calculate({ $count: '$id' }),
  } satisfies Binding<SheetName, 'uncategorized-amount'>;
}

export const envelopeBudget = {
  incomeAvailable: 'available-funds',
  lastMonthOverspent: 'last-month-overspent',
  forNextMonth: 'buffered',
  totalBudgeted: 'total-budgeted',
  toBudget: 'to-budget',

  fromLastMonth: 'from-last-month',
  totalIncome: 'total-income',
  totalSpent: 'total-spent',
  totalBalance: 'total-leftover',

  groupSumAmount: envelopeParametrizedField('group-sum-amount'),
  groupIncomeReceived: 'total-income',

  groupBudgeted: envelopeParametrizedField('group-budget'),
  groupBalance: envelopeParametrizedField('group-leftover'),

  catBudgeted: envelopeParametrizedField('budget'),
  catSumAmount: envelopeParametrizedField('sum-amount'),
  catBalance: envelopeParametrizedField('leftover'),
  catCarryover: envelopeParametrizedField('carryover'),
  catGoal: envelopeParametrizedField('goal'),
  catLongGoal: envelopeParametrizedField('long-goal'),
} satisfies BudgetType<'envelope-budget'>;

export const trackingBudget = {
  totalBudgetedExpense: 'total-budgeted',
  totalBudgetedIncome: 'total-budget-income',
  totalBudgetedSaved: 'total-saved',

  totalIncome: 'total-income',
  totalSpent: 'total-spent',
  totalSaved: 'real-saved',

  totalLeftover: 'total-leftover',
  groupSumAmount: trackingParametrizedField('group-sum-amount'),
  groupIncomeReceived: 'total-income',

  groupBudgeted: trackingParametrizedField('group-budget'),
  groupBalance: trackingParametrizedField('group-leftover'),

  catBudgeted: trackingParametrizedField('budget'),
  catSumAmount: trackingParametrizedField('sum-amount'),
  catBalance: trackingParametrizedField('leftover'),
  catCarryover: trackingParametrizedField('carryover'),
  catGoal: trackingParametrizedField('goal'),
  catLongGoal: trackingParametrizedField('long-goal'),
} satisfies BudgetType<'tracking-budget'>;
