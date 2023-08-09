import {
  DetailedAccountWithInstitution,
  NormalizedAccountDetails,
} from '../gocardless.types.js';
import { Transaction, Balance } from '../gocardless-node.types.js';

export interface IBank {
  institutionIds: string[];
  /**
   * Returns normalized object with required data for the frontend
   */
  normalizeAccount: (
    account: DetailedAccountWithInstitution,
  ) => NormalizedAccountDetails;

  /**
   * Returns a normalized transaction object
   */
  normalizeTransaction: (
    transaction: Transaction,
    booked: boolean,
  ) => Transaction | null;

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
}
