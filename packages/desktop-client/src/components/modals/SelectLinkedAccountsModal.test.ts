import type {
  AccountEntity,
  SyncServerSimpleFinAccount,
} from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import {
  computeInitialLinkState,
  getDefaultStartingSettings,
  getSelectableAccountOptions,
  isLinkCompatible,
  newAccountCurrency,
  previewBalance,
  reencodeStartingSettings,
  resolveStartingSettings,
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
    account_group_id: null,
    currency: null,
    currency_precision: null,
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

describe('resolveStartingSettings', () => {
  it('sends no starting balance when the user only changed the date', () => {
    // A row starts with a default date and no balance. Editing the date keeps
    // the rest of the settings, which must not introduce a balance of 0.
    const settings = { ...getDefaultStartingSettings(), date: '2026-01-15' };

    expect(resolveStartingSettings(settings)).toEqual({
      startingDate: '2026-01-15',
      startingBalance: undefined,
    });
  });

  it('sends no starting balance when nothing was touched', () => {
    expect(resolveStartingSettings(undefined)).toEqual({
      startingDate: undefined,
      startingBalance: undefined,
    });
  });

  it('sends the balance once the user enters one', () => {
    const settings = { ...getDefaultStartingSettings(), amount: 12345 };

    expect(resolveStartingSettings(settings).startingBalance).toBe(12345);
  });

  it('sends a balance the user deliberately set to zero', () => {
    const settings = { ...getDefaultStartingSettings(), amount: 0 };

    expect(resolveStartingSettings(settings).startingBalance).toBe(0);
  });

  it('ignores a blank date', () => {
    expect(
      resolveStartingSettings({ date: '   ' }).startingDate,
    ).toBeUndefined();
  });
});

describe('getDefaultStartingSettings', () => {
  it('does not include a starting balance', () => {
    expect(getDefaultStartingSettings().amount).toBeUndefined();
  });
});

describe('previewBalance', () => {
  it('encodes decimal balances and hides values the budget cannot store', () => {
    expect(previewBalance('12.345', 3)).toBe(12345);
    expect(previewBalance('12.34', 0)).toBe(12);
    // Numeric balances (Pluggy.ai, Akahu) are major units too.
    expect(previewBalance(12.34, 2)).toBe(1234);
    expect(previewBalance(2500, 3)).toBe(2500000);
    expect(previewBalance('9'.repeat(30), 2)).toBeNull();
  });
});

describe('linking provider accounts by currency', () => {
  const multicurrency = { multicurrency: true, budgetCurrency: 'USD' };
  const legacy = { multicurrency: false, budgetCurrency: 'USD' };

  it('creates accounts in the provider currency when multicurrency is on', () => {
    expect(newAccountCurrency('JPY', multicurrency)).toBe('JPY');
    expect(newAccountCurrency('USD', multicurrency)).toBeNull();
    expect(newAccountCurrency(null, multicurrency)).toBeNull();
    // A currency no account can hold offers no new account.
    expect(newAccountCurrency('XAU', multicurrency)).toBeUndefined();
    expect(newAccountCurrency('JPY', legacy)).toBeNull();
  });

  it('offers only local accounts in the provider currency', () => {
    const yen = makeLocalAccount({ id: 'yen', currency: 'JPY' });
    const base = makeLocalAccount({ id: 'base' });
    expect(isLinkCompatible(yen, 'JPY', multicurrency)).toBe(true);
    expect(isLinkCompatible(base, 'JPY', multicurrency)).toBe(false);
    expect(isLinkCompatible(base, 'USD', multicurrency)).toBe(true);
    expect(isLinkCompatible(yen, null, multicurrency)).toBe(false);
    expect(isLinkCompatible(base, null, multicurrency)).toBe(true);
    expect(isLinkCompatible(base, 'JPY', legacy)).toBe(true);

    const options = (providerCurrency: string) =>
      getSelectableAccountOptions({
        localAccounts: [yen, base],
        selectedLocalAccountIds: new Set(),
        chosenAccount: undefined,
        syncSource: 'simpleFin',
        addOnBudgetAccountOption,
        addOffBudgetAccountOption,
        providerCurrency,
        currencyContext: multicurrency,
      }).map(option => option.id);
    expect(options('JPY')).toEqual(['yen', 'new-on', 'new-off']);
    expect(options('XAU')).toEqual([]);
  });
});

describe('reencodeStartingSettings', () => {
  it('moves a typed balance to the destination precision or drops it', () => {
    const typed = { date: '2026-03-01', amount: 100, precision: 0 };
    expect(reencodeStartingSettings(typed, 2)).toEqual({
      date: '2026-03-01',
      amount: 10000,
      precision: 2,
    });
    expect(
      reencodeStartingSettings(
        { date: '2026-03-01', amount: 150, precision: 2 },
        0,
      ),
    ).toEqual({ date: '2026-03-01' });
    expect(reencodeStartingSettings(typed, 0)).toBe(typed);
  });
});

describe('computeInitialLinkState with currencies', () => {
  it('does not preselect an upgrading account in another currency', () => {
    const yen = makeLocalAccount({ id: 'yen', currency: 'JPY' });
    const external = { ...makeExternalAccount('remote'), currency: 'USD' };
    const context = { multicurrency: true, budgetCurrency: 'USD' };
    expect(
      computeInitialLinkState([yen], [external], 'yen', context)
        .initiallyChosenAccounts,
    ).toEqual({});
    expect(
      computeInitialLinkState(
        [yen],
        [{ ...external, currency: 'JPY' }],
        'yen',
        context,
      ).initiallyChosenAccounts,
    ).toEqual({ remote: 'yen' });
  });
});
