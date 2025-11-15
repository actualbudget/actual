import { AccountEntity } from './account';
import { PayeeLocationEntity } from './payee-location';

export interface PayeeEntity {
  id: string;
  name: string;
  transfer_acct?: AccountEntity['id'];
  favorite?: boolean;
  learn_categories?: boolean;
  tombstone?: boolean;
  location?: PayeeLocationEntity;
}
