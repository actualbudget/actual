import type { AccountEntity } from '@actual-app/core/types/models';

import { getAccountIdsToSync } from './mutations';

const account = (
  id: string,
  overrides: Partial<AccountEntity> = {},
): AccountEntity =>
  ({
    id,
    name: `Account ${id}`,
    bank: 'bank1',
    closed: 0,
    tombstone: 0,
    offbudget: 0,
    sort_order: 0,
    account_sync_source: 'goCardless',
    ...overrides,
  }) as AccountEntity;

describe('getAccountIdsToSync', () => {
  it('syncs only the accounts named by `ids`', () => {
    // GoCardless credentials are server-wide, so repairing them has to retry
    // every GoCardless account — but nothing beyond them. Other providers have
    // their own request allowances and their own failures.
    const accounts = [
      account('gc1'),
      account('sf1', { account_sync_source: 'simpleFin' }),
      account('gc2'),
    ];

    expect(getAccountIdsToSync(accounts, { ids: ['gc1', 'gc2'] })).toEqual([
      'gc1',
      'gc2',
    ]);
  });

  it('leaves out closed, deleted and unlinked accounts named by `ids`', () => {
    const accounts = [
      account('gc1'),
      account('gc2', { closed: 1 }),
      account('gc3', { tombstone: 1 }),
      account('gc4', { bank: undefined }),
    ];

    expect(
      getAccountIdsToSync(accounts, { ids: ['gc1', 'gc2', 'gc3', 'gc4'] }),
    ).toEqual(['gc1']);
  });

  it('ignores ids that name no account', () => {
    expect(getAccountIdsToSync([account('gc1')], { ids: ['nope'] })).toEqual(
      [],
    );
  });

  it('prefers `ids` over `id`', () => {
    const accounts = [account('gc1'), account('gc2')];

    expect(getAccountIdsToSync(accounts, { id: 'gc1', ids: ['gc2'] })).toEqual([
      'gc2',
    ]);
  });

  it('syncs every linked account when nothing is selected', () => {
    const accounts = [
      account('gc1'),
      account('sf1', { account_sync_source: 'simpleFin' }),
      account('gc2', { closed: 1 }),
    ];

    expect(getAccountIdsToSync(accounts, {})).toEqual(['gc1', 'sf1']);
  });

  it('syncs the single account named by `id` without filtering it', () => {
    expect(getAccountIdsToSync([], { id: 'gc1' })).toEqual(['gc1']);
  });

  it('syncs an on- or off-budget group', () => {
    const accounts = [
      account('on1', { offbudget: 0, sort_order: 1 }),
      account('off1', { offbudget: 1, sort_order: 0 }),
      account('on2', { offbudget: 0, sort_order: 0 }),
    ];

    expect(getAccountIdsToSync(accounts, { id: 'onbudget' })).toEqual([
      'on2',
      'on1',
    ]);
    expect(getAccountIdsToSync(accounts, { id: 'offbudget' })).toEqual([
      'off1',
    ]);
  });

  it('orders on-budget accounts before off-budget ones', () => {
    const accounts = [
      account('off1', { offbudget: 1, sort_order: 0 }),
      account('on1', { offbudget: 0, sort_order: 1 }),
    ];

    expect(getAccountIdsToSync(accounts, {})).toEqual(['on1', 'off1']);
    expect(getAccountIdsToSync(accounts, { ids: ['off1', 'on1'] })).toEqual([
      'on1',
      'off1',
    ]);
  });
});
