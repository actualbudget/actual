import type { BankProcessor } from '../models/bank-processor.js';
import type { components } from '../models/enablebanking-openapi.js';
import type { Transaction } from '../models/enablebanking.js';

export class FallbackBankProcessor implements BankProcessor {
  debug = true;
  name = 'FallbackBankProcessor';
  normalizeTransaction(t: components['schemas']['Transaction']): Transaction {
    const isDebtor = t.credit_debit_indicator === 'DBIT';

    const payeeObject = isDebtor ? t.creditor : t.debtor;

    const payeeName = payeeObject && payeeObject.name ? payeeObject.name : '';
    const parsedAmount = t.transaction_amount?.amount
      ? parseFloat(t.transaction_amount.amount)
      : 0;
    const amount = Number.isNaN(parsedAmount)
      ? 0
      : parsedAmount * (isDebtor ? -1 : 1);

    const currency = t.transaction_amount?.currency;
    if (!currency) {
      console.warn(
        `Missing currency for transaction ${t.transaction_id || 'unknown'}, using empty string. This may indicate a data quality issue.`,
      );
    }

    return {
      ...t,
      payeeObject,
      amount,
      // Add camelCase transactionAmount for compatibility with sync.ts
      transactionAmount: {
        amount,
        currency: currency ?? '',
      },
      payeeName,
      notes: t.remittance_information ? t.remittance_information.join(' ') : '',
      date:
        (t.transaction_date && t.transaction_date.trim()) ||
        (t.booking_date && t.booking_date.trim()) ||
        (t.value_date && t.value_date.trim()) ||
        '',
    };
  }
}
