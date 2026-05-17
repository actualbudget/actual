import { describe, expect, it } from 'vitest';

import type { RuleConditionEntity } from '#types/models';

import { buildFilterInfo, matchesAQLFilter } from './forecast-filters';

describe('forecast filters', () => {
  it('does not pre-restrict accounts for mixed OR filters', () => {
    const { filterInfo } = buildFilterInfo(
      [
        { op: 'is', field: 'account', value: 'acct-1' },
        { op: 'is', field: 'payee', value: 'payee-1' },
      ] satisfies RuleConditionEntity[],
      'or',
    );

    expect(filterInfo.conditionsOpKey).toBe('$or');
    expect(filterInfo.canRestrictAccounts).toBe(false);
  });

  it('allows account pre-restriction for account-only filters', () => {
    const { filterInfo } = buildFilterInfo(
      [
        { op: 'is', field: 'account', value: 'acct-1' },
      ] satisfies RuleConditionEntity[],
      'and',
    );

    expect(filterInfo.conditionsOpKey).toBe('$and');
    expect(filterInfo.canRestrictAccounts).toBe(true);
  });

  it('matches on-budget AQL filter (boolean) to enriched account.offbudget 0/1', () => {
    const { filterInfo } = buildFilterInfo(
      [
        {
          field: 'account',
          op: 'onBudget',
          value: '',
        },
      ],
      'and',
    );

    expect(filterInfo.filters.length).toBeGreaterThan(0);
    const aqlFilter = filterInfo.filters[0];
    const onBudgetAccount = {
      id: 'acct-checking',
      name: 'Checking',
      closed: 0,
      offbudget: 0,
      balance_current: 100,
    };

    expect(
      matchesAQLFilter(
        {
          account: onBudgetAccount,
        } as Record<string, unknown>,
        aqlFilter,
      ),
    ).toBe(true);

    const offBudgetAccount = { ...onBudgetAccount, offbudget: 1 };
    expect(
      matchesAQLFilter(
        {
          account: offBudgetAccount,
        } as Record<string, unknown>,
        aqlFilter,
      ),
    ).toBe(false);
  });
});
