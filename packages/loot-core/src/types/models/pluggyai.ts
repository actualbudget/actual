export type PluggyAiOrganization = {
  name: string;
  domain: string;
};

export type PluggyAiAccount = {
  id: string;
  name: string;
  org: PluggyAiOrganization;
};

export type SyncServerPluggyAiAccount = {
  /** ISO 4217 currency of the provider account, or null when unknown. */
  currency?: string | null;
  balance: number;
  account_id: string;
  institution?: string;
  orgDomain?: string | null;
  orgId?: string;
  name: string;
};
