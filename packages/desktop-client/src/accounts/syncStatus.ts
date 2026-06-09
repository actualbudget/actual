import type { AccountEntity } from '@actual-app/core/types/models';

export function isAccountFailedSync(
  account: Pick<AccountEntity, 'bank_sync_status'>,
) {
  const status = account.bank_sync_status;
  return (
    status != null &&
    status !== 'ok' &&
    status !== 'pending' &&
    status !== 'sync-requested'
  );
}

export function getFailedSyncError(
  account: Pick<AccountEntity, 'bank_sync_status' | 'account_sync_source'>,
): { type: string; code: string } {
  switch (account.bank_sync_status) {
    case 'reauth-required':
      if (account.account_sync_source === 'simpleFin') {
        return { type: 'INVALID_ACCESS_TOKEN', code: 'INVALID_ACCESS_TOKEN' };
      }
      return { type: 'ITEM_ERROR', code: 'ITEM_LOGIN_REQUIRED' };
    case 'attention-required':
      return {
        type: 'ACCOUNT_NEEDS_ATTENTION',
        code: 'ACCOUNT_NEEDS_ATTENTION',
      };
    case 'rate-limit-exceeded':
      return { type: 'RATE_LIMIT_EXCEEDED', code: 'RATE_LIMIT_EXCEEDED' };
    case 'timed-out':
      return { type: 'TIMED_OUT', code: 'TIMED_OUT' };
    case 'account-missing':
      return { type: 'ACCOUNT_MISSING', code: 'ACCOUNT_MISSING' };
    default:
      return { type: 'SYNC_ERROR', code: 'SYNC_ERROR' };
  }
}
