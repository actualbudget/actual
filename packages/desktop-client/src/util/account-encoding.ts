import {
  amountToInteger,
  integerToAmount,
  MAX_SAFE_NUMBER,
} from '@actual-app/core/shared/util';
import type { AccountEntity } from '@actual-app/core/types/models';

type Encoded = Pick<AccountEntity, 'currency' | 'currency_precision'>;

export function encodingKey(account: Encoded | undefined) {
  return `${account?.currency ?? ''}:${account?.currency_precision ?? ''}`;
}

/**
 * Accounts that rows from `sources` cannot move to: native integers keep
 * their value only within one recorded encoding, so mixed sources allow none.
 */
export function incompatibleAccountIds(
  accounts: Array<Encoded & Pick<AccountEntity, 'id'>>,
  sources: Array<Encoded | undefined>,
): Array<AccountEntity['id']> {
  const keys = new Set(sources.map(encodingKey));
  return accounts
    .filter(account => keys.size !== 1 || !keys.has(encodingKey(account)))
    .map(account => account.id);
}

/**
 * Schedules that transactions in these accounts may link to: a schedule's
 * amounts are in its account's encoding, so only schedules without an
 * account, or whose account shares every transaction's encoding, qualify.
 */
export function linkableSchedules<
  S extends { _account: AccountEntity['id'] | null },
>(
  schedules: readonly S[],
  accounts: Array<Encoded & Pick<AccountEntity, 'id'>>,
  transactionAccountIds: Array<AccountEntity['id'] | undefined>,
): S[] {
  const byId = new Map(accounts.map(account => [account.id, account]));
  const keys = new Set(
    transactionAccountIds.map(id => encodingKey(id ? byId.get(id) : undefined)),
  );
  return schedules.filter(
    schedule =>
      schedule._account == null ||
      (keys.size === 1 && keys.has(encodingKey(byId.get(schedule._account)))),
  );
}

/**
 * Re-encodes an amount for another precision when the value is exactly
 * representable there and within the amount limits; otherwise null.
 */
export function reencodeAmount(
  amount: number,
  fromPrecision: number,
  toPrecision: number,
) {
  const reencoded = amountToInteger(
    integerToAmount(amount, fromPrecision),
    toPrecision,
  );
  return Number.isSafeInteger(reencoded) &&
    Math.abs(reencoded) <= MAX_SAFE_NUMBER &&
    amountToInteger(integerToAmount(reencoded, toPrecision), fromPrecision) ===
      amount
    ? reencoded
    : null;
}

/**
 * Accounts an existing schedule cannot move to: its amounts are stored in
 * its account's encoding (none: base), which it keeps.
 */
export function otherEncodingAccountIds(
  accounts: Array<Encoded & Pick<AccountEntity, 'id'>>,
  scheduleAccount: Encoded | undefined,
): Array<AccountEntity['id']> {
  const key = encodingKey(scheduleAccount);
  return accounts
    .filter(account => encodingKey(account) !== key)
    .map(account => account.id);
}

/** A schedule amount or range in another precision, or null when inexact. */
export function reencodeScheduleAmount(
  amount: number | { num1: number; num2: number },
  fromPrecision: number,
  toPrecision: number,
): number | { num1: number; num2: number } | null {
  if (typeof amount === 'number') {
    return reencodeAmount(amount, fromPrecision, toPrecision);
  }
  const num1 = reencodeAmount(amount.num1, fromPrecision, toPrecision);
  const num2 = reencodeAmount(amount.num2, fromPrecision, toPrecision);
  return num1 === null || num2 === null ? null : { num1, num2 };
}
