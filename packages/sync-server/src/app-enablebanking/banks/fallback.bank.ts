import type { BankProcessor } from '../models/bank-processor.js';
import type { components } from '../models/enablebanking-openapi.js';
import type { Transaction } from '../models/enablebanking.js';

export function resolveTransactionDate(
  t: components['schemas']['Transaction'],
): string {
  const date =
    (t.transaction_date && t.transaction_date.trim()) ||
    (t.booking_date && t.booking_date.trim()) ||
    (t.value_date && t.value_date.trim());

  if (!date) {
    const transactionIdentifier =
      t.entry_reference ??
      t.transaction_id ??
      t.remittance_information?.[0] ??
      'unknown';

    throw new Error(
      `Missing transaction date for Enable Banking transaction: ${transactionIdentifier}`,
    );
  }

  return date;
}

export function normalizeFallbackTransaction(
  t: components['schemas']['Transaction'],
): Transaction {
  const isDebtor = t.credit_debit_indicator === 'DBIT';
  const transactionIdentifier =
    t.entry_reference ??
    t.transaction_id ??
    t.remittance_information?.[0] ??
    'unknown';

  const payeeObject = isDebtor ? t.creditor : t.debtor;

  const payeeName =
    (payeeObject && payeeObject.name ? payeeObject.name : '') ||
    (t.remittance_information ? t.remittance_information.join(' ') : '');
  const rawAmount = t.transaction_amount?.amount;
  const parsedAmount = rawAmount ? parseFloat(rawAmount) : Number.NaN;

  if (
    !rawAmount ||
    !Number.isFinite(parsedAmount) ||
    Number.isNaN(parsedAmount)
  ) {
    throw new Error(
      `Missing or invalid transaction amount for Enable Banking transaction: ${transactionIdentifier}`,
    );
  }

  const amount = parsedAmount * (isDebtor ? -1 : 1);

  const currency = t.transaction_amount?.currency;
  if (!currency) {
    console.warn(
      `Missing currency for transaction ${t.transaction_id || 'unknown'}, using empty string. This may indicate a data quality issue.`,
    );
  }

  const date = resolveTransactionDate(t);

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
    date,
    // Map API status to booked boolean (sync.ts uses trans.booked to set cleared)
    booked: t.status === 'BOOK',
    // Map stable unique entry_reference to camelCase transactionId used for import deduplication.
    // entry_reference is the immutable unique identifier per the Enable Banking API.
    transactionId: t.entry_reference ?? t.transaction_id ?? null,
  };
}

export function createFallbackBankProcessor(): BankProcessor {
  return {
    debug: false,
    name: 'FallbackBankProcessor',
    normalizeTransaction: normalizeFallbackTransaction,
  };
}
