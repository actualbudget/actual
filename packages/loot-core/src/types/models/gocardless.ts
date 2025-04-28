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

export type GoCardlessBalance = {
  balanceAmount: GoCardlessAmount;
  balanceType:
    | 'closingBooked'
    | 'expected'
    | 'forwardAvailable'
    | 'interimAvailable'
    | 'interimBooked'
    | 'nonInvoiced'
    | 'openingBooked';
  creditLimitIncluded?: boolean;
  lastChangeDateTime?: string;
  lastCommittedTransaction?: string;
  referenceDate?: string;
};

export type GoCardlessAmount = {
  amount: string;
  currency: string;
};

export type GoCardlessTransaction = {
  additionalInformation?: string;
  bookingStatus?: string;
  balanceAfterTransaction?: Pick<
    GoCardlessBalance,
    'balanceType' | 'balanceAmount'
  >;
  bankTransactionCode?: string;
  bookingDate?: string;
  bookingDateTime?: string;
  checkId?: string;
  creditorAccount?: string;
  creditorAgent?: string;
  creditorId?: string;
  creditorName?: string;
  currencyExchange?: string[];
  debtorAccount?: {
    iban: string;
  };
  debtorAgent?: string;
  debtorName?: string;
  endToEndId?: string;
  entryReference?: string;
  internalTransactionId?: string;
  mandateId?: string;
  merchantCategoryCode?: string;
  proprietaryBankTransactionCode?: string;
  purposeCode?: string;
  remittanceInformationStructured?: string;
  remittanceInformationStructuredArray?: string[];
  remittanceInformationUnstructured?: string;
  remittanceInformationUnstructuredArray?: string[];
  transactionAmount: GoCardlessAmount;
  transactionId?: string;
  ultimateCreditor?: string;
  ultimateDebtor?: string;
  valueDate?: string;
  valueDateTime?: string;
};

export type SyncServerGoCardlessAccount = {
  institution: string;
  account_id: string;
  mask: string;
  name: string;
  official_name: string;
};
