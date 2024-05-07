export interface NewPayeeEntity {
  id?: string;
  name: string;
  transfer_acct?: string;
  common?: boolean;
  tombstone?: boolean;
}

export interface PayeeEntity extends NewPayeeEntity {
  id: string;
}
