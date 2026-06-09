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
