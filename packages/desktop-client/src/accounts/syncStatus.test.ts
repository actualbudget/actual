import type { AccountEntity } from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import { getFailedSyncError, isAccountFailedSync } from './syncStatus';

function makeAccount(
  bank_sync_status: AccountEntity['bank_sync_status'],
  account_sync_source: AccountEntity['account_sync_source'] = null,
): Pick<AccountEntity, 'bank_sync_status' | 'account_sync_source'> {
  return { bank_sync_status, account_sync_source };
}

describe('syncStatus', () => {
  it('treats any durable non-ok status as failed', () => {
    expect(isAccountFailedSync(makeAccount('failed'))).toBe(true);
    expect(isAccountFailedSync(makeAccount('attention-required'))).toBe(true);
    expect(isAccountFailedSync(makeAccount('reauth-required'))).toBe(true);
    expect(isAccountFailedSync(makeAccount('rate-limit-exceeded'))).toBe(true);
    expect(isAccountFailedSync(makeAccount('timed-out'))).toBe(true);
    expect(isAccountFailedSync(makeAccount('account-missing'))).toBe(true);
    expect(isAccountFailedSync(makeAccount('pending'))).toBe(false);
    expect(isAccountFailedSync(makeAccount('sync-requested'))).toBe(false);
    expect(isAccountFailedSync(makeAccount('ok'))).toBe(false);
    expect(isAccountFailedSync(makeAccount(null))).toBe(false);
  });

  it('maps persisted failure statuses to error type/code pairs', () => {
    expect(getFailedSyncError(makeAccount('reauth-required'))).toEqual({
      type: 'ITEM_ERROR',
      code: 'ITEM_LOGIN_REQUIRED',
    });
    expect(
      getFailedSyncError(makeAccount('reauth-required', 'simpleFin')),
    ).toEqual({
      type: 'INVALID_ACCESS_TOKEN',
      code: 'INVALID_ACCESS_TOKEN',
    });
    expect(getFailedSyncError(makeAccount('attention-required'))).toEqual({
      type: 'ACCOUNT_NEEDS_ATTENTION',
      code: 'ACCOUNT_NEEDS_ATTENTION',
    });
    expect(getFailedSyncError(makeAccount('rate-limit-exceeded'))).toEqual({
      type: 'RATE_LIMIT_EXCEEDED',
      code: 'RATE_LIMIT_EXCEEDED',
    });
    expect(getFailedSyncError(makeAccount('timed-out'))).toEqual({
      type: 'TIMED_OUT',
      code: 'TIMED_OUT',
    });
    expect(getFailedSyncError(makeAccount('account-missing'))).toEqual({
      type: 'ACCOUNT_MISSING',
      code: 'ACCOUNT_MISSING',
    });
    expect(getFailedSyncError(makeAccount('failed'))).toEqual({
      type: 'SYNC_ERROR',
      code: 'SYNC_ERROR',
    });
  });
});
