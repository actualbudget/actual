import { generateAccount } from '@actual-app/core/mocks';
import type { AccountEntity } from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import { getSyncSourceReadable, groupBankSyncAccounts } from './bankSyncUtils';

describe('bankSyncUtils', () => {
  it('groups open accounts by provider and leaves unlinked last', () => {
    const goCardlessAccount = generateAccount('GoCardless', true, false);
    const externalAccount = {
      ...generateAccount('External', true, false),
      account_sync_source: 'external',
    } satisfies AccountEntity;
    const pluggyAccount = {
      ...generateAccount('Pluggy', true, false),
      account_sync_source: 'pluggyai',
    } satisfies AccountEntity;
    const simpleFinAccount = {
      ...generateAccount('SimpleFIN', true, false),
      account_sync_source: 'simpleFin',
    } satisfies AccountEntity;
    const unlinkedAccount = generateAccount('Manual', false, false);
    const closedAccount = {
      ...generateAccount('Closed', true, false),
      closed: 1,
    } satisfies AccountEntity;

    const groupedAccounts = groupBankSyncAccounts([
      unlinkedAccount,
      simpleFinAccount,
      closedAccount,
      externalAccount,
      pluggyAccount,
      goCardlessAccount,
    ]);

    expect(Object.keys(groupedAccounts)).toEqual([
      'external',
      'goCardless',
      'pluggyai',
      'simpleFin',
      'unlinked',
    ]);
    expect(groupedAccounts.external).toEqual([externalAccount]);
    expect(groupedAccounts.goCardless).toEqual([goCardlessAccount]);
    expect(groupedAccounts.pluggyai).toEqual([pluggyAccount]);
    expect(groupedAccounts.simpleFin).toEqual([simpleFinAccount]);
    expect(groupedAccounts.unlinked).toEqual([unlinkedAccount]);
  });

  it('returns stable readable provider labels', () => {
    const readable = getSyncSourceReadable(
      (key: string) => `translated:${key}`,
    );

    expect(readable.goCardless).toBe('GoCardless');
    expect(readable.simpleFin).toBe('SimpleFIN');
    expect(readable.pluggyai).toBe('Pluggy.ai');
    expect(readable.external).toBe('translated:External');
    expect(readable.unlinked).toBe('translated:Unlinked');
  });
});
