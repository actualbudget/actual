// Enable Banking API response types (from https://enablebanking.com/docs/api/reference/)

export type EnableBankingAccountId = {
  iban?: string;
};

export type EnableBankingAccountServicer = {
  bic_fi?: string;
  name?: string;
};

export type EnableBankingAspsp = {
  name: string;
  country: string;
  logo?: string;
  psu_types?: string[];
  beta?: boolean;
  maximum_consent_validity?: number;
};

export type EnableBankingSessionAccount = {
  account_id: EnableBankingAccountId;
  account_servicer?: EnableBankingAccountServicer;
  name?: string;
  currency?: string;
  uid: string;
  identification_hash?: string;
};

export type EnableBankingSession = {
  session_id: string;
  accounts: EnableBankingSessionAccount[];
  aspsp: { name: string; country: string };
  access?: { valid_until: string };
};

export type EnableBankingRawTransaction = {
  entry_reference?: string;
  transaction_id?: string;
  transaction_amount: { currency: string; amount: string };
  creditor?: { name?: string };
  debtor?: { name?: string };
  creditor_account?: { iban?: string };
  debtor_account?: { iban?: string };
  credit_debit_indicator?: 'CRDT' | 'DBIT';
  status: 'BOOK' | 'PDNG';
  booking_date?: string;
  value_date?: string;
  transaction_date?: string;
  remittance_information?: string[];
  balance_after_transaction?: { currency: string; amount: string };
};

export type EnableBankingRawBalance = {
  balance_amount: { currency: string; amount: string };
  balance_type?: string;
  reference_date?: string;
};

// Normalized type for client-side account selection (matches SimpleFIN/PluggyAI pattern)
export type SyncServerEnableBankingAccount = {
  account_id: string;
  name: string;
  institution: string;
  balance: number;
};
