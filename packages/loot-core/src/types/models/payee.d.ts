export interface NewPayeeEntity {
  id?: string;
  name: string;
  transfer_acct?: string;
  favorite?: boolean;
  tombstone?: boolean;
  display_name?: string;
}

export interface PayeeEntity extends NewPayeeEntity {
  id: string;
}
