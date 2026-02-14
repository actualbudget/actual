import { getCurrency } from 'loot-core/shared/currencies';
import { amountToInteger } from 'loot-core/shared/util';

import Fallback from './integration-bank';

/** @type {import('./bank.interface').IBank} */
export default {
  ...Fallback,

  institutionIds: ['SANDBOXFINANCE_SFIN0000'],

  /**
   *  For SANDBOXFINANCE_SFIN0000 we don't know what balance was
   *  after each transaction so we have to calculate it by getting
   *  current balance from the account and subtract all the transactions
   *
   *  As a current balance we use `interimBooked` balance type because
   *  it includes transaction placed during current day
   */
  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances.find(
      balance => 'interimAvailable' === balance.balanceType,
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
