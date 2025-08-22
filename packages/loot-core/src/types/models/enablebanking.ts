export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (response as ErrorResponse).error_code !== undefined;
}

export type ErrorCode = 'SERVER' | 'ENABLEBANKING_SESSION_CLOSED' | 'TIME_OUT';

export type ErrorResponse = {
  error_code: ErrorCode;
  error_type?: string;
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

export type EnableBankingTransaction = {
  id: string;
  amount: number;
  payee: string;
  notes: string;
  date: string;
};

export type EnableBankingTransactionsResponse = {
  transactions: EnableBankingTransaction[];
};
