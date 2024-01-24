export type SimpleFinOrganization = {
  name: string;
  domain: string;
};

export type SimpleFinAccount = {
  id: string;
  name: string;
  org: SimpleFinOrganization;
};
