export type PluggyAiOrganization = {
  name: string;
  domain: string;
};

export type PluggyAiAccount = {
  id: string;
  name: string;
  org: PluggyAiOrganization;
};
