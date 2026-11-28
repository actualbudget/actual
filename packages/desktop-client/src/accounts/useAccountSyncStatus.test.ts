import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { useSelector } from '#redux';

import { useAccountSyncStatus } from './useAccountSyncStatus';

vi.mock('#redux', () => ({
  useSelector: vi.fn(),
}));

function mockSyncingIds(ids: string[]) {
  (useSelector as unknown as Mock).mockImplementation(selector =>
    selector({ account: { accountsSyncing: ids } }),
  );
}

describe('useAccountSyncStatus', () => {
  it('returns manual for accounts with no bank connection', () => {
    mockSyncingIds([]);
    const { result } = renderHook(() => useAccountSyncStatus());
    expect(
      result.current({ id: 'a1', bank: null, bank_sync_status: null }),
    ).toBe('manual');
  });

  it('returns syncing when the account is in the live in-flight set', () => {
    mockSyncingIds(['a1']);
    const { result } = renderHook(() => useAccountSyncStatus());
    expect(
      result.current({ id: 'a1', bank: 'chase', bank_sync_status: 'ok' }),
    ).toBe('syncing');
  });

  it('returns syncing for a queued-but-not-yet-live status', () => {
    mockSyncingIds([]);
    const { result } = renderHook(() => useAccountSyncStatus());
    expect(
      result.current({
        id: 'a1',
        bank: 'chase',
        bank_sync_status: 'sync-requested',
      }),
    ).toBe('syncing');
  });

  it('returns error for a durable non-ok status', () => {
    mockSyncingIds([]);
    const { result } = renderHook(() => useAccountSyncStatus());
    expect(
      result.current({
        id: 'a1',
        bank: 'chase',
        bank_sync_status: 'reauth-required',
      }),
    ).toBe('error');
  });

  it('returns synced for a connected, idle, ok account', () => {
    mockSyncingIds([]);
    const { result } = renderHook(() => useAccountSyncStatus());
    expect(
      result.current({ id: 'a1', bank: 'chase', bank_sync_status: 'ok' }),
    ).toBe('synced');
    expect(
      result.current({ id: 'a1', bank: 'chase', bank_sync_status: null }),
    ).toBe('synced');
  });
});
