// @ts-strict-ignore
import { vi, beforeEach, describe, it, expect } from 'vitest';

import * as asyncStorage from '../../platform/server/asyncStorage';
import * as db from '../db';
import { loadMappings } from '../db/mappings';

import * as bankSync from './sync';
import { app } from './app';

vi.mock('./sync', () => ({
  syncAccount: vi.fn(),
}));

beforeEach(async () => {
  vi.clearAllMocks();
  await global.emptyDatabase()();
  await loadMappings();
});

describe('SimpleFin batch sync', () => {
  it('should call syncAccount individually for each SimpleFin account', async () => {
    // Setup: Create test accounts
    const accountId1 = await db.insertAccount({
      id: 'simplefin-account-1',
      name: 'SimpleFin Account 1',
      account_id: 'ext-account-1',
      account_sync_source: 'simpleFin',
      offbudget: 0,
      closed: 0,
    });

    const accountId2 = await db.insertAccount({
      id: 'simplefin-account-2',
      name: 'SimpleFin Account 2',
      account_id: 'ext-account-2',
      account_sync_source: 'simpleFin',
      offbudget: 0,
      closed: 0,
    });

    // Create a bank for the accounts
    const bankId = await db.insertWithUUID('banks', {
      id: 'test-bank-id',
      bank_id: 'simplefin-bank',
    });

    await db.update('accounts', {
      id: accountId1,
      bank: bankId,
    });

    await db.update('accounts', {
      id: accountId2,
      bank: bankId,
    });

    // Mock asyncStorage
    vi.spyOn(asyncStorage, 'multiGet').mockResolvedValue({
      'user-id': 'test-user-id',
      'user-key': 'test-user-key',
    });

    // Mock successful sync responses
    vi.mocked(bankSync.syncAccount).mockResolvedValue({
      added: [],
      updated: [],
    });

    // Execute
    const result = await app.handlers['simplefin-batch-sync']({
      ids: [accountId1, accountId2],
    });

    // Verify: syncAccount was called twice (once per account)
    expect(bankSync.syncAccount).toHaveBeenCalledTimes(2);
    expect(bankSync.syncAccount).toHaveBeenNthCalledWith(
      1,
      'test-user-id',
      'test-user-key',
      accountId1,
      'ext-account-1',
      'simplefin-bank',
    );
    expect(bankSync.syncAccount).toHaveBeenNthCalledWith(
      2,
      'test-user-id',
      'test-user-key',
      accountId2,
      'ext-account-2',
      'simplefin-bank',
    );

    // Verify: result contains both accounts
    expect(result).toHaveLength(2);
    expect(result[0].accountId).toBe(accountId1);
    expect(result[1].accountId).toBe(accountId2);
    expect(result[0].res.errors).toHaveLength(0);
    expect(result[1].res.errors).toHaveLength(0);
  });

  it('should properly handle errors for individual accounts', async () => {
    // Setup: Create test accounts
    const accountId1 = await db.insertAccount({
      id: 'simplefin-account-1',
      name: 'SimpleFin Account 1',
      account_id: 'ext-account-1',
      account_sync_source: 'simpleFin',
      offbudget: 0,
      closed: 0,
    });

    const accountId2 = await db.insertAccount({
      id: 'simplefin-account-2',
      name: 'SimpleFin Account 2',
      account_id: 'ext-account-2',
      account_sync_source: 'simpleFin',
      offbudget: 0,
      closed: 0,
    });

    // Create a bank for the accounts
    const bankId = await db.insertWithUUID('banks', {
      id: 'test-bank-id',
      bank_id: 'simplefin-bank',
    });

    await db.update('accounts', {
      id: accountId1,
      bank: bankId,
    });

    await db.update('accounts', {
      id: accountId2,
      bank: bankId,
    });

    // Mock asyncStorage
    vi.spyOn(asyncStorage, 'multiGet').mockResolvedValue({
      'user-id': 'test-user-id',
      'user-key': 'test-user-key',
    });

    // Mock: First account succeeds, second account fails
    vi.mocked(bankSync.syncAccount)
      .mockResolvedValueOnce({
        added: ['tx-1', 'tx-2'],
        updated: [],
      })
      .mockRejectedValueOnce({
        type: 'BankSyncError',
        category: 'ITEM_LOGIN_REQUIRED',
        code: 'ITEM_LOGIN_REQUIRED',
        message: 'Re-authentication required',
      });

    // Execute
    const result = await app.handlers['simplefin-batch-sync']({
      ids: [accountId1, accountId2],
    });

    // Verify: Both accounts are in the result
    expect(result).toHaveLength(2);

    // First account succeeded
    expect(result[0].accountId).toBe(accountId1);
    expect(result[0].res.errors).toHaveLength(0);
    expect(result[0].res.newTransactions).toEqual(['tx-1', 'tx-2']);

    // Second account failed
    expect(result[1].accountId).toBe(accountId2);
    expect(result[1].res.errors).toHaveLength(1);
    expect(result[1].res.errors[0]).toMatchObject({
      type: 'SyncError',
      accountId: accountId2,
      category: 'ITEM_LOGIN_REQUIRED',
      code: 'ITEM_LOGIN_REQUIRED',
    });
    expect(result[1].res.newTransactions).toHaveLength(0);
  });

  it('should only sync SimpleFin accounts with valid bank and account_id', async () => {
    // Setup: Create accounts with various states
    const validAccountId = await db.insertAccount({
      id: 'valid-simplefin-account',
      name: 'Valid SimpleFin Account',
      account_id: 'ext-account-valid',
      account_sync_source: 'simpleFin',
      offbudget: 0,
      closed: 0,
    });

    const noBankAccountId = await db.insertAccount({
      id: 'no-bank-account',
      name: 'No Bank Account',
      account_id: 'ext-account-no-bank',
      account_sync_source: 'simpleFin',
      offbudget: 0,
      closed: 0,
      bank: null,
    });

    const noExternalIdAccountId = await db.insertAccount({
      id: 'no-external-id-account',
      name: 'No External ID Account',
      account_id: null,
      account_sync_source: 'simpleFin',
      offbudget: 0,
      closed: 0,
    });

    // Create a bank for the valid account
    const bankId = await db.insertWithUUID('banks', {
      id: 'test-bank-id',
      bank_id: 'simplefin-bank',
    });

    await db.update('accounts', {
      id: validAccountId,
      bank: bankId,
    });

    // Mock asyncStorage
    vi.spyOn(asyncStorage, 'multiGet').mockResolvedValue({
      'user-id': 'test-user-id',
      'user-key': 'test-user-key',
    });

    // Mock successful sync
    vi.mocked(bankSync.syncAccount).mockResolvedValue({
      added: [],
      updated: [],
    });

    // Execute
    const result = await app.handlers['simplefin-batch-sync']({
      ids: [validAccountId, noBankAccountId, noExternalIdAccountId],
    });

    // Verify: Only the valid account was synced
    expect(bankSync.syncAccount).toHaveBeenCalledTimes(1);
    expect(bankSync.syncAccount).toHaveBeenCalledWith(
      'test-user-id',
      'test-user-key',
      validAccountId,
      'ext-account-valid',
      'simplefin-bank',
    );

    // Result should only contain the valid account
    expect(result).toHaveLength(1);
    expect(result[0].accountId).toBe(validAccountId);
  });

  it('should handle empty account list', async () => {
    // Mock asyncStorage
    vi.spyOn(asyncStorage, 'multiGet').mockResolvedValue({
      'user-id': 'test-user-id',
      'user-key': 'test-user-key',
    });

    // Execute
    const result = await app.handlers['simplefin-batch-sync']({ ids: [] });

    // Verify
    expect(bankSync.syncAccount).not.toHaveBeenCalled();
    expect(result).toHaveLength(0);
  });

  it('should filter out closed and tombstoned accounts', async () => {
    // Setup: Create closed and tombstoned accounts
    const closedAccountId = await db.insertAccount({
      id: 'closed-account',
      name: 'Closed Account',
      account_id: 'ext-closed',
      account_sync_source: 'simpleFin',
      offbudget: 0,
      closed: 1,
    });

    const tombstonedAccountId = await db.insertAccount({
      id: 'tombstoned-account',
      name: 'Tombstoned Account',
      account_id: 'ext-tombstoned',
      account_sync_source: 'simpleFin',
      offbudget: 0,
      closed: 0,
      tombstone: 1,
    });

    // Create a bank
    const bankId = await db.insertWithUUID('banks', {
      id: 'test-bank-id',
      bank_id: 'simplefin-bank',
    });

    await db.update('accounts', {
      id: closedAccountId,
      bank: bankId,
    });

    await db.update('accounts', {
      id: tombstonedAccountId,
      bank: bankId,
    });

    // Mock asyncStorage
    vi.spyOn(asyncStorage, 'multiGet').mockResolvedValue({
      'user-id': 'test-user-id',
      'user-key': 'test-user-key',
    });

    // Execute
    const result = await app.handlers['simplefin-batch-sync']({
      ids: [closedAccountId, tombstonedAccountId],
    });

    // Verify: No accounts were synced
    expect(bankSync.syncAccount).not.toHaveBeenCalled();
    expect(result).toHaveLength(0);
  });
});