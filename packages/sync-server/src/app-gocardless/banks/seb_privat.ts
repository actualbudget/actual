import { startingBalanceFromTransactions } from '#app-gocardless/utils';

import type { IBank } from './bank.interface';
import Fallback from './integration-bank';

export default {
  ...Fallback,

  institutionIds: ['SEB_ESSESESS_PRIVATE'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    // Creditor name is stored in additionInformation for SEB
    editedTrans.creditorName = transaction.additionalInformation;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances.find(
      balance => 'interimBooked' === balance.balanceType,
    );

    return startingBalanceFromTransactions(
      currentBalance?.balanceAmount.amount ?? '0',
      sortedTransactions,
    );
  },
} satisfies IBank;
