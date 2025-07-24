/**
 *  Credit for this code goes to Nebukadneza at https://github.com/Nebukadneza
 */
import { amountToInteger } from '../utils.js';

import Fallback from './integration-bank.js';
/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,
  institutionIds: ['SSK_MUNCHEN_SSKMDEMMXXX'],
  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };
    let remittanceInformationUnstructured;
    if (transaction.remittanceInformationUnstructured) {
      remittanceInformationUnstructured =
        transaction.remittanceInformationUnstructured;
    } else if (transaction.remittanceInformationStructured) {
      remittanceInformationUnstructured =
        transaction.remittanceInformationStructured;
    } else if (transaction.remittanceInformationStructuredArray?.length > 0) {
      remittanceInformationUnstructured =
        transaction.remittanceInformationStructuredArray?.join(' ');
    }
    if (transaction.additionalInformation) {
      remittanceInformationUnstructured +=
        ' ' + transaction.additionalInformation;
    }
    const usefulCreditorName =
      transaction.ultimateCreditor ||
      transaction.creditorName ||
      transaction.debtorName;
    editedTrans.creditorName = usefulCreditorName;
    editedTrans.remittanceInformationUnstructured =
      remittanceInformationUnstructured;
    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
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
    return sortedTransactions.reduce((total, trans) => {
      return total - amountToInteger(trans.transactionAmount.amount);
    }, amountToInteger(currentBalance.balanceAmount.amount));
  },
};
