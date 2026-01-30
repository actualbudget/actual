import type { AccountEntity } from './account';

export type PayeeEntity = {
  id: string;
  name: string;
  transfer_acct?: AccountEntity['id'];
  favorite?: boolean;
  learn_categories?: boolean;
  tombstone?: boolean;
};
