export type EnableBankingEndpoints = {
  '/configure': Endpoint<ConfigureBody, void>;
  '/status': Endpoint<undefined, EnableBankingStatusResponse>;
  '/countries': Endpoint<undefined, string[]>;
  '/get_aspsps': Endpoint<{ country?: string }, EnableBankingBank[]>;
  '/start_auth': Endpoint<
    { country: string; aspsp: string },
    EnableBankingAuthenticationStartResponse
  >;
  '/get_session': Endpoint<{ state: string }, EnableBankingToken>;
  '/complete_auth': Endpoint<{ state: string; code: string }, void>;
  '/fail_auth': Endpoint<{ state: string; error?: string }, void>;
  '/get_accounts': Endpoint<{ session_id: string }, EnableBankingToken>;
  '/transactions': Endpoint<TransactionsBody, TransactionsResponse>;
  '/token': Endpoint<undefined, EnableBankingToken>;
  '/accounts': Endpoint<undefined, SyncServerEnableBankingAccount[]>;
};

export type Endpoint<BodyType, ResponseType> = {
  body: BodyType;
  response: ResponseType;
};

export type EnableBankingResponse<T extends keyof EnableBankingEndpoints> =
  | {
      data: EnableBankingEndpoints[T]['response'];
      error?: undefined;
    }
  | {
      data?: undefined;
      error: EnableBankingErrorInterface;
    };

export type EnableBankingErrorCode =
  | 'ENABLEBANKING_SECRETS_INVALID'
  | 'ENABLEBANKING_APPLICATION_INACTIVE'
  | 'ENABLEBANKING_NOT_CONFIGURED'
  | 'INTERNAL_ERROR'
  | 'ENABLEBANKING_SESSION_CLOSED'
  | 'BAD_REQUEST'
  | 'NOT_READY'
  | 'NOT_FOUND'
  | 'TIME_OUT'
  | 'AUTH_FAILED';

export type EnableBankingErrorInterface = {
  error_code: EnableBankingErrorCode;
  error_type: string;
};

export type ConfigureBody = {
  applicationId: string;
  secret: string;
};

export type TransactionsBody = {
  account_id: string;
  startDate?: string;
  endDate?: string;
  bank_id?: string;
};

export type EnableBankingBank = {
  name: string;
  logo: string;
  BIC?: string;
  country: string;
};

export type EnableBankingAuthenticationStartResponse = {
  redirect_url: string;
  state: string;
};

export type EnableBankingToken = {
  bank_id: string;
  session_id: string;
  accounts: SyncServerEnableBankingAccount[];
};

export type SyncServerEnableBankingAccount = {
  account_id: string;
  name: string;
  institution: string;
  balance: number;
};

export type EnableBankingStatusResponse = {
  configured: boolean;
};

export type Transaction = {
  amount: number;
  payeeName: string;
  notes: string;
  date: string;
  [x: string]: unknown;
};

export type TransactionsResponse = {
  transactions: Transaction[];
};

export type Account = {
  account_id: string;
  name: string;
  institution: string;
  balance: number;
};
