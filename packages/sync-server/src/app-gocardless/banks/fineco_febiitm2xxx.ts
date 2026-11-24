import type { IBank } from './bank.interface';
import Fallback from './integration-bank';
import { extractPayeeNameFromRemittanceInfo } from './util/extract-payeeName-from-remittanceInfo';

export default {
  ...Fallback,

  institutionIds: ['FINECO_FEBIITM2XXX'],

  normalizeTransaction(transaction, booked) {
    const editedTrans = { ...transaction };

    // Visa payment circuit
    // pattern: <payee> Carta N. <card n.> Data operazione <dd / mm / yy>
    if (editedTrans.proprietaryBankTransactionCode?.startsWith('W43')) {
      editedTrans.payeeName = extractPayeeNameFromRemittanceInfo(
        transaction.remittanceInformationUnstructured ?? '',
        ['Carta'],
      );
    }

    // Bancomat payment circuit
    // pattern: Pag. del <dd/mm/yy> ora <hh:mm> presso: <payee> Carta N <card n.> Num. Rif. Transazione <trans. no>
    if (editedTrans.proprietaryBankTransactionCode?.startsWith('043')) {
      editedTrans.payeeName = extractPayeeNameFromRemittanceInfo(
        transaction.remittanceInformationUnstructured ?? '',
        ['Carta'],
      );
      const prefix = 'presso:';
      const prefix_index = editedTrans.payeeName?.indexOf(prefix);
      if (prefix_index !== -1) {
        editedTrans.payeeName = editedTrans.payeeName?.slice(
          prefix_index + prefix.length,
        );
      }
    }

    editedTrans.payeeName = editedTrans.payeeName?.trim();

    // this practically sets the transaction notes to bank transfer description
    // at least, based on my transaction history, the only transaction types with structured info are
    // 'I48-Bonifico SEPA Italia' and 'V26-Bonifico Istantaneo'
    // I'd assume that this also apply to non-SEPA or non-Italian bank transfers, logically.
    //
    // if this causes issues, we could explicitely check for bank transfers and set the notes accordingly
    editedTrans.notes =
      transaction.remittanceInformationStructured ??
      transaction.remittanceInformationUnstructured;

    editedTrans.date = transaction.valueDate || transaction.bookingDate;

    return Fallback.normalizeTransaction(transaction, booked, editedTrans);
  },
} satisfies IBank;
