import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { q } from '#shared/query';
import type { AccountEntity, RuleConditionEntity } from '#types/models';

type AccountCondition = Extract<RuleConditionEntity, { field: 'account' }>;
type AccountMatchable = Pick<AccountEntity, 'id' | 'name' | 'offbudget'>;

export type DbAccountForRules = Awaited<
  ReturnType<typeof db.getAccounts>
>[number];

export type AccountWithComputedBalance = {
  id: string;
  name: string;
  closed: number;
  offbudget: number;
  balance_current: number;
};

function getAccountName(account: AccountMatchable) {
  return account.name.toLowerCase();
}

export function matchesAccountCondition(
  account: AccountMatchable,
  condition: AccountCondition,
) {
  switch (condition.op) {
    case 'is':
      return account.id === condition.value;
    case 'isNot':
      return account.id !== condition.value;
    case 'oneOf':
      return condition.value.includes(account.id);
    case 'notOneOf':
      return !condition.value.includes(account.id);
    case 'contains':
      return getAccountName(account).includes(
        String(condition.value).toLowerCase(),
      );
    case 'doesNotContain':
      return !getAccountName(account).includes(
        String(condition.value).toLowerCase(),
      );
    case 'matches': {
      try {
        return new RegExp(String(condition.value)).test(
          String(account.name).toLowerCase(),
        );
      } catch {
        return false;
      }
    }
    case 'onBudget':
      return account.offbudget === 0;
    case 'offBudget':
      return account.offbudget === 1;
    default:
      return false;
  }
}

export async function resolveAccountIdsFromConditions(
  conditions: RuleConditionEntity[],
  conditionsOp: 'and' | 'or',
): Promise<string[] | undefined> {
  const accountConditions = conditions.filter(
    (condition): condition is AccountCondition => condition.field === 'account',
  );

  if (accountConditions.length === 0) {
    return undefined;
  }

  const accountData = await db.getAccounts();

  const filteredAccounts = accountData.filter(account => {
    const matches = accountConditions.map(condition =>
      matchesAccountCondition(account, condition),
    );

    return conditionsOp === 'or'
      ? matches.some(Boolean)
      : matches.every(Boolean);
  });

  return filteredAccounts.map(account => account.id);
}

export function getAccountRestrictionMode(
  conditions: RuleConditionEntity[],
  conditionsOp: 'and' | 'or',
) {
  if (conditions.length === 0) {
    return false;
  }

  const accountConditions = conditions.filter(
    condition => condition.field === 'account',
  );

  if (accountConditions.length === 0) {
    return false;
  }

  const hasNonAccountConditions = conditions.some(
    condition => condition.field !== 'account',
  );

  return !hasNonAccountConditions || conditionsOp === 'and';
}

export async function getAccounts(
  accountIds?: string[],
): Promise<AccountWithComputedBalance[]> {
  const accounts = await db.getAccounts();
  const selectedAccounts =
    accountIds === undefined
      ? accounts
      : accounts.filter(account => accountIds.includes(account.id));

  if (selectedAccounts.length === 0) {
    return [];
  }

  const ids = selectedAccounts.map(account => account.id);
  const { data: balanceRows } = await aqlQuery(
    q('transactions')
      .filter({
        'account.id': { $oneof: ids },
        tombstone: false,
      })
      .groupBy('account')
      .select(['account', { balance_current: { $sum: '$amount' } }])
      .serialize(),
  );

  const balanceByAccount = new Map<string, number>();
  for (const row of balanceRows as Array<{
    account: string;
    balance_current: number;
  }>) {
    balanceByAccount.set(row.account, row.balance_current ?? 0);
  }

  return selectedAccounts.map(account => ({
    id: account.id,
    name: account.name,
    closed: account.closed,
    offbudget: account.offbudget,
    balance_current: balanceByAccount.get(account.id) ?? 0,
  }));
}

export async function resolveForecastAccounts({
  accountIds,
  plainConditions,
  resolvedConditionsOp,
  canRestrictAccounts,
}: {
  accountIds: string[] | undefined;
  plainConditions: RuleConditionEntity[];
  resolvedConditionsOp: 'and' | 'or';
  canRestrictAccounts: boolean;
}) {
  let resolvedAccountIds = accountIds;

  if (canRestrictAccounts && plainConditions.length > 0) {
    const conditionAccountIds = await resolveAccountIdsFromConditions(
      plainConditions,
      resolvedConditionsOp,
    );
    if (conditionAccountIds !== undefined) {
      resolvedAccountIds =
        resolvedAccountIds !== undefined
          ? resolvedAccountIds.filter(id => conditionAccountIds.includes(id))
          : conditionAccountIds;
    }
  }

  return getAccounts(resolvedAccountIds);
}
