import { AccountEntity } from './account';
import { BankSyncResponse } from './bank-sync';

export type SimpleFinOrganization = {
  name: string;
  domain: string;
};

export type SimpleFinAccount = {
  id: string;
  name: string;
  org: SimpleFinOrganization;
};

export interface SimpleFinBatchSyncResponse {
  [accountId: AccountEntity['account_id']]: BankSyncResponse;
}
