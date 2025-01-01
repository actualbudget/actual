import {
  GoCardlessAccountMetadata,
  GoCardlessAccountDetails,
  Institution,
  Transactions,
  Balance,
  Transaction,
} from './gocardless-node.types.js';

export type DetailedAccount = Omit<GoCardlessAccountDetails, 'status'> &
  GoCardlessAccountMetadata;
export type DetailedAccountWithInstitution = DetailedAccount & {
  institution: Institution;
};
export type TransactionWithBookedStatus = Transaction & { booked: boolean };

export type NormalizedAccountDetails = {
  /**
   * Id of the account
   */
  account_id: string;

  /**
   * Institution of account
   */
  institution: Institution;

  /**
   * last 4 digits from the account iban
   */
  mask: string;

  /**
   * the account iban
   */
  iban: string;

  /**
   * Name displayed on the UI of Actual app
   */
  name: string;

  /**
   *  name of the product in the institution
   */
  official_name: string;

  /**
   * type of account
   */
  type: string;
};

export type GetTransactionsParams = {
  /**
   * Id of the institution from GoCardless
   */
  institutionId: string;

  /**
   * Id of account from the GoCardless app
   */
  accountId: string;

  /**
   * Begin date of the period from which we want to download transactions
   */
  startDate: string;

  /**
   * End date of the period from which we want to download transactions
   */
  endDate?: string;
};

export type GetTransactionsResponse = {
  status_code?: number;
  detail?: string;
  transactions: Transactions;
};

export type CreateRequisitionParams = {
  institutionId: string;

  /**
   * Host of your frontend app - on this host you will be redirected after linking with bank
   */
  host: string;
};

export type GetBalances = {
  balances: Balance[];
};
