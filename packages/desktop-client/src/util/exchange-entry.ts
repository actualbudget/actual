import {
  baseToNative,
  nativeToBase,
} from '@actual-app/core/shared/exchange-rate';
import type { AccountEntity } from '@actual-app/core/types/models';

import { encodingKey } from './account-encoding';

type EntryAccount = Pick<
  AccountEntity,
  'id' | 'currency' | 'currency_precision' | 'offbudget'
>;

/** The other account when a new transaction is an exchange transfer. */
export function exchangeOtherAccount<Account extends EntryAccount>(
  transaction: { account?: string | null; payee?: string | null },
  payees: ReadonlyArray<{ id: string; transfer_acct?: string | null }>,
  accounts: ReadonlyArray<Account>,
): Account | null {
  const payee = payees.find(p => p.id === transaction.payee);
  if (!payee?.transfer_acct || payee.transfer_acct === transaction.account) {
    return null;
  }
  const register = accounts.find(a => a.id === transaction.account);
  const other = accounts.find(a => a.id === payee.transfer_acct);
  if (!register || !other || encodingKey(register) === encodingKey(other)) {
    return null;
  }
  return other;
}

export type ExchangeEntry = {
  date: string;
  register: EntryAccount;
  other: EntryAccount;
  /** Signed in the register's encoding: negative is a payment out. */
  registerAmount: number;
  /** Magnitude in the other account's encoding, when entered. */
  otherAmount: number | null;
  /** Magnitude of an optional fee, in the currency of `feeSide`. */
  fee: number | null;
  feeSide: 'register' | 'other';
  /** The principal's base value, used only between two foreign accounts. */
  baseValue: number | null;
  category: string | null;
  feeCategory: string | null;
  notes: string | null;
  cleared: boolean;
};

export type ExchangeEntryError =
  | 'amount-required'
  | 'other-amount-required'
  | 'fee-invalid';

export type ExchangeRequest = {
  date: string;
  sourceAccount: string;
  destinationAccount: string;
  sourceAmount: number;
  destinationAmount: number;
  sourceFee?: number;
  destinationFee?: number;
  baseAmount?: number;
  category?: string | null;
  feeCategory?: string | null;
  notes?: string | null;
  cleared?: boolean;
  initiatingAccount: string;
};

/** True when exactly one account is on budget, so the principal is categorized. */
export function needsPrincipalCategory(entry: {
  register: EntryAccount;
  other: EntryAccount;
}) {
  return !!entry.register.offbudget !== !!entry.other.offbudget;
}

export function isPayment(entry: Pick<ExchangeEntry, 'registerAmount'>) {
  return entry.registerAmount < 0;
}

/**
 * The handler request for an exchange entered in the register: the payment
 * side is the source. Both amounts are always sent, so what was shown is
 * what posts.
 */
export function buildExchangeRequest(
  entry: ExchangeEntry,
):
  | { ok: true; request: ExchangeRequest }
  | { ok: false; error: ExchangeEntryError } {
  if (
    !Number.isSafeInteger(entry.registerAmount) ||
    entry.registerAmount === 0
  ) {
    return { ok: false, error: 'amount-required' };
  }
  if (
    entry.otherAmount == null ||
    !Number.isSafeInteger(entry.otherAmount) ||
    entry.otherAmount <= 0
  ) {
    return { ok: false, error: 'other-amount-required' };
  }
  if (
    entry.fee != null &&
    (!Number.isSafeInteger(entry.fee) || entry.fee < 0)
  ) {
    return { ok: false, error: 'fee-invalid' };
  }
  const payment = isPayment(entry);
  const [source, destination] = payment
    ? [entry.register, entry.other]
    : [entry.other, entry.register];
  const registerMagnitude = Math.abs(entry.registerAmount);
  const fee = entry.fee || 0;
  const feeOnSource = (entry.feeSide === 'register') === payment;
  const bothForeign = !!entry.register.currency && !!entry.other.currency;
  return {
    ok: true,
    request: {
      date: entry.date,
      sourceAccount: source.id,
      destinationAccount: destination.id,
      sourceAmount: payment ? registerMagnitude : entry.otherAmount,
      destinationAmount: payment ? entry.otherAmount : registerMagnitude,
      ...(fee > 0 &&
        (feeOnSource ? { sourceFee: fee } : { destinationFee: fee })),
      ...(bothForeign &&
        entry.baseValue != null && { baseAmount: entry.baseValue }),
      ...(needsPrincipalCategory(entry) && { category: entry.category }),
      ...(fee > 0 && { feeCategory: entry.feeCategory }),
      notes: entry.notes,
      cleared: entry.cleared,
      initiatingAccount: entry.register.id,
    },
  };
}

function precisionOf(account: EntryAccount, budgetPrecision: number) {
  return account.currency_precision ?? budgetPrecision;
}

/**
 * The other account's amount from a rate (destination units per source
 * unit), with the same rounding the server uses. Returns null when it
 * cannot be computed.
 */
export function otherAmountFromRate(
  entry: Pick<
    ExchangeEntry,
    'register' | 'other' | 'registerAmount' | 'fee' | 'feeSide'
  >,
  rate: string,
  budgetPrecision: number,
): number | null {
  try {
    const payment = isPayment(entry);
    const fee = entry.fee || 0;
    const feeOnSource = (entry.feeSide === 'register') === payment;
    const registerMagnitude = Math.abs(entry.registerAmount);
    const registerPrecision = precisionOf(entry.register, budgetPrecision);
    const otherPrecision = precisionOf(entry.other, budgetPrecision);
    let result: number;
    if (payment) {
      // N = bankersRound((S - F_source) × R) - F_destination
      const principal = registerMagnitude - (feeOnSource ? fee : 0);
      result =
        baseToNative(principal, registerPrecision, otherPrecision, rate) -
        (feeOnSource ? 0 : fee);
    } else {
      // S = bankersRound((N + F_destination) / R) + F_source
      const gross = registerMagnitude + (feeOnSource ? 0 : fee);
      result =
        nativeToBase(gross, registerPrecision, otherPrecision, rate) +
        (feeOnSource ? fee : 0);
    }
    return result > 0 ? result : null;
  } catch {
    return null;
  }
}

/**
 * The rate implied by the two transfer legs (destination units per source
 * unit), for display only.
 */
export function impliedRate(
  entry: Pick<
    ExchangeEntry,
    'register' | 'other' | 'registerAmount' | 'otherAmount' | 'fee' | 'feeSide'
  >,
  budgetPrecision: number,
): number | null {
  if (!entry.otherAmount || !entry.registerAmount) return null;
  const payment = isPayment(entry);
  const fee = entry.fee || 0;
  const feeOnSource = (entry.feeSide === 'register') === payment;
  const [sourceAmount, destinationAmount] = payment
    ? [Math.abs(entry.registerAmount), entry.otherAmount]
    : [entry.otherAmount, Math.abs(entry.registerAmount)];
  const [sourcePrecision, destinationPrecision] = payment
    ? [
        precisionOf(entry.register, budgetPrecision),
        precisionOf(entry.other, budgetPrecision),
      ]
    : [
        precisionOf(entry.other, budgetPrecision),
        precisionOf(entry.register, budgetPrecision),
      ];
  const principal = sourceAmount - (feeOnSource ? fee : 0);
  const gross = destinationAmount + (feeOnSource ? 0 : fee);
  if (principal <= 0 || gross <= 0) return null;
  return (
    gross / 10 ** destinationPrecision / (principal / 10 ** sourcePrecision)
  );
}

/** The cross rate between two currencies from their rates per base unit. */
export function crossRate(
  sourcePerBase: string | null,
  destinationPerBase: string | null,
): string | null {
  if (!sourcePerBase || !destinationPerBase) return null;
  const value = Number(destinationPerBase) / Number(sourcePerBase);
  if (!Number.isFinite(value) || value <= 0) return null;
  // ponytail: display-grade cross rate (12 significant digits); exact
  // decimal division if fetched rates ever need more.
  return String(Number(value.toPrecision(12)));
}
