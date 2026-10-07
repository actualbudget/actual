import * as db from '#server/db';
import { computeEntryPair, writeManualRate } from '#server/exchange-rates/app';
import { batchMessages } from '#server/sync';
import { withUndo } from '#server/undo';
import { getAccountCurrency } from '#server/util/currency';
import type { TransactionEntity } from '#types/models';

import {
  accountEncoding,
  preflightTransactionWrites,
  sameEncoding,
  transferTarget,
} from './foreign-guard';
import type { ForeignEdit } from './foreign-guard';

import { clearDisallowedCategory } from './index';

type Expected = ForeignEdit['expected'];

/** A row update that may also clear the schedule link. */
type RowUpdate = Omit<Partial<TransactionEntity>, 'schedule'> & {
  id: string;
  schedule?: string | null;
};

type StoredRow = {
  id: string;
  acct: string;
  amount: number;
  transaction_amount: number | null;
  date: number;
  isParent: number;
  isChild: number;
  transferred_id: string | null;
  schedule: string | null;
  tombstone: number;
};

type PairInput = {
  baseAmount?: number;
  rate?: string | number;
  replaceRate?: boolean;
  /** Also save the supplied rate as a standing rate from this date. */
  saveStanding?: boolean;
  /** Base shown to the user for a supplied rate; a mismatch asks again. */
  expectedBaseAmount?: number;
};

type PairFailure =
  | { status: 'stale' }
  | { status: 'rate-unavailable'; date: string }
  | { status: 'base-changed'; baseAmount: number }
  | Exclude<
      Awaited<ReturnType<typeof computeEntryPair>>,
      { status: 'ok' } | { status: 'rate-unavailable' }
    >;

async function liveRow(id: string): Promise<StoredRow> {
  const row = await db.first<StoredRow>(
    `SELECT id, acct, amount, transaction_amount, date, isParent, isChild,
       transferred_id, schedule, tombstone
       FROM transactions WHERE id = ?`,
    [id],
  );
  if (!row || row.tombstone) throw new Error('transaction-not-found');
  return row;
}

/**
 * The single transaction an edit or move may rewrite: top-level, not split,
 * not a transfer leg (linked rows are edited as families in MC-5.2).
 */
function assertSingle(row: StoredRow) {
  if (row.isParent || row.isChild) throw new Error('foreign-split-unavailable');
  if (row.transferred_id) throw new Error('foreign-transfer-edit-unavailable');
}

const EDITABLE_FIELDS = ['date', 'payee', 'notes', 'category', 'cleared'];

/**
 * The editable fields of a request, read from a fixed list: handler
 * payloads are not type-checked at runtime, and the row id never comes
 * from them. A transfer payee would need a counterpart (MC-5.2).
 */
async function editableFields(fields: Record<string, unknown>) {
  const picked = Object.fromEntries(
    Object.entries(fields).filter(([key]) => EDITABLE_FIELDS.includes(key)),
  );
  // Resolved through payee merges, as the guard does.
  if (
    typeof picked.payee === 'string' &&
    (await transferTarget(picked.payee)) !== null
  ) {
    throw new Error('foreign-transfer-edit-unavailable');
  }
  return picked;
}

function matches(row: StoredRow, expected: Expected) {
  return (
    row.acct === expected.account &&
    row.amount === expected.amount &&
    (row.transaction_amount ?? null) === expected.transaction_amount &&
    String(row.date) === expected.date.replaceAll('-', '')
  );
}

/**
 * The final pair for a native amount in a foreign account: a supplied base,
 * else a typed rate (saved as that day's rate, and as a standing rate when
 * asked), else the saved rate for the date. A zero native amount takes base
 * 0 unless a base is supplied.
 */
async function pairFor(
  accountId: string,
  native: number,
  date: string,
  input: PairInput,
): Promise<
  | {
      status: 'ok';
      amount: number;
      pendingRates?: Array<Parameters<typeof writeManualRate>[0]>;
    }
  | PairFailure
> {
  const account = await getAccountCurrency(accountId);
  const pair = await computeEntryPair({
    quoteCurrency: account.currencyCode,
    nativePrecision: account.precision,
    date,
    nativeAmount: native,
    baseAmount: input.baseAmount,
    rate: input.rate,
    replaceRate: input.replaceRate,
    saveStanding: input.saveStanding,
  });
  if (pair.status === 'rate-unavailable') {
    return { status: 'rate-unavailable', date };
  }
  if (pair.status !== 'ok') return pair;
  if (
    input.rate !== undefined &&
    input.expectedBaseAmount !== undefined &&
    pair.baseAmount !== input.expectedBaseAmount
  ) {
    return { status: 'base-changed', baseAmount: pair.baseAmount };
  }
  return {
    status: 'ok',
    amount: pair.baseAmount,
    pendingRates: pair.pendingRates,
  };
}

async function write(
  update: RowUpdate,
  edit: ForeignEdit,
  pendingRates: Array<Parameters<typeof writeManualRate>[0]> | undefined,
) {
  const foreignEdits = new Map([[update.id, edit]]);
  await preflightTransactionWrites({ updated: [update] }, { foreignEdits });
  await withUndo(() =>
    batchMessages(async () => {
      if (pendingRates) {
        for (const pending of pendingRates) {
          await writeManualRate(pending);
        }
      }
      await db.updateTransaction(update, { foreignEdits });
    }),
  );
}

/**
 * Edits a single foreign transaction's amounts and fields, writing the
 * final pair: rate edits never reprice stored rows, only this does.
 */
export async function updateForeignEntry({
  id,
  expected,
  transaction_amount,
  baseAmount,
  rate,
  replaceRate,
  saveStanding,
  expectedBaseAmount,
  fields = {},
}: {
  id: string;
  /** The stored row as the editor saw it. */
  expected: Expected;
  transaction_amount?: number;
  fields?: Partial<
    Pick<TransactionEntity, 'date' | 'payee' | 'notes' | 'category' | 'cleared'>
  >;
} & PairInput): Promise<{ status: 'ok' } | PairFailure> {
  const row = await liveRow(id);
  if (!matches(row, expected)) return { status: 'stale' };
  assertSingle(row);
  if ((await accountEncoding(row.acct)).currency === null) {
    throw new Error('foreign-account-required');
  }
  const picked = await editableFields(fields);
  const date =
    typeof picked.date === 'string' ? picked.date : db.fromDateRepr(row.date);
  const native = transaction_amount ?? row.transaction_amount;
  if (native == null) throw new Error('foreign-pair-required');

  // A date change alone keeps the confirmed pair.
  let amount = row.amount;
  let pendingRates: Array<Parameters<typeof writeManualRate>[0]> | undefined;
  if (transaction_amount !== undefined || baseAmount !== undefined) {
    const pair = await pairFor(row.acct, native, date, {
      baseAmount,
      rate,
      replaceRate,
      saveStanding,
      expectedBaseAmount,
    });
    if (pair.status !== 'ok') return pair;
    amount = pair.amount;
    pendingRates = pair.pendingRates;
  }
  await write(
    { ...picked, id, amount, transaction_amount: native },
    { expected, account: row.acct, amount, transaction_amount: native },
    pendingRates,
  );
  return { status: 'ok' };
}

/**
 * Moves a single transaction to an account in another encoding with its
 * confirmed amount there, never relabeling the source integers. The base
 * comes from a supplied base, a typed rate or the destination's saved rate;
 * a budget-currency destination's amount is its base.
 */
export async function moveForeignEntry({
  id,
  account,
  expected,
  transaction_amount,
  baseAmount,
  rate,
  replaceRate,
  saveStanding,
  expectedBaseAmount,
}: {
  id: string;
  account: string;
  expected: Expected;
  /** The confirmed amount in the destination's encoding. */
  transaction_amount: number;
} & PairInput): Promise<
  | {
      status: 'ok';
      baseBefore: number;
      baseAfter: number;
      scheduleUnlinked: boolean;
    }
  | PairFailure
> {
  const row = await liveRow(id);
  if (!matches(row, expected)) return { status: 'stale' };
  assertSingle(row);
  const destination = await db.first<Pick<db.DbAccount, 'id' | 'offbudget'>>(
    'SELECT id, offbudget FROM accounts WHERE id = ? AND tombstone = 0',
    [account],
  );
  if (!destination) throw new Error('account-not-found');
  const target = await accountEncoding(account);
  if (sameEncoding(await accountEncoding(row.acct), target)) {
    throw new Error('move-not-cross-encoding');
  }
  if (!Number.isSafeInteger(transaction_amount)) {
    throw new Error('foreign-pair-required');
  }
  const date = db.fromDateRepr(row.date);

  let amount = transaction_amount;
  let native: number | null = null;
  let pendingRates: Array<Parameters<typeof writeManualRate>[0]> | undefined;
  if (target.currency !== null) {
    const pair = await pairFor(account, transaction_amount, date, {
      baseAmount,
      rate,
      replaceRate,
      saveStanding,
      expectedBaseAmount,
    });
    if (pair.status !== 'ok') return pair;
    amount = pair.amount;
    native = transaction_amount;
    pendingRates = pair.pendingRates;
  }

  // The row can no longer be an occurrence of a schedule in another
  // encoding; the guard checks schedule encodings.
  let scheduleUnlinked = false;
  if (row.schedule) {
    const scheduleAccount = await db.first<{ value: string | null }>(
      `SELECT json_extract(c.value, '$.value') AS value
         FROM schedules s JOIN rules r ON r.id = s.rule,
           json_each(r.conditions) c
         WHERE s.id = ? AND json_extract(c.value, '$.field') = 'account'
           AND json_extract(c.value, '$.op') = 'is'`,
      [row.schedule],
    );
    scheduleUnlinked =
      !scheduleAccount?.value ||
      !sameEncoding(await accountEncoding(scheduleAccount.value), target);
  }
  // A budget-currency row has no native amount.
  const update: RowUpdate = {
    id,
    account,
    amount,
    transaction_amount: native,
    ...(scheduleUnlinked && { schedule: null }),
  };
  clearDisallowedCategory(update, destination);
  await write(
    update,
    { expected, account, amount, transaction_amount: native },
    pendingRates,
  );
  return {
    status: 'ok',
    baseBefore: row.amount,
    baseAfter: amount,
    scheduleUnlinked,
  };
}
