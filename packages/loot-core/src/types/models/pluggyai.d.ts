import { AccountEntity } from './account';
import { BankSyncResponse } from './bank-sync';

export type PluggyAiOrganization = {
  name: string;
  domain: string;
};

export type PluggyAiAccount = {
  id: string;
  name: string;
  org: PluggyAiOrganization;
};

export interface PluggyAiBatchSyncResponse {
  [accountId: AccountEntity['account_id']]: BankSyncResponse;
}
