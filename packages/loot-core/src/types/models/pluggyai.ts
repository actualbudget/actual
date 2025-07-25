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
  balance: number;
  account_id: string;
  institution?: string;
  orgDomain?: string | null;
  orgId?: string;
  name: string;
};
