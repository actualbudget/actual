import Fallback from './integration-bank.js';
import { amountToInteger } from '../utils.js';

/** @type {import('./bank.interface.js').IBank} */
export default {
  ...Fallback,

  institutionIds: ['ING_INGBROBU'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    //Merchant transactions all have the same transactionId of 'NOTPROVIDED'.
    //For booked transactions, this can be set to the internalTransactionId
    //For pending transactions, this needs to be removed for them to show up in Actual

    //For deduplication to work better, payeeName needs to be standardized
    //and converted from a pending transaction form ("payeeName":"Card no: xxxxxxxxxxxx1111"') to a booked transaction form ("payeeName":"Card no: Xxxx Xxxx Xxxx 1111")
    if (transaction.transactionId === 'NOTPROVIDED') {
      //Some corner case transactions only have the `proprietaryBankTransactionCode` field, this need to be copied to `remittanceInformationUnstructured`
      if (
        transaction.proprietaryBankTransactionCode &&
        !transaction.remittanceInformationUnstructured
      ) {
        editedTrans.remittanceInformationUnstructured =
          transaction.proprietaryBankTransactionCode;
      }

      if (booked) {
        transaction.transactionId = transaction.internalTransactionId;
        if (
          transaction.remittanceInformationUnstructured &&
          transaction.remittanceInformationUnstructured
            .toLowerCase()
            .includes('card no:')
        ) {
          editedTrans.creditorName =
            transaction.remittanceInformationUnstructured.split(',')[0];
          //Catch all case for other types of payees
        } else {
          editedTrans.creditorName =
            transaction.remittanceInformationUnstructured;
        }
      } else {
        transaction.transactionId = null;

        if (
          transaction.remittanceInformationUnstructured &&
          transaction.remittanceInformationUnstructured
            .toLowerCase()
            .includes('card no:')
        ) {
          editedTrans.creditorName =
            transaction.remittanceInformationUnstructured.replace(
              /x{4}/g,
              'Xxxx ',
            );
          //Catch all case for other types of payees
        } else {
          editedTrans.creditorName =
            transaction.remittanceInformationUnstructured;
        }
        //Remove remittanceInformationUnstructured from pending transactions, so the `notes` field remains empty (there is no merchant information)
        //Once booked, the right `notes` (containing the merchant) will be populated
        editedTrans.remittanceInformationUnstructured = null;
      }
    }

    // https://github.com/actualbudget/actual/blob/0085c3b58a56e68b184b3e2d4bbc5ea286f67dc2/packages/sync-server/src/app-gocardless/banks/ssk_dusseldorf_dussdeddxxx.js#L16C1-L23C1
    if (!booked) {
      console.debug(
        'Skipping unbooked transaction:',
        transaction.transactionId,
      );
      return null;
    }

        if (amountToInteger(transaction.transactionAmount.amount) < 0) {
            if (!transaction.creditorName) {
                if (transaction.remittanceInformationUnstructured.match(/^Card/)) {
                    editedTrans.payeeName = transaction.remittanceInformationUnstructured.split(',')[3];
                }
                else if (transaction.remittanceInformationUnstructured.match(/^Beneficiary/)) {
                    console.info('-------------------------------> HIT: /^Beneficiary/ - without creditorName set!');
                    editedTrans.payeeName = transaction.remittanceInformationUnstructured.split(',')[1];
                }
            }
            else {
                editedTrans.payeeName = transaction.creditorName + ' (' + transaction.creditorAccount.iban.replace(/(.{4}).{16}(.{4})/,"$1 XXXX $2") + ')';
            }
        }
        else {
            if (transaction.remittanceInformationUnstructured.match(/Ordering\sparty/)) {
                editedTrans.payeeName = transaction.remittanceInformationUnstructured.match(/Ordering\sparty,\s?(.+?),/)[1] + ' (' + transaction.debtorAccount.iban.replace(/(.{4}).{16}(.{4})/,"$1 XXXX $2") + ')';
            }
        }

        if (transaction.proprietaryBankTransactionCode) {
            console.info(transaction.notes);
            editedTrans.notes = transaction.remittanceInformationUnstructured + ' (' + transaction.proprietaryBankTransactionCode + ')';
        }
        else {
            console.info('-------------------------------> HIT: Missing transaction.proprietaryBankTransactionCode set!');
        }

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
};
