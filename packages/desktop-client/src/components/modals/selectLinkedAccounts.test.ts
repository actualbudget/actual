import { generateAccount } from '@actual-app/core/mocks';
import type { AccountEntity } from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import { getSelectableAccountOptions } from './selectLinkedAccounts';

const addOnBudgetAccountOption = {
  id: 'new-on',
  name: 'Create new account',
};

const addOffBudgetAccountOption = {
  id: 'new-off',
  name: 'Create new account (off budget)',
};

describe('getSelectableAccountOptions', () => {
  it('allows relinking stale accounts from the same sync provider', () => {
    const staleSimpleFinAccount = {
      ...generateAccount('Hilton Honors Aspire', true, false),
      id: 'actual-account-stale-simplefin',
      account_id: 'old-simplefin-id',
      account_sync_source: 'simpleFin',
    } satisfies AccountEntity;
    const selectedVisibleSimpleFinAccount = {
      ...generateAccount('Business Gold Card', true, false),
      id: 'actual-account-visible-simplefin',
      account_id: 'visible-simplefin-id',
      account_sync_source: 'simpleFin',
    } satisfies AccountEntity;
    const goCardlessAccount = {
      ...generateAccount('Checking', true, false),
      id: 'actual-account-gocardless',
      account_id: 'gocardless-id',
      account_sync_source: 'goCardless',
    } satisfies AccountEntity;
    const manualAccount = {
      ...generateAccount('Manual Card', false, false),
      id: 'actual-account-manual',
    };

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
