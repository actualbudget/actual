import { q } from 'loot-core/shared/query';
import type { AccountEntity, CategoryEntity } from 'loot-core/types/models';

import {
  parametrizedField,
  type SheetFields,
  type Binding,
  type SheetNames,
} from '.';

type BudgetType<SheetName extends SheetNames> = Record<
  string,
  SheetFields<SheetName> | ((id: string) => SheetFields<SheetName>)
>;

const accountParametrizedField = parametrizedField<'account'>();
const categoryParametrizedField = parametrizedField<'category'>();
const envelopeParametrizedField = parametrizedField<'envelope-budget'>();
const trackingParametrizedField = parametrizedField<'tracking-budget'>();

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
