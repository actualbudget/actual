import { describe, expect, it } from 'vitest';

import type { AccountEntity } from '@actual-app/core/types/models';

import { isAccountFailedSync, isAccountPendingSync } from './syncStatus';

function makeAccount(
  bank_sync_status: AccountEntity['bank_sync_status'],
): Pick<AccountEntity, 'bank_sync_status'> {
  return { bank_sync_status };
}

describe('syncStatus', () => {
  it('treats pending and sync-requested as pending', () => {
    expect(isAccountPendingSync(makeAccount('pending'))).toBe(true);
    expect(isAccountPendingSync(makeAccount('sync-requested'))).toBe(true);
    expect(isAccountPendingSync(makeAccount('ok'))).toBe(false);
    expect(isAccountPendingSync(makeAccount('attention-required'))).toBe(
      false,
    );
    expect(isAccountPendingSync(makeAccount('reauth-required'))).toBe(false);
    expect(isAccountPendingSync(makeAccount(null))).toBe(false);
  });

  it('treats attention-required and reauth-required as failed', () => {
    expect(isAccountFailedSync(makeAccount('attention-required'))).toBe(true);
    expect(isAccountFailedSync(makeAccount('reauth-required'))).toBe(true);
    expect(isAccountFailedSync(makeAccount('pending'))).toBe(false);
    expect(isAccountFailedSync(makeAccount('sync-requested'))).toBe(false);
    expect(isAccountFailedSync(makeAccount('ok'))).toBe(false);
    expect(isAccountFailedSync(makeAccount(null))).toBe(false);
  });
});
