export type EnableBankingToken = {
  id: string;
  accounts: SyncServerEnableBankingAccount[];
};

export type EnableBankingInstitution = {
  id: string;
  name: string;
  logo: string;
  countries: string[];
  transaction_total_days: string;
  maximum_consent_validity: number;
};

export type EnableBankingBalance = {
  balanceAmount: EnableBankingAmount;
  balanceType: string;
  referenceDate: string;
};

export type EnableBankingAmount = {
  amount: string;
  currency: string;
};

export type EnableBankingTransaction = {
  transactionId: string;
  bookingDate: string;
  valueDate: string;
  transactionAmount: EnableBankingAmount;
  remittanceInformationUnstructured: string;
  creditorName?: string;
  debtorName?: string;
};

export type SyncServerEnableBankingAccount = {
  account_id: string;
  name: string;
  mask: string;
  institution?: string;
  iban?: string;
  orgId?: string;
  orgDomain?: string;
};
