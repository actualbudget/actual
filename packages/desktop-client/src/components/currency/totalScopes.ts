import type { AccountEntity } from '@actual-app/core/types/models';

export type AccountTotalScope = 'all' | 'onbudget' | 'offbudget' | 'closed';

// The accounts each total binding adds up (see `spreadsheet/bindings`)
export function getAccountsInScope<T extends AccountEntity>(
  accounts: readonly T[],
  scope: AccountTotalScope,
): T[] {
  switch (scope) {
    case 'all':
      return accounts.filter(account => !account.closed);
    case 'onbudget':
      return accounts.filter(account => !account.closed && !account.offbudget);
    case 'offbudget':
      return accounts.filter(account => !account.closed && !!account.offbudget);
    case 'closed':
      return accounts.filter(account => !!account.closed);
    default:
      throw new Error(`Unknown account total scope: ${String(scope)}`);
  }
}
