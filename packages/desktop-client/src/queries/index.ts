// @ts-strict-ignore
import { parse as parseDate, isValid as isDateValid } from 'date-fns';

import {
  dayFromDate,
  getDayMonthRegex,
  getDayMonthFormat,
  getShortYearRegex,
  getShortYearFormat,
} from 'loot-core/shared/months';
import { q, type Query } from 'loot-core/shared/query';
import { currencyToAmount, amountToInteger } from 'loot-core/shared/util';
import { type AccountEntity } from 'loot-core/types/models';
import { type SyncedPrefs } from 'loot-core/types/prefs';

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

  // Extract tags from search
  const tagMatches = search.match(/(?<!#)(#[^#\s]+)/g);
  const tags = tagMatches ? tagMatches.map(tag => tag.slice(1)) : [];

  // Remove tags from search text for other matching
  const searchWithoutTags = search.replace(/(?<!#)(#[^#\s]+)/g, '').trim();

  // Support various date formats
  let parsedDate;
  if (getDayMonthRegex(dateFormat).test(searchWithoutTags)) {
    parsedDate = parseDate(
      searchWithoutTags,
      getDayMonthFormat(dateFormat),
      new Date(),
    );
  } else if (getShortYearRegex(dateFormat).test(searchWithoutTags)) {
    parsedDate = parseDate(
      searchWithoutTags,
      getShortYearFormat(dateFormat),
      new Date(),
    );
  } else {
    parsedDate = parseDate(searchWithoutTags, dateFormat, new Date());
  }

  const searchConditions: Record<string, unknown> & {
    $or: Array<unknown>;
    $and?: Array<unknown>;
  } = {
    'payee.name': { $like: `%${searchWithoutTags}%` },
    'payee.transfer_acct.name': { $like: `%${searchWithoutTags}%` },
    notes: { $like: `%${searchWithoutTags}%` },
    'category.name': { $like: `%${searchWithoutTags}%` },
    'account.name': { $like: `%${searchWithoutTags}%` },
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
  };

  // Add tag-specific filtering if tags are found
  if (tags.length > 0) {
    const tagConditions = tags.map(tag => ({
      notes: {
        $regexp: `(?<!#)${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s#]|$)`,
      },
    }));

    // Use $and for tags (all tags must be present) in search
    searchConditions.$and = tagConditions;
  }

  return currentQuery.filter({
    $or: searchConditions,
  });
}
