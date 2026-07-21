import type {
  AccountEntity,
  SyncServerSimpleFinAccount,
} from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import { computeInitialLinkState } from './SelectLinkedAccountsModal';

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
