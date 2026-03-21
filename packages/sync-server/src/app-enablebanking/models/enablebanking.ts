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
  | 'POLLING_ABORTED'
  | 'AUTH_FAILED';

export type EnableBankingErrorInterface = {
  error_code: EnableBankingErrorCode;
  error_type: string;
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

export type Transaction = {
  amount: number;
  payeeName: string;
  notes: string;
  date: string;
  transactionAmount: {
    amount: number;
    currency: string;
  };
  /** true when the transaction is booked (status === 'BOOK'), false for pending */
  booked: boolean;
  /** Stable unique identifier for deduplication; mapped from entry_reference */
  transactionId: string | null;
  [x: string]: unknown;
};
