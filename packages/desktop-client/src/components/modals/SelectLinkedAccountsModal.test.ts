import type {
  AccountEntity,
  SyncServerSimpleFinAccount,
} from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import {
  computeInitialLinkState,
  getSelectableAccountOptions,
} from './SelectLinkedAccountsModal';

function makeLocalAccount(
  overrides: Partial<AccountEntity> & { id: string },
): AccountEntity {
  return {
    name: overrides.id,
    offbudget: 0,
    closed: 0,
    sort_order: 0,
    last_reconciled: null,
    tombstone: 0,
    account_id: null,
    bank: null,
    bankName: null,
    bankId: null,
    mask: null,
    official_name: null,
    balance_current: null,
    balance_available: null,
    balance_limit: null,
    account_sync_source: null,
    last_sync: null,
    bank_sync_status: null,
    ...overrides,
  };
}

function makeExternalAccount(accountId: string): SyncServerSimpleFinAccount {
  return { account_id: accountId, name: accountId, balance: 0 };
}

const addOnBudgetAccountOption = {
  id: 'new-on',
  name: 'Create new account',
};

const addOffBudgetAccountOption = {
  id: 'new-off',
  name: 'Create new account (off budget)',
};

describe('computeInitialLinkState', () => {
  it('preselects the upgrading account when there is exactly one unmatched external account', () => {
    const localAccounts = [makeLocalAccount({ id: 'local-1' })];
    const externalAccounts = [makeExternalAccount('ext-1')];

    const { initiallyChosenAccounts } = computeInitialLinkState(
      localAccounts,
      externalAccounts,
      'local-1',
    );

    expect(initiallyChosenAccounts['ext-1']).toBe('local-1');
  });

  it('does not preselect when there are multiple unmatched external accounts (regression for #8518)', () => {
    const localAccounts = [makeLocalAccount({ id: 'local-1' })];
    const externalAccounts = [
      makeExternalAccount('ext-1'),
      makeExternalAccount('ext-2'),
    ];

    const { initiallyChosenAccounts } = computeInitialLinkState(
      localAccounts,
      externalAccounts,
      'local-1',
    );

    expect(Object.values(initiallyChosenAccounts)).not.toContain('local-1');
  });

  it('does not preselect when upgradingAccountId is not set', () => {
    const localAccounts = [makeLocalAccount({ id: 'local-1' })];
    const externalAccounts = [makeExternalAccount('ext-1')];

    const { initiallyChosenAccounts } = computeInitialLinkState(
      localAccounts,
      externalAccounts,
      undefined,
    );

    expect(Object.values(initiallyChosenAccounts)).not.toContain('local-1');
  });

  it('leaves an already-linked upgrading account untouched', () => {
    const localAccounts = [
      makeLocalAccount({ id: 'local-1', account_id: 'ext-1' }),
    ];
    const externalAccounts = [
      makeExternalAccount('ext-1'),
      makeExternalAccount('ext-2'),
    ];

    const { initiallyChosenAccounts } = computeInitialLinkState(
      localAccounts,
      externalAccounts,
      'local-1',
    );

    expect(initiallyChosenAccounts).toEqual({ 'ext-1': 'local-1' });
  });
});

describe('getSelectableAccountOptions', () => {
  it('allows relinking stale accounts from the same sync provider', () => {
    const staleSimpleFinAccount = makeLocalAccount({
      id: 'actual-account-stale-simplefin',
      name: 'Hilton Honors Aspire',
      account_id: 'old-simplefin-id',
      account_sync_source: 'simpleFin',
    });
    const selectedVisibleSimpleFinAccount = makeLocalAccount({
      id: 'actual-account-visible-simplefin',
      name: 'Business Gold Card',
      account_id: 'visible-simplefin-id',
      account_sync_source: 'simpleFin',
    });
    const goCardlessAccount = makeLocalAccount({
      id: 'actual-account-gocardless',
      name: 'Checking',
      account_id: 'gocardless-id',
      account_sync_source: 'goCardless',
    });
    const manualAccount = makeLocalAccount({
      id: 'actual-account-manual',
      name: 'Manual Card',
    });

    const options = getSelectableAccountOptions({
      localAccounts: [
        staleSimpleFinAccount,
        selectedVisibleSimpleFinAccount,
        goCardlessAccount,
        manualAccount,
      ],
      selectedLocalAccountIds: new Set([selectedVisibleSimpleFinAccount.id]),
      chosenAccount: undefined,
      syncSource: 'simpleFin',
      addOnBudgetAccountOption,
      addOffBudgetAccountOption,
    });

    expect(options.map(option => option.name)).toEqual([
      'Hilton Honors Aspire',
      'Manual Card',
      'Create new account',
      'Create new account (off budget)',
    ]);
  });
});
