import { aqlQuery } from '#server/aql';
import { conditionsToAQL } from '#server/transactions/transaction-rules';
import { q } from '#shared/query';
import type { RuleConditionEntity, TransactionEntity } from '#types/models';

import { getAccountRestrictionMode } from './forecast-accounts';
import type { AccountWithComputedBalance } from './forecast-accounts';

type PayeeForFiltering = {
  id: string;
  name: string;
  transfer_acct: string | null;
};

type CategoryGroupForFiltering = {
  id: string;
  name: string;
};

type CategoryForFiltering = {
  id: string;
  name: string;
  group: CategoryGroupForFiltering | null;
};

export type ForecastFilterObject = {
  id: string;
  amount: number;
  date: string;
  notes: string | null;
  cleared: boolean;
  reconciled: boolean;
  transfer_id: string | null;
  is_parent: boolean;
  imported_payee: string | null;
  account: AccountWithComputedBalance | null;
  payee: PayeeForFiltering | null;
  category: CategoryForFiltering | null;
};

export type ForecastFilterInfo = {
  filters: Array<Record<string, unknown>>;
  conditionsOpKey: '$and' | '$or';
  canRestrictAccounts: boolean;
};

export function buildFilterInfo(
  conditions?: RuleConditionEntity[],
  conditionsOp?: 'and' | 'or',
) {
  const resolvedConditionsOp = conditionsOp ?? 'and';
  const plainConditions = (conditions ?? []).filter(cond => !cond.customName);
  const { filters } = conditionsToAQL(plainConditions);

  return {
    filterInfo: {
      filters: [
        ...filters,
        ...plainConditions.flatMap(condition =>
          condition.queryFilter
            ? [condition.queryFilter as Record<string, unknown>]
            : [],
        ),
      ],
      conditionsOpKey: resolvedConditionsOp === 'or' ? '$or' : '$and',
      canRestrictAccounts: getAccountRestrictionMode(
        plainConditions,
        resolvedConditionsOp,
      ),
    } satisfies ForecastFilterInfo,
    plainConditions,
    resolvedConditionsOp,
  };
}

export async function getTransactions(
  accountIds: string[] | undefined,
  filterInfo: ForecastFilterInfo,
) {
  let query = q('transactions')
    .filter({ tombstone: false })
    .select('*')
    .options({ splits: 'inline' });

  if (accountIds !== undefined) {
    if (accountIds.length === 0) {
      return [];
    }

    query = query.filter({ 'account.id': { $oneof: accountIds } });
  }

  if (filterInfo.filters.length > 0) {
    query = query.filter({ [filterInfo.conditionsOpKey]: filterInfo.filters });
  }

  const { data } = await aqlQuery(query);
  return data;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getValueByPath(
  object: Record<string, unknown> | null | undefined,
  path: string,
): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, object);
}

function normalizeComparisonValue(value: unknown) {
  if (
    value != null &&
    typeof value === 'object' &&
    'id' in (value as Record<string, unknown>)
  ) {
    return (value as Record<string, unknown>).id;
  }

  return value;
}

/** AQL from {@link conditionsToAQL} uses booleans for account.offbudget; enriched accounts use 0/1. */
function equalComparableFilterValues(actual: unknown, expected: unknown) {
  const a = normalizeComparisonValue(actual);
  if (a === expected) {
    return true;
  }

  if (typeof expected === 'boolean' && (a === 0 || a === 1)) {
    return (expected === false && a === 0) || (expected === true && a === 1);
  }

  return false;
}

function applyTransform(value: unknown, transform: unknown) {
  if (transform === '$lower' && typeof value === 'string') {
    return value.toLowerCase();
  }

  if (transform === '$neg' && typeof value === 'number') {
    return -value;
  }

  return value;
}

function likeToRegex(pattern: string) {
  const regex = '^' + escapeRegex(pattern).replace(/%/g, '.*') + '$';
  return new RegExp(regex, 'i');
}

function evaluateClause(actualValue: unknown, clause: unknown): boolean {
  if (Array.isArray(clause)) {
    return clause.every(item => evaluateClause(actualValue, item));
  }

  if (clause == null || typeof clause !== 'object') {
    return equalComparableFilterValues(actualValue, clause);
  }

  const typedClause = clause as Record<string, unknown>;
  const transform = typedClause.$transform;
  const transformedActualValue = applyTransform(actualValue, transform);

  return Object.entries(typedClause)
    .filter(([key]) => key !== '$transform')
    .every(([operator, expectedValue]) => {
      const normalizedActualValue = normalizeComparisonValue(
        transformedActualValue,
      );

      switch (operator) {
        case '$eq':
          return equalComparableFilterValues(
            normalizedActualValue,
            expectedValue,
          );
        case '$ne':
          return !equalComparableFilterValues(
            normalizedActualValue,
            expectedValue,
          );
        case '$gt':
          return (
            normalizedActualValue != null &&
            (typeof normalizedActualValue === 'number' ||
              typeof normalizedActualValue === 'string') &&
            (typeof expectedValue === 'number' ||
              typeof expectedValue === 'string') &&
            normalizedActualValue > expectedValue
          );
        case '$gte':
          return (
            normalizedActualValue != null &&
            (typeof normalizedActualValue === 'number' ||
              typeof normalizedActualValue === 'string') &&
            (typeof expectedValue === 'number' ||
              typeof expectedValue === 'string') &&
            normalizedActualValue >= expectedValue
          );
        case '$lt':
          return (
            normalizedActualValue != null &&
            (typeof normalizedActualValue === 'number' ||
              typeof normalizedActualValue === 'string') &&
            (typeof expectedValue === 'number' ||
              typeof expectedValue === 'string') &&
            normalizedActualValue < expectedValue
          );
        case '$lte':
          return (
            normalizedActualValue != null &&
            (typeof normalizedActualValue === 'number' ||
              typeof normalizedActualValue === 'string') &&
            (typeof expectedValue === 'number' ||
              typeof expectedValue === 'string') &&
            normalizedActualValue <= expectedValue
          );
        case '$oneof':
          return (
            Array.isArray(expectedValue) &&
            expectedValue.some(expectedItem =>
              equalComparableFilterValues(normalizedActualValue, expectedItem),
            )
          );
        case '$like':
          return (
            typeof normalizedActualValue === 'string' &&
            typeof expectedValue === 'string' &&
            likeToRegex(expectedValue).test(normalizedActualValue)
          );
        case '$notlike':
          return (
            typeof normalizedActualValue === 'string' &&
            typeof expectedValue === 'string' &&
            !likeToRegex(expectedValue).test(normalizedActualValue)
          );
        case '$regexp':
          if (
            typeof normalizedActualValue !== 'string' ||
            typeof expectedValue !== 'string'
          ) {
            return false;
          }

          try {
            return new RegExp(expectedValue).test(normalizedActualValue);
          } catch {
            return false;
          }
        default:
          return false;
      }
    });
}

export function matchesAQLFilter(
  object: Record<string, unknown>,
  filter: Record<string, unknown>,
): boolean {
  if ('$and' in filter) {
    const clauses = filter.$and;
    return Array.isArray(clauses)
      ? clauses.every(clause =>
          matchesAQLFilter(object, clause as Record<string, unknown>),
        )
      : false;
  }

  if ('$or' in filter) {
    const clauses = filter.$or;
    return Array.isArray(clauses)
      ? clauses.some(clause =>
          matchesAQLFilter(object, clause as Record<string, unknown>),
        )
      : false;
  }

  return Object.entries(filter).every(([field, value]) => {
    const fieldValue = getValueByPath(object, field);

    if (Array.isArray(value)) {
      return value.every(clause => evaluateClause(fieldValue, clause));
    }

    if (value != null && typeof value === 'object') {
      return evaluateClause(fieldValue, value);
    }

    return equalComparableFilterValues(fieldValue, value);
  });
}

export function matchesForecastFilters(
  filterObject: ForecastFilterObject,
  filterInfo: ForecastFilterInfo,
) {
  if (filterInfo.filters.length === 0) {
    return true;
  }

  const method = filterInfo.conditionsOpKey === '$or' ? 'some' : 'every';
  return filterInfo.filters[method](filter =>
    matchesAQLFilter(filterObject as Record<string, unknown>, filter),
  );
}

export async function enrichForecastFilterObjects(
  transactions: TransactionEntity[],
  accountsById: Map<string, AccountWithComputedBalance>,
) {
  const payeeIds = [
    ...new Set(transactions.flatMap(tx => (tx.payee ? [tx.payee] : []))),
  ];
  const categoryIds = [
    ...new Set(transactions.flatMap(tx => (tx.category ? [tx.category] : []))),
  ];

  const [{ data: payees }, { data: categories }] = await Promise.all([
    payeeIds.length > 0
      ? aqlQuery(
          q('payees')
            .filter({ id: { $oneof: payeeIds } })
            .select(['id', 'name', 'transfer_acct']),
        )
      : Promise.resolve({ data: [] }),
    categoryIds.length > 0
      ? aqlQuery(
          q('categories')
            .filter({ id: { $oneof: categoryIds } })
            .select(['id', 'name', 'group']),
        )
      : Promise.resolve({ data: [] }),
  ]);

  const categoryGroupIds = [
    ...new Set(
      (categories as Array<{ group: string | null }>).flatMap(category =>
        category.group ? [category.group] : [],
      ),
    ),
  ];

  const { data: categoryGroups } =
    categoryGroupIds.length > 0
      ? await aqlQuery(
          q('category_groups')
            .filter({ id: { $oneof: categoryGroupIds } })
            .select(['id', 'name']),
        )
      : { data: [] };

  const payeesById = new Map(
    (payees as PayeeForFiltering[]).map(payee => [payee.id, payee]),
  );
  const categoryGroupsById = new Map(
    (categoryGroups as CategoryGroupForFiltering[]).map(group => [
      group.id,
      group,
    ]),
  );
  const categoriesById = new Map(
    (
      categories as Array<{ id: string; name: string; group: string | null }>
    ).map(category => [
      category.id,
      {
        id: category.id,
        name: category.name,
        group: category.group
          ? (categoryGroupsById.get(category.group) ?? null)
          : null,
      } satisfies CategoryForFiltering,
    ]),
  );

  return new Map(
    transactions.map(transaction => [
      transaction.id,
      {
        id: transaction.id,
        amount: transaction.amount,
        date: transaction.date,
        notes: transaction.notes ?? null,
        cleared: !!transaction.cleared,
        reconciled: !!transaction.reconciled,
        transfer_id: transaction.transfer_id ?? null,
        is_parent: !!transaction.is_parent,
        imported_payee: transaction.imported_payee ?? null,
        account: accountsById.get(transaction.account) ?? null,
        payee: transaction.payee
          ? (payeesById.get(transaction.payee) ?? null)
          : null,
        category: transaction.category
          ? (categoriesById.get(transaction.category) ?? null)
          : null,
      } satisfies ForecastFilterObject,
    ]),
  );
}
