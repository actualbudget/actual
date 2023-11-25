export type GoCardlessToken = {
  id: string;
  accounts: unknown[];
};

export type GoCardlessInstitution = {
  id: string;
  name: string;
  bic?: string;
  transaction_total_days?: string;
  countries: string[];
  logo: string;
  identification_codes: string[];
};
