import { getCurrency } from 'loot-core/shared/currencies';
import { amountToInteger } from 'loot-core/shared/util';

import Fallback from './integration-bank';

/** @type {import('./bank.interface').IBank} */
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
    const currentBalanceDecimals = getCurrency(
      currentBalance?.balanceAmount?.currency || '',
    ).decimalPlaces;

    return sortedTransactions.reduce(
      (total, trans) => {
        return (
          total -
          amountToInteger(
            Number(trans.transactionAmount.amount || 0),
            currentBalanceDecimals,
          )
        );
      },
      amountToInteger(
        Number(currentBalance?.balanceAmount?.amount || 0),
        currentBalanceDecimals,
      ),
    );
  },
};
