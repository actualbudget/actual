export type SyncServerAkahuAccount = {
  /** ISO 4217 currency of the provider account, or null when unknown. */
  currency?: string | null;
  balance: number;
  account_id: string;
  institution?: string;
  orgDomain?: string | null;
  orgId?: string;
  name: string;
};
