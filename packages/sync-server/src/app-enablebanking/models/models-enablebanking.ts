export type Access = {
  accounts: AccountIdentification[];
  balances: boolean;
  transactions: boolean;
  valid_until: string;
};

export type Account = {
  account_id: string;
  name: string;
  institution: string;
  balance: number;
};

export type AccountIdentification = {
  iban?: string;
  other?: GenericIdentification;
};

export type AccountResource = {
  account_id?: AccountIdentification;
  all_account_ids?: GenericIdentification[];
  account_servicer?: FinancialInstitutionIdentification;
  name?: string;
  details?: string;
  usage?: Usage;
  cash_account_type: CashAccountType;
  product?: string;
  currency: string;
  psu_status?: string;
  legal_age?: boolean;
  postal_address?: PostalAddress;
  uid?: string;
  identification_hash: string;
  identification_hashes: string[];
};

export type AdressType =
  | 'Business'
  | 'Correspondence'
  | 'DeliveryTo'
  | 'MailTo'
  | 'POBox'
  | 'Postal'
  | 'Residential'
  | 'Statement';

export type ASPSP = Pick<ASPSPData, 'name' | 'country'>;

export type ASPSPData = {
  name: string;
  country: string;
  logo: string;
  psu_types: PSUType[];
  auth_methods: AuthMethod[];
  maximum_consent_validity: number;
  sandbox?: SandboxInfo;
  beta: boolean;
  bic?: string;
  required_psu_headers?: string[];
  payments?: ResponsePaymentType[];
  group?: ASPSGroup;
};

export type ASPSGroup = {
  group: string;
  logo: string;
};

export type AmountType = {
  currency: string;
  amount: string;
};

export type AuthenticationApproach = 'DECOUPLED' | 'EMBEDDED' | 'REDIRECT';
export type AuthenticationSessionResponse = {
  session_id: string;
  account_id: string;
};

export type AuthenticationStartResponse = {
  redirect_url: string;
  state: string;
};
export type AuthMethod = {
  name?: string;
  title?: string;
  psu_type: PSUType;
  credentials?: Credential[];
  approach: AuthenticationApproach;
  hidden_method: boolean;
};

export type BalanceResource = {
  name: string;
  balance_amount: AmountType;
  balance_type: BalanceStatus;
  last_change_date_time?: string;
  reference_date?: string;
  last_committed_transaction?: string;
};

export type BalanceStatus =
  | 'CLAV'
  | 'CLBD'
  | 'FWAV'
  | 'INFO'
  | 'ITAV'
  | 'ITBD'
  | 'OPAV'
  | 'OPBD'
  | 'OTHR'
  | 'PRCD'
  | 'VALU'
  | 'XPCD';


export type BankTransactionCode = {
    description?:string;
    code?:string;
    sub_code?:string;
}
export type CashAccountType =
  | 'CACC'
  | 'CARD'
  | 'CASH'
  | 'LOAN'
  | 'OTHR'
  | 'SVGS';

export type ClearingSystemMemberIdentification = {
  clearing_system_id?: false;
  member_id?: false;
};

export type ContactDetails = {
    email?:string;
    phone_number?:string;
}

export type Credential = {
  name: string;
  title: string;
  required: boolean;
  description?: string;
  template?: string;
};

export type CreditDebitIndicator = "CRDT" | "DBIT";
export type EnableBankingToken = {
  bank_id: string;
  session_id: string;
  accounts: Account[];
};

export type Environment = 'PRODUCTION' | 'SANDBOX';

export type ErrorCode =
  | 'ACCESS_DENIED' // Access to this resource is denied. Check services available for your application.
  | 'ACCOUNT_DOES_NOT_EXIST' // No account found matching provided id
  | 'ALREADY_AUTHORIZED' // Session is already authorized
  | 'ASPSP_ACCOUNT_NOT_ACCESSIBLE' // The PSU does not have access to the requested account or it doesn't exist
  | 'ASPSP_ERROR' // Error interacting with ASPSP
  | 'ASPSP_PAYMENT_NOT_ACCESSIBLE' // Payment can not be requested from the ASPSP
  | 'ASPSP_PSU_ACTION_REQUIRED' // PSU action is required to proceed
  | 'ASPSP_RATE_LIMIT_EXCEEDED' // ASPSP Rate limit exceeded
  | 'ASPSP_TIMEOUT' // Timeout interacting with ASPSP
  | 'AUTHORIZATION_NOT_PROVIDED' // Authorization header is not provided
  | 'CLOSED_SESSION' // Session is closed
  | 'DATE_FROM_IN_FUTURE' // date_from can not be in the future
  | 'DATE_TO_WITHOUT_DATE_FROM' // date_from must be provided if date_to provided
  | 'EXPIRED_AUTHORIZATION_CODE' // Authorization code is expired
  | 'EXPIRED_SESSION' // Session is expired
  | 'INVALID_ACCOUNT_ID' // Either iban or other account identification is required
  | 'INVALID_HOST' // Invalid host
  | 'INVALID_PAYMENT' // Invalid or expired payment provided
  | 'NO_ACCOUNTS_ADDED' // No allowed accounts added to the application
  | 'PAYMENT_LIMIT_EXCEEDED' // The amount value or the number of transactions exceeds the limit
  | 'PAYMENT_NOT_FOUND' // Payment not found
  | 'PSU_HEADER_NOT_PROVIDED' // Required PSU header not provided
  | 'REDIRECT_URI_NOT_ALLOWED' // Redirect URI not allowed
  | 'REVOKED_SESSION' // Session is revoked
  | 'SESSION_DOES_NOT_EXIST' // No session found matching provided id
  | 'TRANSACTION_DOES_NOT_EXIST' // No transaction found matching provided id
  | 'UNAUTHORIZED_ACCESS' // Unauthorized access
  | 'UNAUTHORIZED_IP' // Used IP address is not authorized to access the resource
  | 'UNTRUSTED_PAYMENT_PARTY' // Either creditor or debtor account is not trusted
  | 'WEBHOOK_URI_NOT_ALLOWED' // Webhook URI not allowed
  | 'WRONG_ASPSP_PROVIDED' // Wrong ASPSP name provided
  | 'WRONG_AUTHORIZATION_CODE' // Wrong authorization code provided
  | 'WRONG_CONTINUATION_KEY' // Wrong continuation key provided
  | 'WRONG_CREDENTIALS_PROVIDED' // Wrong credentials provided
  | 'WRONG_DATE_INTERVAL' // date_from should be less than or equal date_to
  | 'WRONG_REQUEST_PARAMETERS' // Wrong request parameters provided
  | 'WRONG_SESSION_STATUS' // Wrong session status
  | 'WRONG_TRANSACTIONS_PERIOD'; // Wrong transactions period requested


export type ErrorResponse = {
  message: string;
  code: number;
  detail: string;
  error: ErrorCode;
};

export type ExchangeRate = {
    unit_currency: {CurrencyCode:string};
    exchange_rate:string;
    rate_type:RateType;
    contract_identification:string;
    instructed_amount:AmountType;
}

export type FinancialInstitutionIdentification = {
  bic_fi?: string;
  clearing_system_member_id?: ClearingSystemMemberIdentification;
  name: string;
};

export type GenericIdentification = {
  identification: string;
  scheme_name: SchemeName;
  issuer: string;
};

export type GetApplicationResponse = {
  name: string;
  description?: string;
  kid: string;
  environment: Environment;
  redirect_urls: string[];
  active: boolean;
  countries: string[];
  services: Service[];
};
export type GetAspspsResponse = { aspsps: ASPSPData[] };

export type GetSessionResponse = {
  status: SessionStatus;
  accounts: string[];
  account_data: SessionAccount[];
  aspsp: ASPSP;
  psu_type: PSUType;
  psu_id_hash: string;
  access: Access;
  created?: string;
  authorized?: string;
  closed?: string;
};

export type HalBalances = {
  balances: BalanceResource[];
};

export type HalTransactions = {
    transactions: Transaction[];
    continuation_key?:string;
}

export type PartyIdentification ={
    name?:string;
    postal_address?:PostalAddress;
    organisation_id?:GenericIdentification;
    private_id?:GenericIdentification;
    contact_details?:ContactDetails;
}

export type PostalAddress = {
  adress_type?: AdressType;
  department?: string;
  sub_department?: string;
  street_name?: string;
  building_number?: string;
  post_code?: string;
  town_name?: string;
  country_sub_division?: string;
  country?: string;
  address_line?: string[];
};

export type PSUType = 'business' | 'personal';

export type RateType = "AGRD" | "SALE" | "SPOT";

export type ResponsePaymentType = {
  max_transactions?: number;
  //todo
  // payment_type: PaymentType;
  // max_transactions?: number;
  // currencies?: string[];
  // debtor_account_required?: boolean;
  // debtor_account_schemas: SchemeName[];
  // creditor_account_schemas: SchemeName[];
  // priority_codes: PriorityCode[];
  // charge_bearer_values: ChargeBearerCode[];
  // creditor_country_required: boolean;
  // creditor_name_required: boolean;
  // creditor_postal
};

export type ReferenceNumberScheme = "BERF" | "FIRF" | "INTL" |
    "NORF" | "SDDM" | "SEBG";
export type SandboxInfo = { users?: SandboxUser[] };

export type SandboxUser = {
  name?: string;
  password?: string;
  otp?: string;
};

export type SchemeName =
  | 'ARNU'
  | 'BANK'
  | 'BBAN'
  | 'BGNR'
  | 'CCPT'
  | 'CHID'
  | 'COID'
  | 'CPAN'
  | 'CUSI'
  | 'CUST'
  | 'DRLC'
  | 'DUNS'
  | 'EMPL'
  | 'GS1G'
  | 'IBAN'
  | 'MIBN'
  | 'NIDN'
  | 'OAUT'
  | 'OTHC'
  | 'OTHI'
  | 'PGNR'
  | 'SOSE'
  | 'SREN'
  | 'SRET'
  | 'TXID';

export type Service = 'AIS' | 'PIS';

export type SessionAccount = {
  uid: string;
  identification_hash: string;
  identification_hashes: string[];
};

export type SessionStatus =
  | 'AUTHORIZED'
  | 'CANCELLED'
  | 'CLOSED'
  | 'EXPIRED'
  | 'INVALID'
  | 'PENDING_AUTHORIZATION'
  | 'RETURNED_FROM_BANK'
  | 'REVOKED';

export type StartAuthorizationResponse = {
  url: string;
  authorization_id: string;
  psu_id_hash: string;
};

export type Transaction = {
    entry_reference?:string;
    merchant_category_code?:string;
    transaction_amount:AmountType;
    creditor?:PartyIdentification;
    creditor_account?:AccountIdentification;
    creditor_agent?:FinancialInstitutionIdentification;
    debtor?:PartyIdentification;
    debtor_account?:AccountIdentification;
    debtor_agent?:FinancialInstitutionIdentification;
    bank_transaction_code?:BankTransactionCode;
    credit_debit_indicator:CreditDebitIndicator;
    status:TransactionStatus;
    booking_date?: string;
    value_date?: string;
    transaction_date?: string;
    balance_after_transaction?: AmountType;
    reference_number?:string;
    reference_number_schema?:ReferenceNumberScheme;
    remittance_information?:string[];
    debtor_account_additional_identification?:GenericIdentification[];
    creditor_account_additional_identification?:GenericIdentification[];
    exchange_rate?:ExchangeRate;
    note?:string;
    transaction_id?:string;
}

export type TransactionStatus = "BOOK" | "CNCL" | "HOLD" |
    "OTHR" | "PNDG" | "RJCT" | "SCHD";

export type Usage = 'ORGA' | 'PRIV';
