import { type BankProcessor } from '../models/bank-processor.js';
import { type components } from '../models/enablebanking-openapi.js';
import { type Transaction } from '../models/enablebanking.js';

export class FallbackBankProcessor implements BankProcessor {
  debug = true;
  name = 'FallbackBankProcessor';
  normalizeTransaction(t: components['schemas']['Transaction']): Transaction {
    const isDebtor = t.credit_debit_indicator === 'DBIT';

    const payeeObject = isDebtor ? t.creditor : t.debtor;

    const payeeName = payeeObject && payeeObject.name ? payeeObject.name : '';
    return {
      ...t,
      payeeObject,
      amount: t.transaction_amount?.amount
        ? parseFloat(t.transaction_amount.amount) * (isDebtor ? -1 : 1)
        : 0,
      payeeName,
      notes: t.remittance_information ? t.remittance_information.join('') : '',
      date: t.transaction_date ?? t.booking_date ?? t.value_date ?? '',
    };
  }
}
