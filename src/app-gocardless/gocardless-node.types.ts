type RequisitionStatus =
  | 'CR'
  | 'ID'
  | 'LN'
  | 'RJ'
  | 'ER'
  | 'SU'
  | 'EX'
  | 'GC'
  | 'UA'
  | 'GA'
  | 'SA';

export type Requisition = {
  /**
   * option to enable account selection view for the end user
   */
  account_selection: boolean;

  /**
   * array of account IDs retrieved within a scope of this requisition
   */
  accounts: string[];

  /**
   * EUA associated with this requisition
   */
  agreement: string;

  /**
   * The date & time at which the requisition was created.
   */
  created: string;

  /**
   * The unique ID of the requisition
   */
  id: string;

  /**
   * an Institution ID for this Requisition
   */
  institution_id: string;

  /**
   * link to initiate authorization with Institution
   */
  link: string;

  /**
   * redirect URL to your application after end-user authorization with ASPSP
   */
  redirect: string;

  /**
   * enable redirect back to the client after account list received
   */
  redirect_immediate: boolean;

  /**
   * additional ID to identify the end user
   */
  reference: string;

  /**
   * optional SSN field to verify ownership of the account
   */
  ssn: string;

  /**
   * status of this requisition
   */
  status: RequisitionStatus;

  /**
   * A two-letter country code (ISO 639-1)
   */
  user_language: string;
};

/**
 * Object representing GoCardless account details
 * Account details will be returned in Berlin Group PSD2 format.
 */
export type GoCardlessAccountDetails = {
  /**
   * Resource id of the account
   */
  resourceId?: string;

  /**
   * BBAN of the account. This data element is used for payment accounts which have no IBAN
   */
  bban?: string;

  /**
   * BIC associated to the account
   */
  bic?: string;

  /**
   * External Cash Account Type 1 Code from ISO 20022
   */
  cashAccountType?: string;

  /**
   * Currency of the account
   */
  currency: string;

  /**
   * Specifications that might be provided by the financial institution, including
   * - Characteristics of the account
   * - Characteristics of the relevant card
   */
  details?: string;

  /**
   * Name of the account as defined by the end user within online channels
   */
  displayName?: string;

  /**
   * IBAN of the account
   */
  iban?: string;

  /**
   * This data attribute is a field where a financial institution can name a cash account associated with pending card transactions
   */
  linkedAccounts?: string;

  /**
   * Alias to a payment account via a registered mobile phone number
   */
  msisdn?: string;

  /**
   * Name of the account, as assigned by the financial institution
   */
  name?: string;

  /**
   * Address of the legal account owner
   */
  ownerAddressUnstructured?: string[];

  /**
   * Name of the legal account owner. If there is more than one owner, then two names might be noted here. For a corporate account, the corporate name is used for this attribute.
   */
  ownerName?: string;

  /**
   * Product Name of the Bank for this account, proprietary definition
   */
  product?: string;

  /**
   * Account status. The value is one of the following:
   * - "enabled": account is available
   * - "deleted": account is terminated
   * - "blocked": account is blocked, e.g. for legal reasons
   *
   * If this field is not used, then the account is considered available according to the specification.
   */
  status?: 'enabled' | 'deleted' | 'blocked';

  /**
   * Specifies the usage of the account:
   * - PRIV: private personal account
   * - ORGA: professional account
   */
  usage?: 'PRIV' | 'ORGA';
};

/**
 * Representation of the GoCardless account metadata
 */
export type GoCardlessAccountMetadata = {
  /**
   * ID of the GoCardless account metadata
   */
  id: string;
  /**
   * Date when the GoCardless account metadata was created
   */
  created: string;
  /**
   * Date of the last access to the GoCardless account metadata
   */
  last_accessed: string;
  /**
   * IBAN of the GoCardless account metadata
   */
  iban: string;
  /**
   * ID of the institution associated with the GoCardless account metadata
   */
  institution_id: string;
  /**
   * Status of the GoCardless account
   * DISCOVERED: User has successfully authenticated and account is discovered
   * PROCESSING: Account is being processed by the Institution
   * ERROR: An error was encountered when processing account
   * EXPIRED: Access to account has expired as set in End User Agreement
   * READY: Account has been successfully processed
   * SUSPENDED: Account has been suspended (more than 10 consecutive failed attempts to access the account)
   */
  status:
    | 'DISCOVERED'
    | 'PROCESSING'
    | 'ERROR'
    | 'EXPIRED'
    | 'READY'
    | 'SUSPENDED';
  /**
   * Name of the owner of the GoCardless account metadata
   */
  owner_name: string;
};

/**
 * Information about the Institution
 */
export type Institution = {
  /**
   * The id of the institution, for example "N26_NTSBDEB1"
   */
  id: string;

  /**
   * The name of the institution, for example "N26 Bank"
   */
  name: string;

  /**
   * The BIC of the institution, for example "NTSBDEB1"
   */
  bic: string;

  /**
   * The total number of days of transactions available, for example "90"
   */
  transaction_total_days: string;

  /**
   * The countries where the institution operates, for example `["PL"]`
   */
  countries: string[];

  /**
   * The logo URL of the institution, for example "https://cdn.nordigen.com/ais/N26_SANDBOX_NTSBDEB1.png"
   */
  logo: string;

  /**
   * The total number of days that a requisition stays valid before requiring
   * renewal
   */
  max_access_valid_for_days: string;

  supported_payments?: object;
  supported_features?: string[];
};

/**
 * An object containing information about a balance
 */
export type Balance = {
  /**
   * An object containing the balance amount and currency
   */
  balanceAmount: Amount;
  /**
   * The type of balance
   */
  balanceType:
    | 'closingBooked'
    | 'expected'
    | 'forwardAvailable'
    | 'interimAvailable'
    | 'interimBooked'
    | 'nonInvoiced'
    | 'openingBooked';
  /**
   * A flag indicating if the credit limit of the corresponding account is included in the calculation of the balance (if applicable)
   */
  creditLimitIncluded?: boolean;
  /**
   * The date and time of the last change to the balance
   */
  lastChangeDateTime?: string;
  /**
   * The reference of the last committed transaction to support the TPP in identifying whether all end users transactions are already known
   */
  lastCommittedTransaction?: string;
  /**
   * The date of the balance
   */
  referenceDate?: string;
};

/**
 * An object representing the amount of a transaction
 */
export type Amount = {
  /**
   * The amount of the transaction
   */
  amount: string;

  /**
   * The currency of the transaction
   */
  currency: string;
};

/**
 * An object representing a financial transaction
 */
export type Transaction = {
  /**
   * Might be used by the financial institution to transport additional transaction-related information.
   */
  additionalInformation?: string;

  /**
   * Is used if and only if the bookingStatus entry equals "information".
   */
  bookingStatus?: string;

  /**
   * The balance after this transaction. Recommended balance type is interimBooked.
   */
  balanceAfterTransaction?: Pick<Balance, 'balanceType' | 'balanceAmount'>;

  /**
   * Bank transaction code as used by the financial institution and using the sub elements of this structured code defined by ISO20022. For standing order reports the following codes are applicable:
   * "PMNT-ICDT-STDO" for credit transfers,
   * "PMNT-IRCT-STDO" for instant credit transfers,
   * "PMNT-ICDT-XBST" for cross-border credit transfers,
   * "PMNT-IRCT-XBST" for cross-border real-time credit transfers,
   * "PMNT-MCOP-OTHR" for specific standing orders which have a dynamic amount to move left funds e.g. on month end to a saving account
   */
  bankTransactionCode?: string;

  /**
   * The date when an entry is posted to an account on the financial institution's books.
   */
  bookingDate?: string;

  /**
   * The date and time when an entry is posted to an account on the financial institution's books.
   */
  bookingDateTime?: string;

  /**
   * Identification of a cheque
   */
  checkId?: string;

  /**
   * Account reference, conditional
   */
  creditorAccount?:
    | string
    | {
        iban?: string;
      };

  /**
   * BICFI
   */
  creditorAgent?: string;

  /**
   * Identification of creditors, e.g. a SEPA Creditor ID
   */
  creditorId?: string;

  /**
   * Name of the creditor if a "debited" transaction
   */
  creditorName?: string;

  /**
   * Array of report exchange rates
   */
  currencyExchange?: string[];

  /**
   * Account reference, conditional
   */
  debtorAccount?: {
    iban: string;
  };

  /**
   * BICFI
   */
  debtorAgent?: string;

  /**
   * Name of the debtor if a "credited" transaction
   */
  debtorName?: string;

  /**
   * Unique end-to-end ID
   */
  endToEndId?: string;

  /**
   * The identification of the transaction as used for reference given by the financial institution.
   */
  entryReference?: string;

  /**
   * Transaction identifier given by GoCardless
   */
  internalTransactionId?: string;

  /**
   * Identification of Mandates, e.g. a SEPA Mandate ID
   */
  mandateId?: string;

  /**
   * Merchant category code as defined by card issuer
   */
  merchantCategoryCode?: string;

  /**
   * Proprietary bank transaction code as used within a community or within an financial institution
   */
  proprietaryBankTransactionCode?: string;

  /**
   * Conditional
   */
  purposeCode?: string;

  /**
   * Reference as contained in the structured remittance reference structure
   */
  remittanceInformationStructured?: string;

  /**
   * Reference as contained in the structured remittance array reference structure
   */
  remittanceInformationStructuredArray?: string[];

  /**
   * Reference as contained in the unstructured remittance reference structure
   */
  remittanceInformationUnstructured?: string;

  /**
   * Reference as contained in the unstructured remittance array reference structure
   */
  remittanceInformationUnstructuredArray?: string[];

  /**
   * The amount of the transaction as billed to the account
   */
  transactionAmount: Amount;

  /**
   * Unique transaction identifier given by financial institution
   */
  transactionId?: string;

  /**
   *
   */
  ultimateCreditor?: string;

  /**
   *
   */
  ultimateDebtor?: string;

  /**
   * The Date at which assets become available to the account owner in case of a credit
   */
  valueDate?: string;

  /**
   * The date and time at which assets become available to the account owner in case of a credit
   */
  valueDateTime?: string;
};

export type Transactions = {
  booked: Transaction[];
  pending: Transaction[];
};
