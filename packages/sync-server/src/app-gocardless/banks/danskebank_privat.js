import { getCurrency } from 'loot-core/shared/currencies';
import { amountToInteger } from 'loot-core/shared/util';

import Fallback from './integration-bank';

/** @type {import('./bank.interface').IBank} */
export default {
  ...Fallback,

  // TODO: Add other Danske Bank BICs?
  // https://danskeci.com/ci/transaction-banking/bank-identifier-code
  institutionIds: ['DANSKEBANK_DABADKKK', 'DANSKEBANK_DABANO22'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    /**
     * Danske Bank appends the EndToEndID: NOTPROVIDED to
     * remittanceInformationUnstructured, cluttering the data.
     *
     * We clean thais up by removing any instances of this string from all transactions.
     *
     */
    editedTrans.remittanceInformationUnstructured =
      transaction.remittanceInformationUnstructured.replace(
        '\nEndToEndID: NOTPROVIDED',
        '',
      );

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances.find(
      balance => balance.balanceType === 'interimAvailable',
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
