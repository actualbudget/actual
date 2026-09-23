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
  MAX_SAFE_NUMBER,
} from '@actual-app/core/shared/util';
import type { AccountEntity } from '@actual-app/core/types/models';
import type { SyncedPrefs } from '@actual-app/core/types/prefs';
// @ts-strict-ignore
import { isValid as isDateValid, parse as parseDate } from 'date-fns';
import { escapeRegExp } from 'es-toolkit';

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
  currencySymbol: string,
  precision = 2,
) {
  // currencyToAmount ignores letters, so "35mm" would match the amount 35.
  // Letters make a search text-only, except a leading or trailing currency
  // symbol ("120 kr", "-CHF 12").
  const symbol = escapeRegExp(currencySymbol);
  const amountSearch = currencySymbol
    ? search.replace(
        new RegExp(
          `^([^\\p{L}\\d]*)${symbol}|${symbol}(?=[^\\p{L}\\d]*$)`,
          'iu',
        ),
        '$1',
      )
    : search;
  const textOnly = /\p{L}/u.test(amountSearch);
  const parseStoredAmount = (text: string) => {
    const major = currencyToAmount(text);
    if (major === null) return null;
    const scaled = major * 10 ** precision;
    const stored = amountToInteger(major, precision);
    return Number.isSafeInteger(stored) &&
      Math.abs(stored) <= MAX_SAFE_NUMBER &&
      Math.abs(scaled - stored) < 1e-7
      ? stored
      : null;
  };
  const comparison = search.match(
    /^\s*(<=|>=|<|>|=)\s*(-?\d+(?:[.,]\d+)?)\s*$/,
  );
  const range = search.match(
    /^\s*(-?\d+(?:[.,]\d+)?)\s*\.\.\s*(-?\d+(?:[.,]\d+)?)\s*$/,
  );
  const comparisonAmount = comparison ? parseStoredAmount(comparison[2]) : null;
  const rangeStart = range ? parseStoredAmount(range[1]) : null;
  const rangeEnd = range ? parseStoredAmount(range[2]) : null;
  const plainAmount =
    !comparison && !range && !textOnly ? amountSearch.trim() : null;
  const amount = plainAmount !== null ? parseStoredAmount(plainAmount) : null;
  const majorAmount =
    plainAmount !== null ? currencyToAmount(plainAmount) : null;
  const comparisonOperator =
    comparison &&
    (
      {
        '>': '$gt',
        '>=': '$gte',
        '<': '$lt',
        '<=': '$lte',
        '=': '$eq',
      } as const
    )[comparison[1]];
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
        comparisonAmount != null &&
          comparisonOperator && {
            amount: { [comparisonOperator]: comparisonAmount },
          },
        rangeStart != null &&
          rangeEnd != null &&
          rangeStart <= rangeEnd && {
            $and: [
              { amount: { $gte: rangeStart } },
              { amount: { $lte: rangeEnd } },
            ],
          },
        amount != null && {
          amount: { $transform: '$abs', $eq: Math.abs(amount) },
        },
        amount != null &&
          majorAmount != null &&
          Number.isInteger(majorAmount) && {
            amount: {
              $transform: { $abs: { $idiv: ['$', 10 ** precision] } },
              $eq: Math.abs(majorAmount),
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
