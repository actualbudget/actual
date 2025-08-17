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

export type Credential = {
  name: string;
  title: string;
  required: boolean;
  description?: string;
  template?: string;
};
export type EnableBankingToken = {
  bank_id: string;
  session_id: string;
  accounts: Account[];
};

export type Environment = 'PRODUCTION' | 'SANDBOX';

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

export type Usage = 'ORGA' | 'PRIV';
