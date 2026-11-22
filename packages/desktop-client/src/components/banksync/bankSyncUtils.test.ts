import { generateAccount } from '@actual-app/core/mocks';
import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import {
  getAutomaticSyncMenuText,
  getSyncSourceReadable,
  groupBankSyncAccounts,
} from './bankSyncUtils';

describe('bankSyncUtils', () => {
  it('groups open accounts by provider and leaves unlinked last', () => {
    const goCardlessAccount = generateAccount('GoCardless', true, false);
    const pluggyAccount = {
      ...generateAccount('Pluggy', true, false),
      account_sync_source: 'pluggyai' as const,
    };
    const simpleFinAccount = {
      ...generateAccount('SimpleFIN', true, false),
      account_sync_source: 'simpleFin' as const,
    };
    const unlinkedAccount = generateAccount('Manual', false, false);
    const closedAccount = {
      ...generateAccount('Closed', true, false),
      closed: 1 as const,
    };

    const groupedAccounts = groupBankSyncAccounts([
      unlinkedAccount,
      simpleFinAccount,
      closedAccount,
      pluggyAccount,
      goCardlessAccount,
    ]);

    expect(Object.keys(groupedAccounts)).toEqual([
      'goCardless',
      'pluggyai',
      'simpleFin',
      'unlinked',
    ]);
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
    expect(readable.unlinked).toBe('translated:Unlinked');
  });
});

describe('getAutomaticSyncMenuText', () => {
  const t = ((
    key: string,
    options?: { count?: number; defaultValue_one?: string },
  ) =>
    (options?.count === 1 ? (options.defaultValue_one ?? key) : key).replace(
      '{{count}}',
      String(options?.count),
    )) as TFunction;

  it.each([
    [undefined, 'Automatic syncing: never'],
    ['0', 'Automatic syncing: never'],
    ['720', 'Automatic syncing: every 12 hours'],
    ['1440', 'Automatic syncing: every day'],
    ['10080', 'Automatic syncing: every week'],
    ['45', 'Automatic syncing: every 45 minutes'],
    ['60', 'Automatic syncing: every hour'],
    ['180', 'Automatic syncing: every 3 hours'],
    ['2880', 'Automatic syncing: every 2 days'],
    ['20160', 'Automatic syncing: every 2 weeks'],
  ])('describes an interval of %s minutes', (interval, expected) => {
    expect(getAutomaticSyncMenuText(interval, t)).toBe(expected);
  });
});
