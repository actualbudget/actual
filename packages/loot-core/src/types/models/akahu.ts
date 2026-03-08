export type AkahuAccount = {
  _id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  type: string;
  balance: {
    current: number;
    available?: number;
    currency: string;
  };
  connection: {
    _id: string;
    name: string;
  };
  formatted_account?: string;
};

export type SyncServerAkahuAccount = {
  account_id: string;
  name: string;
  institution: string;
  connectionId: string;
  balance: number;
};
