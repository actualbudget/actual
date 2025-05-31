import { AccountEntity } from './account';
import { BankSyncResponse } from './bank-sync';

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

export interface SimpleFinBatchSyncResponse {
  [accountId: NonNullable<AccountEntity['account_id']>]: BankSyncResponse;
}

export type SyncServerSimpleFinAccount = {
  balance: number;
  account_id: string;
  institution?: string;
  orgDomain?: string;
  orgId?: string;
  name: string;
};
