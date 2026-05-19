// @ts-strict-ignore
import type { IBank } from './bank.interface';
import Fallback from './integration-bank';

export default {
  ...Fallback,

  institutionIds: ['CETELEM_CETMPTP1XXX'],

  /**
   * Sign of transaction amount needs to be flipped for Cetelem Black credit cards
   */
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    transaction.transactionAmount = {
      // Flip transaction amount sign
      ...transaction.transactionAmount,
      amount: (-parseFloat(transaction.transactionAmount.amount)).toString(),
    };

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
