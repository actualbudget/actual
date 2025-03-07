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
  account_id: string;
  institution?: string;
  orgDomain?: string;
  orgId?: string;
  name: string;
};
