import type { AccountEntity } from '@actual-app/core/types/models';
import { describe, expect, it } from 'vitest';

import { isAccountFailedSync } from './syncStatus';

function makeAccount(
  bank_sync_status: AccountEntity['bank_sync_status'],
): Pick<AccountEntity, 'bank_sync_status'> {
  return { bank_sync_status };
}

describe('syncStatus', () => {
  it('treats failed, attention-required and reauth-required as failed', () => {
    expect(isAccountFailedSync(makeAccount('failed'))).toBe(true);
    expect(isAccountFailedSync(makeAccount('attention-required'))).toBe(true);
    expect(isAccountFailedSync(makeAccount('reauth-required'))).toBe(true);
    expect(isAccountFailedSync(makeAccount('pending'))).toBe(false);
    expect(isAccountFailedSync(makeAccount('sync-requested'))).toBe(false);
    expect(isAccountFailedSync(makeAccount('ok'))).toBe(false);
    expect(isAccountFailedSync(makeAccount(null))).toBe(false);
  });
});
