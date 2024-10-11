import { AccountEntity } from './account';

export interface PayeeEntity {
  id: string;
  name: string;
  transfer_acct?: AccountEntity['id'];
  favorite?: 1 | 0;
  tombstone?: boolean;
}
