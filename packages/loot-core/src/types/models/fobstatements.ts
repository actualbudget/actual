export type FobStatementsAccountCategory = 'bank' | 'credit_card';

export type SyncServerFobStatementsAccount = {
  balance: number;
  account_id: string;
  name: string;
  category?: FobStatementsAccountCategory;
  currency?: string;
  institution?: string;
  orgDomain?: string | null;
  orgId?: string;
};
