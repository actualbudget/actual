import { v4 as uuidv4 } from 'uuid';

import * as db from '#server/db';
import { resolveRate } from '#server/exchange-rates/app';
import { postExchangeTransfer } from '#server/transactions/exchange-transfer';
import {
  accountEncoding,
  sameEncoding,
} from '#server/transactions/foreign-guard';
import { runRules } from '#server/transactions/transaction-rules';
import {
  getAccountCurrency,
  getDefaultCurrencyCode,
  getRecordedAmountPrecision,
} from '#server/util/currency';
import { baseToNative, nativeToBase } from '#shared/exchange-rate';

/** An exchange occurrence that cannot post without the user's amounts. */
export type ScheduledExchangeUnavailable = {
  type: 'exchange-unavailable';
  reason: 'rate-unavailable' | 'estimate-unusable';
  /** Currencies without a saved rate for the date. */
  currencies: string[];
  date: string;
  /** The schedule account, whose amount `amount` is in its encoding. */
  account: string;
  other: string;
  amount: number;
  notes: string | null;
  cleared: boolean;
  category: string | null;
  schedule: string;
};

/**
 * The other account of a schedule whose payee condition transfers to an
 * account in another encoding, or null for any other schedule.
 */
export async function exchangeTarget(
  accountId: string,
  payeeId: string | null,
): Promise<string | null> {
  if (!payeeId) return null;
  const payee = await db.first<Pick<db.DbPayee, 'transfer_acct'>>(
    'SELECT transfer_acct FROM payees WHERE id = ?',
    [payeeId],
  );
  const other = payee?.transfer_acct;
  if (!other || other === accountId) return null;
  return sameEncoding(
    await accountEncoding(accountId),
    await accountEncoding(other),
  )
    ? null
    : other;
}

/**
 * Posts an exchange schedule's occurrence on its own date, with the other
 * amount estimated from saved rates through the budget currency. The
 * schedule fixes the accounts, amounts and date; rules on its leg add notes,
 * cleared and category. Nothing is written without a usable estimate.
 */
export async function postScheduledExchange({
  schedule,
  account,
  other,
  payee,
  date,
  amount,
}: {
  schedule: string;
  account: string;
  other: string;
  payee: string;
  date: string;
  amount: number;
}): Promise<{ type: 'posted' } | ScheduledExchangeUnavailable> {
  const [own, counterpart] = await Promise.all(
    [account, other].map(async id => ({
      ...(await getAccountCurrency(id)),
      foreign: (await accountEncoding(id)).currency !== null,
    })),
  );

  // Payees a rule names are staged and dropped: the endpoints are fixed.
  const ruled = await runRules(
    {
      id: uuidv4(),
      account,
      payee,
      date,
      schedule,
      cleared: false,
      ...(own.foreign ? { transaction_amount: amount } : { amount }),
    },
    null,
    undefined,
    async () => uuidv4(),
  );
  if (ruled.is_parent || ruled.subtransactions?.length) {
    throw new Error('exchange-split-unavailable');
  }
  const unavailable = {
    type: 'exchange-unavailable' as const,
    date,
    account,
    other,
    amount,
    notes: ruled.notes ?? null,
    cleared: !!ruled.cleared,
    category: ruled.category ?? null,
    schedule,
  };

  const budgetCurrency = await getDefaultCurrencyCode();
  const budgetPrecision = getRecordedAmountPrecision();
  const missing: string[] = [];
  const rateFor = async (side: typeof own) => {
    if (!side.foreign) return null;
    const resolved = await resolveRate({
      baseCurrency: budgetCurrency,
      quoteCurrency: side.currencyCode,
      date,
    });
    if (resolved.status === 'resolved') return resolved.rate;
    missing.push(side.currencyCode);
    return null;
  };
  const ownRate = await rateFor(own);
  const otherRate = await rateFor(counterpart);
  if (missing.length > 0) {
    return { ...unavailable, reason: 'rate-unavailable', currencies: missing };
  }

  const magnitude = Math.abs(amount);
  const value = ownRate
    ? nativeToBase(magnitude, own.precision, budgetPrecision, ownRate)
    : magnitude;
  const otherMagnitude = otherRate
    ? baseToNative(value, budgetPrecision, counterpart.precision, otherRate)
    : value;
  if (value === 0 || otherMagnitude === 0) {
    return { ...unavailable, reason: 'estimate-unusable', currencies: [] };
  }

  const payment = amount < 0;
  const result = await postExchangeTransfer({
    date,
    sourceAccount: payment ? account : other,
    destinationAccount: payment ? other : account,
    sourceAmount: payment ? magnitude : otherMagnitude,
    destinationAmount: payment ? otherMagnitude : magnitude,
    // The posted valuation is the one the estimate used.
    ...(own.foreign && counterpart.foreign && { baseAmount: value }),
    category: unavailable.category,
    notes: unavailable.notes,
    cleared: unavailable.cleared,
    initiatingAccount: account,
    schedule,
  });
  if (result.status === 'rate-unavailable') {
    return {
      ...unavailable,
      reason: 'rate-unavailable',
      currencies: result.currencies,
    };
  }
  return { type: 'posted' };
}
