import { generateAccount } from '@actual-app/core/mocks';
import { describe, expect, it } from 'vitest';

import type { PluggyAiAccount } from './bankSyncUtils';
import {
  getSyncSourceReadable,
  groupBankSyncAccounts,
  mapPluggyAiExternalAccounts,
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

  it('maps pluggy accounts to integer-cent balances', () => {
    const bankAccount: PluggyAiAccount = {
      id: 'bank-1',
      name: 'Conta Corrente',
      type: 'BANK',
      taxNumber: '123.456.789-00',
      owner: 'John Doe',
      balance: 27903.6,
      bankData: {
        automaticallyInvestedBalance: 55807.2,
        closingBalance: 27903.6,
      },
    };
    const creditAccount: PluggyAiAccount = {
      id: 'credit-1',
      name: 'Cartão',
      type: 'CREDIT',
      taxNumber: '',
      owner: 'John Doe',
      balance: 27903.6,
      bankData: {
        automaticallyInvestedBalance: 0,
        closingBalance: 0,
      },
    };

    const [mappedBank, mappedCredit] = mapPluggyAiExternalAccounts([
      bankAccount,
      creditAccount,
    ]);

    expect(mappedBank.balance).toBe(8371080);
    expect(Number.isInteger(mappedBank.balance)).toBe(true);
    expect(mappedBank.name).toBe('Conta Corrente - 123.456.789-00');
    expect(mappedBank.institution).toBe('Conta Corrente');
    expect(mappedBank.orgDomain).toBeNull();
    expect(mappedBank.orgId).toBe('bank-1');

    expect(mappedCredit.balance).toBe(2790360);
    expect(Number.isInteger(mappedCredit.balance)).toBe(true);
    expect(mappedCredit.name).toBe('Cartão - John Doe');
    expect(mappedCredit.account_id).toBe('credit-1');
  });
});
