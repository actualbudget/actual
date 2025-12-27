import { type AccountEntity } from './account';
import { type PayeeLocationEntity } from './payee-location';

export type PayeeEntity = {
  id: string;
  name: string;
  transfer_acct?: AccountEntity['id'];
  favorite?: boolean;
  learn_categories?: boolean;
  tombstone?: boolean;
  location?: PayeeLocationEntity;
};
