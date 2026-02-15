import type { Balance, Transaction } from '../gocardless-node.types';
import type {
  DetailedAccountWithInstitution,
  NormalizedAccountDetails,
} from '../gocardless.types';

type TransactionExtended = Transaction & {
  date?: string;
  payeeName?: string;
  notes?: string;
  remittanceInformationUnstructuredArrayString?: string;
  remittanceInformationStructuredArrayString?: string;
};

export type IBank = {
  institutionIds: string[];

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
  ) => TransactionExtended | null;

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
