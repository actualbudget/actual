import { cleanRemittanceArray } from '#app-enablebanking/services/enablebanking-service';

import type { IEnableBankingBank } from './bank.interface';

const IntegrationBank: IEnableBankingBank = {
  matches() {
    return true;
  },

  normalizeTransaction(tx, editedTransaction) {
    const effectiveTx = editedTransaction
      ? { ...tx, ...editedTransaction }
      : tx;
    const transactionId =
      effectiveTx.entry_reference || effectiveTx.transaction_id || '';
    const bookingDate =
      effectiveTx.booking_date ||
      effectiveTx.value_date ||
      effectiveTx.transaction_date ||
      '';
    const valueDate = effectiveTx.value_date;

    let payeeName = '';
    // With a known direction, the other party is the account holder.
    if (effectiveTx.credit_debit_indicator === 'CRDT') {
      payeeName = effectiveTx.debtor?.name || '';
    } else if (effectiveTx.credit_debit_indicator === 'DBIT') {
      payeeName = effectiveTx.creditor?.name || '';
    } else {
      payeeName = effectiveTx.creditor?.name || effectiveTx.debtor?.name || '';
    }

    const cleanedAll = effectiveTx.remittance_information
      ? cleanRemittanceArray(effectiveTx.remittance_information)
      : [];
    if (!payeeName) {
      payeeName = cleanedAll[0] || '';
    }
    const remittanceInformationUnstructured =
      cleanedAll.length > 0 ? cleanedAll.join(' ') : undefined;

    // Normalize amount based on credit/debit indicator.
    // When indicator is present, strip existing sign and apply the correct one.
    // When absent, preserve the original sign from the bank.
    const trimmedAmount = effectiveTx.transaction_amount.amount.trim();
    let signedAmount: string;
    if (effectiveTx.credit_debit_indicator === 'DBIT') {
      signedAmount = '-' + trimmedAmount.replace(/^[+-]/, '');
    } else if (effectiveTx.credit_debit_indicator === 'CRDT') {
      signedAmount = trimmedAmount.replace(/^[+-]/, '');
    } else {
      signedAmount = trimmedAmount;
    }

    return {
      ...effectiveTx,
      transactionId,
      date: bookingDate,
      bookingDate,
      valueDate,
      transactionAmount: {
        amount: signedAmount,
        currency: effectiveTx.transaction_amount.currency,
      },
      payeeName,
      notes: remittanceInformationUnstructured,
      remittanceInformationUnstructured,
      // Holds and scheduled payments have not moved any money yet.
      booked: !['PDNG', 'HOLD', 'SCHD'].includes(effectiveTx.status ?? ''),
    };
  },
};

export default IntegrationBank;
