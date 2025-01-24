import { AccountEntity } from './account';

export interface PayeeEntity {
  id: string;
  name: string;
  transfer_acct?: AccountEntity['id'];
  favorite?: boolean | 1 | 0;
  learn_categories?: boolean | 1 | 0;
  tombstone?: boolean | 1 | 0;
}
