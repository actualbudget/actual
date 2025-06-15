// @ts-strict-ignore
import { parse as parseDate, isValid as isDateValid } from 'date-fns';

import { evalArithmetic } from 'loot-core/shared/arithmetic';
import { type Currency } from 'loot-core/shared/currencies';
import {
  dayFromDate,
  getDayMonthRegex,
  getDayMonthFormat,
  getShortYearRegex,
  getShortYearFormat,
} from 'loot-core/shared/months';
import { q, type Query } from 'loot-core/shared/query';
import { currencyToAmount, amountToInteger } from 'loot-core/shared/util';
import {
  type CategoryEntity,
  type AccountEntity,
} from 'loot-core/types/models';
import { type SyncedPrefs } from 'loot-core/types/prefs';

import {
  parametrizedField,
  type SheetFields,
  type Binding,
  type SheetNames,
} from '@desktop-client/components/spreadsheet';

type BudgetType<SheetName extends SheetNames> = Record<
  string,
  SheetFields<SheetName> | ((id: string) => SheetFields<SheetName>)
>;

const accountParametrizedField = parametrizedField<'account'>();
const categoryParametrizedField = parametrizedField<'category'>();
const envelopeParametrizedField = parametrizedField<'envelope-budget'>();
const trackingParametrizedField = parametrizedField<'tracking-budget'>();

export function accountFilter(
  accountId?:
    | AccountEntity['id']
    | 'onbudget'
    | 'offbudget'
    | 'closed'
    | 'uncategorized',
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
    } else if (accountId === 'closed') {
      return { [`${field}.closed`]: true };
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
  accountId?:
    | AccountEntity['id']
    | 'onbudget'
    | 'offbudget'
    | 'closed'
    | 'uncategorized',
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
  currency: Currency,
) {
  let amount = evalArithmetic(search, null);
  if (amount === null) {
    amount = currencyToAmount(search);
  }

  const divisor = Math.pow(10, currency.decimalPlaces);

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
      'payee.transfer_acct.name': { $like: `%${search}%` },
      notes: { $like: `%${search}%` },
      'category.name': { $like: `%${search}%` },
      'account.name': { $like: `%${search}%` },
      $or: [
        isDateValid(parsedDate) && { date: dayFromDate(parsedDate) },
        amount != null && {
          amount: {
            $transform: '$abs',
            $eq: amountToInteger(amount, currency.decimalPlaces),
          },
        },
        amount != null &&
          Number.isInteger(amount) &&
          currency.decimalPlaces > 0 && {
            amount: {
              $transform: { $abs: { $idiv: ['$', divisor] } },
              $eq: amount,
            },
          },
      ].filter(Boolean),
    },
  });
}

export function accountBalance(accountId: AccountEntity['id']) {
  return {
    name: accountParametrizedField('balance')(accountId),
    query: q('transactions')
      .filter({ account: accountId })
      .options({ splits: 'none' })
      .calculate({ $sum: '$amount' }),
  } satisfies Binding<'account', 'balance'>;
}

export function accountBalanceCleared(accountId: AccountEntity['id']) {
  return {
    name: accountParametrizedField('balanceCleared')(accountId),
    query: q('transactions')
      .filter({ account: accountId, cleared: true })
      .options({ splits: 'none' })
      .calculate({ $sum: '$amount' }),
  } satisfies Binding<'account', 'balanceCleared'>;
}

export function accountBalanceUncleared(accountId: AccountEntity['id']) {
  return {
    name: accountParametrizedField('balanceUncleared')(accountId),
    query: q('transactions')
      .filter({ account: accountId, cleared: false })
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

export function closedAccountBalance() {
  return {
    name: `closed-accounts-balance`,
    query: q('transactions')
      .filter({ 'account.closed': true })
      .calculate({ $sum: '$amount' }),
  } satisfies Binding<'account', 'closed-accounts-balance'>;
}

export function categoryBalance(
  categoryId: CategoryEntity['id'],
  month: string,
) {
  return {
    name: categoryParametrizedField('balance')(categoryId),
    query: q('transactions')
      .filter({
        category: categoryId,
        date: { $transform: '$month', $eq: month },
      })
      .options({ splits: 'inline' })
      .calculate({ $sum: '$amount' }),
  } satisfies Binding<'category', 'balance'>;
}

export function categoryBalanceCleared(
  categoryId: CategoryEntity['id'],
  month: string,
) {
  return {
    name: categoryParametrizedField('balanceCleared')(categoryId),
    query: q('transactions')
      .filter({
        category: categoryId,
        date: { $transform: '$month', $eq: month },
        cleared: true,
      })
      .options({ splits: 'inline' })
      .calculate({ $sum: '$amount' }),
  } satisfies Binding<'category', 'balanceCleared'>;
}

export function categoryBalanceUncleared(
  categoryId: CategoryEntity['id'],
  month: string,
) {
  return {
    name: categoryParametrizedField('balanceUncleared')(categoryId),
    query: q('transactions')
      .filter({
        category: categoryId,
        date: { $transform: '$month', $eq: month },
        cleared: false,
      })
      .options({ splits: 'inline' })
      .calculate({ $sum: '$amount' }),
  } satisfies Binding<'category', 'balanceUncleared'>;
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

export function uncategorizedBalance<SheetName extends SheetNames>() {
  return {
    name: 'uncategorized-balance',
    query: uncategorizedQuery.calculate({ $sum: '$amount' }),
  } satisfies Binding<SheetName, 'uncategorized-balance'>;
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
  forNextMonth: 'buffered-selected',
  totalBudgeted: 'total-budgeted',
  toBudget: 'to-budget',

  fromLastMonth: 'from-last-month',
  manualBuffered: 'buffered',
  autoBuffered: 'buffered-auto',
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
