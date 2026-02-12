import { getCurrency } from 'loot-core/shared/currencies';
import { amountToInteger } from 'loot-core/shared/util';

import Fallback from './integration-bank';

/** @type {import('./bank.interface').IBank} */
export default {
  ...Fallback,

  institutionIds: ['ENTERCARD_SWEDNOKK'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    // GoCardless's Entercard integration returns forex transactions with the
    // foreign amount in `transactionAmount`, but at least the amount actually
    // billed to the account is now available in
    // `remittanceInformationUnstructured`.
    const remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructured;
    if (remittanceInformationUnstructured.startsWith('billingAmount: ')) {
      transaction.transactionAmount = {
        amount: remittanceInformationUnstructured.substring(15),
        currency: 'SEK',
      };
    }

    editedTrans.date = transaction.valueDate;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
    return sortedTransactions.reduce(
      (total, trans) => {
        return (
          total -
          amountToInteger(
            trans.transactionAmount.amount,
            getCurrency(trans.transactionAmount.currency || '').decimalPlaces,
          )
        );
      },
      amountToInteger(
        balances[0]?.balanceAmount?.amount || 0,
        getCurrency(balances[0]?.balanceAmount?.currency || '').decimalPlaces,
      ),
    );
  },
};
