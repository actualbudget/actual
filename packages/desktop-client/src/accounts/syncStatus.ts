import type { AccountEntity, BankSyncStatus } from '@actual-app/core/types/models';

function isBankSyncStatusPending(status: BankSyncStatus | null | undefined) {
  return status === 'pending' || status === 'sync-requested';
}

function isBankSyncStatusFailed(status: BankSyncStatus | null | undefined) {
  return status === 'attention-required' || status === 'reauth-required';
}

export function isAccountPendingSync(account: Pick<AccountEntity, 'bank_sync_status'>) {
  return isBankSyncStatusPending(account.bank_sync_status);
}

export function isAccountFailedSync(account: Pick<AccountEntity, 'bank_sync_status'>) {
  return isBankSyncStatusFailed(account.bank_sync_status);
}
