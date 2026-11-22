import type {
  Balance,
  Transaction,
} from '#app-gocardless/gocardless-node.types';
import type {
  DetailedAccountWithInstitution,
  NormalizedAccountDetails,
} from '#app-gocardless/gocardless.types';

type TransactionExtended = Transaction & {
  date?: string;
  payeeName?: string;
  notes?: string;
  remittanceInformationUnstructuredArrayString?: string;
  remittanceInformationStructuredArrayString?: string;
};

type NormalizedTransaction = Transaction & {
  date: string;
  payeeName: string;
  notes: string;
  remittanceInformationUnstructuredArrayString?: string;
  remittanceInformationStructuredArrayString?: string;
};

export type IBank = {
  institutionIds: string[];

  /**
   * Some institutions fail to complete the linking process when a requisition
   * is associated with a previously created end-user agreement, leaving it in
   * the `UA` state indefinitely. When enabled, this option skips agreement
   * creation and uses GoCardless' default agreement instead.
   */
  skipEndUserAgreement?: boolean;

  /**
   * Returns normalized object with required data for the frontend
   */
  normalizeAccount: (
    account: DetailedAccountWithInstitution,
  ) => NormalizedAccountDetails;

  /**
   * Returns a normalized transaction object
   *
   * The GoCardless integrations with different banks are very inconsistent in
   * what each of the different date fields actually mean, so this function is
   * expected to set a `date` field which corresponds to the expected
   * transaction date.
   */
  normalizeTransaction: (
    transaction: TransactionExtended,
    booked: boolean,
    editedTransaction?: TransactionExtended,
  ) => NormalizedTransaction | null;

  /**
   * Function sorts an array of transactions from newest to oldest
   */
  sortTransactions: <T extends Transaction>(transactions: T[]) => T[];

  /**
   * Calculates account balance before which was before transactions provided in sortedTransactions param
   */
  calculateStartingBalance: (
    sortedTransactions: Transaction[],
    balances: Balance[],
  ) => number;
};
