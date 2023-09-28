import type { AccountEntity } from './account';

export interface PayeeEntity {
  id?: string;
  name: string;
  transfer_acct?: AccountEntity;
  tombstone?: boolean;
}
