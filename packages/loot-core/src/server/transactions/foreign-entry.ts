import { v4 as uuidv4 } from 'uuid';

import * as db from '#server/db';
import { computeEntryPair, writeManualRate } from '#server/exchange-rates/app';
import { batchMessages } from '#server/sync';
import { withUndo } from '#server/undo';
import { getAccountCurrency } from '#server/util/currency';
import type { TransactionEntity } from '#types/models';

import { preflightTransactionWrites } from './foreign-guard';
import { runRules } from './transaction-rules';

import { clearDisallowedCategory } from './index';

type ForeignDraft = Omit<TransactionEntity, 'amount' | 'transaction_amount'> & {
  transaction_amount: number;
  /** A payee typed during entry, created only if the entry posts. */
  payee_name?: string;
};

/**
 * Posts one new foreign transaction atomically: computes the frozen pair,
 * runs rules on the completed pair with staged payees, and writes the rate,
 * payees and transaction together, or nothing.
 */
export async function postForeignEntry({
  transaction,
  baseAmount,
  rate,
  replaceRate = false,
  saveStanding = false,
  expectedBaseAmount,
}: {
  transaction: ForeignDraft;
  baseAmount?: number;
  rate?: string | number;
  replaceRate?: boolean;
  /** Also save the supplied rate as a standing rate from this date. */
  saveStanding?: boolean;
  /** Base shown to the user for a supplied rate; a mismatch asks again. */
  expectedBaseAmount?: number;
}): Promise<
  | { status: 'ok'; id: string }
  | Exclude<Awaited<ReturnType<typeof computeEntryPair>>, { status: 'ok' }>
  | { status: 'base-changed'; baseAmount: number }
  | { status: 'rule-account-incompatible' }
  | { status: 'rule-date-changed'; date: string }
> {
  // Foreign splits arrive with MC-5; one row is posted here, so a split
  // would lose its children.
  if (
    transaction.is_parent ||
    transaction.is_child ||
    transaction.parent_id ||
    transaction.subtransactions?.length
  ) {
    throw new Error('foreign-split-unavailable');
  }
  const account = await getAccountCurrency(transaction.account);
  const pair = await computeEntryPair({
    quoteCurrency: account.currencyCode,
    nativePrecision: account.precision,
    date: transaction.date,
    nativeAmount: transaction.transaction_amount,
    baseAmount,
    rate,
    replaceRate,
    saveStanding,
  });
  if (pair.status !== 'ok') return pair;
  if (
    rate !== undefined &&
    expectedBaseAmount !== undefined &&
    pair.baseAmount !== expectedBaseAmount
  ) {
    return { status: 'base-changed', baseAmount: pair.baseAmount };
  }

  // Payees named during entry or by rules are staged and created only
  // after validation.
  const stagedPayees = new Map<string, { id: string; name: string }>();
  const stagePayee = async (name: string) => {
    const key = name.toLowerCase();
    const staged = stagedPayees.get(key) ?? { id: uuidv4(), name };
    stagedPayees.set(key, staged);
    return staged.id;
  };
  const { payee_name: payeeName, ...fields } = transaction;
  const entryPayee = payeeName?.trim()
    ? ((await db.getPayeeByName(payeeName.trim()))?.id ??
      (await stagePayee(payeeName.trim())))
    : fields.payee;
  const ruled = await runRules(
    {
      ...fields,
      payee: entryPayee,
      // A staged payee is not in the database yet; rules still see its name.
      ...(payeeName?.trim() && { payee_name: payeeName.trim() }),
      id: fields.id || uuidv4(),
      amount: pair.baseAmount,
      transaction_amount: pair.nativeAmount,
    },
    null,
    undefined,
    stagePayee,
  );

  // The pair was captured for this account encoding and date.
  if (ruled.account !== transaction.account) {
    const moved = await getAccountCurrency(ruled.account);
    if (
      moved.currencyCode !== account.currencyCode ||
      moved.precision !== account.precision
    ) {
      return { status: 'rule-account-incompatible' };
    }
  }
  if (ruled.date !== transaction.date) {
    return { status: 'rule-date-changed', date: ruled.date };
  }

  const final = {
    ...ruled,
    amount: pair.baseAmount,
    transaction_amount: pair.nativeAmount,
  };
  clearDisallowedCategory(
    final,
    await db.first<Pick<db.DbAccount, 'offbudget'>>(
      'SELECT offbudget FROM accounts WHERE id = ?',
      [final.account],
    ),
  );
  await preflightTransactionWrites({ added: [final] });

  await withUndo(() =>
    batchMessages(async () => {
      if (pair.pendingRates) {
        for (const pending of pair.pendingRates) {
          await writeManualRate(pending);
        }
      }
      for (const payee of stagedPayees.values()) {
        if (final.payee === payee.id) {
          await db.insertPayee(payee);
        }
      }
      // Validated above; insert in the same batch as the rate and payees.
      await db.insertTransaction(final);
    }),
  );
  return { status: 'ok', id: final.id };
}
