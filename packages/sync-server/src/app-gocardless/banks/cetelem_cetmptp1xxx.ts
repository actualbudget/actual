import { subtractDecimalAmounts } from '#app-gocardless/utils';

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
      amount: subtractDecimalAmounts('0', [
        transaction.transactionAmount.amount,
      ]),
    };

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
