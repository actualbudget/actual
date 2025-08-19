import { BankProcessor } from '../models/bank-processor.js';
import { EnableBankingTransaction } from '../models/enablebanking.js';
import { Transaction } from '../models/models-enablebanking.js';

export class FallbackBankProcessor implements BankProcessor {
  debug = true;
  name = 'FallbackBankProcessor';
  normalizeTransaction(t: Transaction): EnableBankingTransaction {
    const isDebtor = t.credit_debit_indicator === 'DBIT';

    const payeeObject = isDebtor ? t.creditor : t.debtor;

    const payeeName = payeeObject && payeeObject.name ? payeeObject.name : '';
    return {
      ...t,
      payeeObject,
      amount: parseFloat(t.transaction_amount.amount) * (isDebtor ? -1 : 1),
      payeeName,
      notes: t.remittance_information ? t.remittance_information.join('') : '',
      date: t.transaction_date ?? t.booking_date ?? t.value_date ?? '',
    };
  }
}
