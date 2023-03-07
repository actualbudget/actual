import {
  DetailedAccountWithInstitution,
  NormalizedAccountDetails,
} from '../nordigen.types.js';
import { Transaction, Balance } from '../nordigen-node.types.js';

export interface IBank {
  institutionId: string;
  /**
   * Returns normalized object with required data for the frontend
   */
  normalizeAccount: (
    account: DetailedAccountWithInstitution,
  ) => NormalizedAccountDetails;

  /**
   * Function sorts an array of transactions from newest to oldest
   */
  sortTransactions: (transactions: Transaction[]) => Transaction[];

  /**
   * Calculates account balance before which was before transactions provided in sortedTransactions param
   */
  calculateStartingBalance: (
    sortedTransactions: Transaction[],
    balances: Balance[],
  ) => number;
}
