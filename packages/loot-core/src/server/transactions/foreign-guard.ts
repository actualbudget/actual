import * as db from '#server/db';
import { getBatchedValue } from '#server/sync';
import { amountPair } from '#server/sync/coupled-cells';

// Every transaction write reaches db.insertTransaction/updateTransaction,
// which run this guard so a foreign-currency account can never store a
// partial or relabelled base/native pair. CRDT messages from other devices
// are applied directly and are not re-validated here.

type AccountContext = {
  currency: string | null;
  precision: number | null;
  foreign: boolean;
};

type ExistingRow = {
  acct: string;
  description: string | null;
  transferred_id: string | null;
};

type TransactionWrite = {
  id?: string;
  account?: string;
  amount?: unknown;
  transaction_amount?: unknown;
  payee?: string | null;
  transfer_id?: string | null;
  amount_pair?: unknown;
};

// ponytail: per-row account lookup, add a per-batch cache if large imports
// measurably slow down.
async function accountContext(id: string): Promise<AccountContext | null> {
  const account = await db.first<
    Pick<db.DbAccount, 'currency' | 'currency_precision'>
  >('SELECT currency, currency_precision FROM accounts WHERE id = ?', [id]);
  // An account created earlier in the same batch is still queued.
  const queuedCurrency = getBatchedValue('accounts', id, 'currency');
  const queuedPrecision = getBatchedValue('accounts', id, 'currency_precision');
  if (!account && !queuedCurrency && !getBatchedValue('accounts', id, 'name')) {
    return null;
  }
  const currency =
    (queuedCurrency ? (queuedCurrency.value as string | null) : null) ??
    account?.currency ??
    null;
  const precision =
    (queuedPrecision ? (queuedPrecision.value as number | null) : null) ??
    account?.currency_precision ??
    null;
  return { currency, precision, foreign: currency !== null };
}

export async function isForeignAccount(id: string): Promise<boolean> {
  return (await accountContext(id))?.foreign ?? false;
}

/** Transactions store raw payee ids; merges redirect them through mappings. */
async function transferTarget(payeeId: string): Promise<string | null> {
  const payee = await db.first<Pick<db.DbPayee, 'transfer_acct'>>(
    `SELECT p.transfer_acct FROM payees p
       WHERE p.id = COALESCE(
         (SELECT targetId FROM payee_mapping WHERE id = ?), ?)`,
    [payeeId, payeeId],
  );
  return payee?.transfer_acct ?? null;
}

/** Returns the authority pair to write alongside the row, if any. */
export async function validateTransactionWrite(
  row: TransactionWrite,
  proposed: Map<string | undefined, TransactionWrite> = new Map(),
): Promise<{ pair?: string }> {
  if ('amount_pair' in row) {
    throw new Error('amount-pair-internal');
  }
  const existing = row.id
    ? await db.first<ExistingRow>(
        'SELECT acct, description, transferred_id FROM transactions WHERE id = ?',
        [row.id],
      )
    : null;
  // An insert reusing an existing id updates that row through sync, and an
  // update of a missing id inserts it, so the stored row decides.
  const isUpdate = existing !== null;
  const accountId = row.account ?? existing?.acct;
  if (!accountId) return {};
  const account = await accountContext(accountId);
  // An account that exists neither in the database nor in the current batch
  // cannot be foreign; the schema layer owns referential checks.
  if (!account) return {};

  if (existing && row.account !== undefined && row.account !== existing.acct) {
    const previous = await accountContext(existing.acct);
    // Native integers only keep their value under the same recorded encoding.
    if (
      (previous?.currency ?? null) !== account.currency ||
      (previous?.precision ?? null) !== account.precision
    ) {
      throw new Error('account-move-currency-mismatch');
    }
  }

  const payeeId = row.payee !== undefined ? row.payee : existing?.description;
  const targetAccount = payeeId ? await transferTarget(payeeId) : null;
  if (targetAccount) {
    const target = await accountContext(targetAccount);
    if (account.foreign || target?.foreign) {
      throw new Error('multicurrency-transfer-unavailable');
    }
  }
  // A counterpart link is part of the transfer relationship too.
  const counterpartId =
    row.transfer_id !== undefined ? row.transfer_id : existing?.transferred_id;
  if (counterpartId) {
    // The counterpart may be another row proposed in the same request.
    const counterpartAccount =
      proposed.get(counterpartId)?.account ??
      (
        await db.first<{ acct: string }>(
          'SELECT acct FROM transactions WHERE id = ?',
          [counterpartId],
        )
      )?.acct;
    if (
      account.foreign ||
      (counterpartAccount &&
        (await accountContext(counterpartAccount))?.foreign)
    ) {
      throw new Error('multicurrency-transfer-unavailable');
    }
  }

  if (!account.foreign) {
    if (row.transaction_amount != null) {
      throw new Error('native-amount-unexpected');
    }
    return {};
  }

  const setsAmount =
    row.amount !== undefined || row.transaction_amount !== undefined;
  if (isUpdate && !setsAmount) return {};
  if (
    !Number.isSafeInteger(row.amount) ||
    !Number.isSafeInteger(row.transaction_amount)
  ) {
    throw new Error('foreign-pair-required');
  }
  return {
    pair: amountPair(row.amount as number, row.transaction_amount as number),
  };
}

/** Validates a whole request before any of its writes or side effects. */
export async function preflightTransactionWrites({
  added = [],
  updated = [],
}: {
  added?: TransactionWrite[];
  updated?: TransactionWrite[];
}) {
  const addedIds = added.map(row => row.id).filter(Boolean);
  const updatedIds = updated.map(row => row.id).filter(Boolean);
  if (
    new Set(addedIds).size !== addedIds.length ||
    new Set(updatedIds).size !== updatedIds.length
  ) {
    throw new Error('transaction-id-duplicate');
  }
  // Validate the proposed state: an update of a row added in the same batch
  // is checked as that new row with the update applied.
  const addedById = new Map(added.map(row => [row.id, row]));
  const proposed = new Map<string | undefined, TransactionWrite>(
    added.map(row => [
      row.id,
      { ...row, ...updated.find(u => u.id === row.id) },
    ]),
  );
  for (const row of updated) {
    if (!addedById.has(row.id) && row.account !== undefined) {
      proposed.set(row.id, row);
    }
  }
  for (const row of proposed.values()) {
    if (addedById.has(row.id)) {
      await validateTransactionWrite(row, proposed);
    }
  }
  for (const row of updated) {
    if (!addedById.has(row.id)) {
      await validateTransactionWrite(row, proposed);
    }
  }
}

/**
 * Keeps both sides of a foreign pair in a diffed patch when either changed,
 * so callers that diff a full edit never send half a pair.
 */
export function completePairPatch<
  T extends { id: string; amount?: number; transaction_amount?: number | null },
>(patch: Partial<T>, full: T | undefined): Partial<T> {
  if (
    !full ||
    full.transaction_amount == null ||
    !('amount' in patch || 'transaction_amount' in patch)
  ) {
    return patch;
  }
  return {
    ...patch,
    amount: full.amount,
    transaction_amount: full.transaction_amount,
  };
}
