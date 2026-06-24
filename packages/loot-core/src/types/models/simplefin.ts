import type { AccountEntity } from './account';
import type { BankSyncResponse } from './bank-sync';

export const SIMPLEFIN_RATE_LIMITED = 'SIMPLEFIN_RATE_LIMITED' as const;

export type SimpleFinErrorResponse = {
  error_type?: string;
  error_code?: string;
  status?: string;
  reason?: string;
  error?: string;
};

export function isSimpleFinRateLimited(
  response: SimpleFinErrorResponse | null | undefined,
): boolean {
  if (!response) {
    return false;
  }

  return (
    response.error_type === SIMPLEFIN_RATE_LIMITED ||
    response.error_code === SIMPLEFIN_RATE_LIMITED ||
    response.error_type === 'RATE_LIMIT'
  );
}

export type SimpleFinOrganization = {
  id: string;
  name: string;
  domain: string;
};

export type SimpleFinAccount = {
  id: string;
  name: string;
  balance: number;
  org: SimpleFinOrganization;
};

export type SimpleFinBatchSyncResponse = {
  [accountId: NonNullable<AccountEntity['account_id']>]: BankSyncResponse;
};

export type SyncServerSimpleFinAccount = {
  balance: number;
  account_id: string;
  institution?: string;
  orgDomain?: string;
  orgId?: string;
  name: string;
};
