import { AccountEntity } from './account';

export interface PayeeEntity {
  id: string;
  name: string;
  transfer_acct?: AccountEntity['id'];
  favorite?: boolean;
  learn_categories?: boolean;
  tombstone?: boolean;
}
