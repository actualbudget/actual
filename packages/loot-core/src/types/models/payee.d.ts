import { AccountEntity } from './account';

export interface NewPayeeEntity {
  id?: string;
  name: string;
  transfer_acct?: AccountEntity['id'];
  favorite?: boolean;
  tombstone?: boolean;
}

export interface PayeeEntity extends NewPayeeEntity {
  id: string;
}
