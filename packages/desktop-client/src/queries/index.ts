import {
  dayFromDate,
  getDayMonthFormat,
  getDayMonthRegex,
  getShortYearFormat,
  getShortYearRegex,
} from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type { Query } from '@actual-app/core/shared/query';
import {
  amountToInteger,
  currencyToAmount,
} from '@actual-app/core/shared/util';
import type { AccountEntity } from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';
// @ts-strict-ignore
import { isValid as isDateValid, parse as parseDate } from 'date-fns';

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
) {
  const amount = currencyToAmount(search);
  const escapedSearch = search.replace(/[\\%?]/g, '\\$&');

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
      'payee.name': { $like: `%${escapedSearch}%` },
      'payee.transfer_acct.name': { $like: `%${escapedSearch}%` },
      notes: { $like: `%${escapedSearch}%` },
      'category.name': { $like: `%${escapedSearch}%` },
      'account.name': { $like: `%${escapedSearch}%` },
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

export function uncategorizedTransactions() {
  return q('transactions').filter({
    'account.offbudget': false,
    category: null,
    $or: [
      {
        'payee.transfer_acct.offbudget': true,
        'payee.transfer_acct': null,
      },
    ],
  });
}
