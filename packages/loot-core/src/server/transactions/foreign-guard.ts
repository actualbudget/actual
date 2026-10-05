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
  id: string;
  acct: string;
  description: string | null;
  transferred_id: string | null;
  amount: number;
  transaction_amount: number | null;
  isParent: number;
  isChild: number;
  parent_id: string | null;
  schedule: string | null;
  category: string | null;
  date: number;
  tombstone: number;
};

/**
 * Writes trusted to skip transfer relationship rules: `validatedTransfer`
 * for writers that validated the whole transfer request first (the exchange
 * handler, and foreign entry writing both legs of a same-encoding transfer),
 * and `transferCleanup` for forced account deletion unlinking counterparts
 * of rows it deletes in the same batch.
 */
export type TransactionWriteOptions = {
  validatedTransfer?: boolean;
  transferCleanup?: boolean;
  /**
   * False when a batch writes links without the transfer hooks, so payees
   * must already agree with the links in the request's final state.
   */
  runTransfers?: boolean;
};

type TransactionWrite = {
  id?: string;
  account?: string;
  amount?: unknown;
  transaction_amount?: unknown;
  payee?: string | null;
  transfer_id?: string | null;
  date?: string;
  category?: string | null;
  amount_pair?: unknown;
  schedule?: string | null;
  tombstone?: boolean | number;
  is_parent?: boolean;
  is_child?: boolean;
  parent_id?: string | null;
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

/** An account inserted earlier in the current batch and not stored yet. */
export function queuedAccount(id: string): db.DbAccount | null {
  const name = getBatchedValue('accounts', id, 'name');
  if (!name) {
    return null;
  }
  const value = (column: string) =>
    getBatchedValue('accounts', id, column)?.value;
  const currency = value('currency');
  const precision = value('currency_precision');
  return {
    id,
    name: String(name.value),
    offbudget: value('offbudget') === 1 ? 1 : 0,
    closed: 0,
    tombstone: 0,
    sort_order: 0,
    currency: typeof currency === 'string' ? currency : null,
    currency_precision: typeof precision === 'number' ? precision : null,
  };
}

/** A foreign account's recorded currency, including one queued in a batch. */
export async function foreignAccountCurrency(
  id: string,
): Promise<{ currencyCode: string; precision: number } | null> {
  const context = await accountContext(id);
  if (!context?.foreign || context.currency === null) {
    return null;
  }
  if (context.precision === null) {
    throw new Error('account-currency-precision-missing');
  }
  return { currencyCode: context.currency, precision: context.precision };
}

/** An account's recorded encoding: currency (null for base) and precision. */
export async function accountEncoding(
  id: string | null | undefined,
): Promise<{ currency: string | null; precision: number | null }> {
  const context = id ? await accountContext(id) : null;
  return context?.foreign
    ? { currency: context.currency, precision: context.precision }
    : { currency: null, precision: null };
}

export function sameEncoding(
  a: { currency: string | null; precision: number | null },
  b: { currency: string | null; precision: number | null },
) {
  return a.currency === b.currency && a.precision === b.precision;
}

/** A rule's schedule account condition (as in `extractScheduleConds`). */
export function scheduleConditionAccount(
  conditions: Array<{ op?: string; field?: string; value?: unknown }>,
): string | null {
  const account =
    conditions.find(cond => cond.op === 'is' && cond.field === 'account') ??
    conditions.find(cond => cond.op === 'is' && cond.field === 'acct');
  return typeof account?.value === 'string' ? account.value : null;
}

/** The account a schedule's owning rule names, if any. */
export async function scheduleAccountId(
  scheduleId: string,
): Promise<string | null> {
  const row = await db.first<{ conditions: string | null }>(
    `SELECT r.conditions FROM schedules s JOIN rules r ON r.id = s.rule
       WHERE s.id = ?`,
    [scheduleId],
  );
  return row?.conditions
    ? scheduleConditionAccount(JSON.parse(row.conditions))
    : null;
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

function storedRow(id: string) {
  return db.first<ExistingRow>(
    `SELECT id, acct, description, transferred_id, amount, transaction_amount,
       isParent, isChild, parent_id, schedule, category, date, tombstone
       FROM transactions WHERE id = ?`,
    [id],
  );
}

const ROW_COLUMNS = [
  'acct',
  'description',
  'transferred_id',
  'amount',
  'transaction_amount',
  'isParent',
  'isChild',
  'parent_id',
  'schedule',
  'category',
  'date',
  'tombstone',
] as const;

/**
 * A counterpart row as the current batch will leave it: transfer hooks write
 * one leg and then link the other inside a single batch.
 */
async function effectiveRow(id: string): Promise<ExistingRow | null> {
  const stored = await storedRow(id);
  const queued = ROW_COLUMNS.flatMap(column => {
    const value = getBatchedValue('transactions', id, column);
    return value ? [[column, value.value] as const] : [];
  });
  if (!stored && queued.length === 0) return null;
  const row: Record<string, unknown> = {
    id,
    acct: null,
    description: null,
    transferred_id: null,
    amount: 0,
    transaction_amount: null,
    isParent: 0,
    isChild: 0,
    parent_id: null,
    schedule: null,
    category: null,
    date: 0,
    tombstone: 0,
    ...stored,
  };
  for (const [column, value] of queued) {
    row[column] = value;
  }
  return row as ExistingRow;
}

function encodingOf(account: AccountContext | null) {
  return account?.foreign
    ? { currency: account.currency, precision: account.precision }
    : { currency: null, precision: null };
}

/** A stored row linked to a live counterpart in another encoding. */
async function isExchangeLeg(row: ExistingRow): Promise<boolean> {
  if (!row.transferred_id) return false;
  const counterpart = await effectiveRow(row.transferred_id);
  if (!counterpart || counterpart.tombstone) return false;
  return !sameEncoding(
    encodingOf(await accountContext(row.acct)),
    encodingOf(await accountContext(counterpart.acct)),
  );
}

/** A split family holding an exchange leg, so its fee rows are frozen too. */
export async function isExchangeFamily(
  parentId: string | null,
): Promise<boolean> {
  if (!parentId) return false;
  const children = await db.all<ExistingRow>(
    `SELECT id, acct, description, transferred_id, amount, transaction_amount,
       isParent, isChild, parent_id, schedule, category, date, tombstone
       FROM transactions WHERE parent_id = ? AND tombstone = 0`,
    [parentId],
  );
  for (const child of children) {
    if (await isExchangeLeg(child)) return true;
  }
  return false;
}

/** True when a stored row is an exchange leg or in an exchange fee family. */
export async function isExchangeRow(id: string): Promise<boolean> {
  const row = await storedRow(id);
  if (!row) return false;
  return (
    (await isExchangeLeg(row)) ||
    (await isExchangeFamily(
      row.isParent ? row.id : row.isChild ? row.parent_id : null,
    ))
  );
}

/**
 * Transfer relationship rules for rows touching a foreign account. Exchange
 * transfers are created only by the exchange handler and stay frozen apart
 * from metadata; same-encoding transfers work like base transfers, with
 * links checked for conservation and ownership.
 */
async function validateForeignTransfer(
  row: TransactionWrite,
  existing: ExistingRow | null,
  accountId: string,
  account: AccountContext,
  proposed: Map<string | undefined, TransactionWrite>,
  options: TransactionWriteOptions,
) {
  const payeeChanged =
    existing !== null &&
    row.payee !== undefined &&
    row.payee !== (existing.description ?? null);
  const payeeId = row.payee !== undefined ? row.payee : existing?.description;
  // Resolved before the trusted return too, which keeps the write order of
  // concurrent batched inserts stable.
  const targetAccount = payeeId ? await transferTarget(payeeId) : null;
  if (options.validatedTransfer) return;

  // Every row of a stored exchange (legs, fee children and parents, in base
  // or foreign accounts) shares one valuation and is frozen until MC-5.
  if (existing && (await isExchangeRow(existing.id))) {
    const changes = (value: unknown, stored: unknown) =>
      value !== undefined && value !== stored;
    if (
      changes(row.account, existing.acct) ||
      changes(row.amount, existing.amount) ||
      changes(row.transaction_amount, existing.transaction_amount) ||
      (row.date !== undefined &&
        row.date.replaceAll('-', '') !== String(existing.date)) ||
      // A leg is never relinked to another transfer payee.
      (payeeChanged && targetAccount !== null)
    ) {
      throw new Error('exchange-transfer-edit-unavailable');
    }
    if (
      row.category !== undefined &&
      row.category !== null &&
      row.category !== existing.category &&
      !(await exchangeCategoryAllowed(existing))
    ) {
      throw new Error('exchange-transfer-edit-unavailable');
    }
  }

  const target = targetAccount ? await accountContext(targetAccount) : null;
  const counterpartId =
    row.transfer_id !== undefined ? row.transfer_id : existing?.transferred_id;
  const counterpartStored = counterpartId
    ? await effectiveRow(counterpartId)
    : null;
  const counterpartProposed = counterpartId
    ? proposed.get(counterpartId)
    : undefined;
  const counterpartAccountId =
    counterpartProposed?.account ?? counterpartStored?.acct ?? null;
  const counterpartAccount = counterpartAccountId
    ? await accountContext(counterpartAccountId)
    : null;

  // The stored relationship counts too: a write may be clearing it.
  const storedCounterpart =
    existing?.transferred_id && existing.transferred_id !== counterpartId
      ? await effectiveRow(existing.transferred_id)
      : null;
  const storedCounterpartAccount = storedCounterpart
    ? await accountContext(storedCounterpart.acct)
    : null;

  // Base-to-base transfers keep their existing behavior.
  if (
    !account.foreign &&
    !target?.foreign &&
    !counterpartAccount?.foreign &&
    !storedCounterpartAccount?.foreign
  ) {
    return;
  }

  const own = encodingOf(account);
  const crossTarget = target !== null && !sameEncoding(own, encodingOf(target));
  const crossCounterpart =
    counterpartAccount !== null &&
    !sameEncoding(own, encodingOf(counterpartAccount));

  // Exchanges need two amounts and a valuation: only the exchange handler
  // creates them.
  if (crossTarget && (!existing || payeeChanged)) {
    throw new Error('multicurrency-transfer-unavailable');
  }

  const transferIdChanged =
    row.transfer_id !== undefined &&
    (row.transfer_id ?? null) !== (existing?.transferred_id ?? null);
  if (transferIdChanged && row.transfer_id == null) {
    if (!existing || !(await isExchangeLeg(existing))) return;
    if (options.transferCleanup) return;
    // A link is cleared only once the relationship is broken in stored
    // state, as removeTransfer does after a deletion or payee change.
    const previous = existing.transferred_id
      ? await effectiveRow(existing.transferred_id)
      : null;
    const broken =
      existing.tombstone === 1 ||
      !existing.description ||
      (await transferTarget(existing.description)) === null ||
      !previous ||
      previous.tombstone === 1 ||
      !previous.description ||
      (await transferTarget(previous.description)) !== existing.acct;
    if (!broken) {
      throw new Error('exchange-transfer-edit-unavailable');
    }
    return;
  }

  // A supplied link, changed or not, is checked for conservation and
  // ownership; an unchanged exchange link was checked by the freeze above.
  if (row.transfer_id == null) return;
  if (!transferIdChanged && existing && (await isExchangeLeg(existing))) {
    return;
  }
  if (crossCounterpart || crossTarget) {
    throw new Error('multicurrency-transfer-unavailable');
  }
  if (!counterpartAccountId) {
    throw new Error('transfer-counterpart-invalid');
  }
  const counterpartPayee =
    counterpartProposed?.payee !== undefined
      ? counterpartProposed.payee
      : counterpartStored?.description;
  const counterpartLink =
    counterpartProposed?.transfer_id !== undefined
      ? counterpartProposed.transfer_id
      : counterpartStored?.transferred_id;
  if (
    targetAccount !== counterpartAccountId ||
    !counterpartPayee ||
    (await transferTarget(counterpartPayee)) !== accountId ||
    (counterpartLink != null && counterpartLink !== row.id)
  ) {
    throw new Error('transfer-counterpart-invalid');
  }
  const amount = row.amount !== undefined ? row.amount : existing?.amount;
  const native =
    row.transaction_amount !== undefined
      ? row.transaction_amount
      : existing?.transaction_amount;
  const counterpartAmount =
    counterpartProposed?.amount !== undefined
      ? counterpartProposed.amount
      : counterpartStored?.amount;
  const counterpartNative =
    counterpartProposed?.transaction_amount !== undefined
      ? counterpartProposed.transaction_amount
      : counterpartStored?.transaction_amount;
  if (
    typeof amount !== 'number' ||
    typeof native !== 'number' ||
    counterpartAmount !== -amount ||
    counterpartNative !== -native
  ) {
    throw new Error('transfer-amount-mismatch');
  }
}

async function isOffBudget(accountId: string) {
  return (
    (
      await db.first<Pick<db.DbAccount, 'offbudget'>>(
        'SELECT offbudget FROM accounts WHERE id = ?',
        [accountId],
      )
    )?.offbudget === 1
  );
}

/**
 * Categories an exchange row may carry, as for transfers: parents none, an
 * on/off-budget transfer leg only on its on-budget side, a fee child only in
 * an on-budget account.
 */
async function exchangeCategoryAllowed(row: ExistingRow): Promise<boolean> {
  if (row.isParent || (await isOffBudget(row.acct))) return false;
  if (!row.transferred_id) return true;
  const counterpart = await effectiveRow(row.transferred_id);
  return !!counterpart && (await isOffBudget(counterpart.acct));
}

/** Returns the authority pair to write alongside the row, if any. */
export async function validateTransactionWrite(
  row: TransactionWrite,
  proposed: Map<string | undefined, TransactionWrite> = new Map(),
  options: TransactionWriteOptions = {},
): Promise<{ pair?: string }> {
  if ('amount_pair' in row) {
    throw new Error('amount-pair-internal');
  }
  // A row queued earlier in the current batch is existing state too.
  const existing = row.id ? await effectiveRow(row.id) : null;
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

  // A schedule's amounts are in its account's encoding (none: base), so a
  // transaction only marks occurrences of a schedule in its own encoding.
  // The effective link is checked, including one kept from the stored row.
  const scheduleId =
    row.schedule !== undefined ? row.schedule : (existing?.schedule ?? null);
  if (scheduleId != null) {
    const scheduleAccount = await scheduleAccountId(scheduleId);
    if (
      scheduleAccount !== null &&
      !sameEncoding(await accountEncoding(scheduleAccount), {
        currency: account.foreign ? account.currency : null,
        precision: account.foreign ? account.precision : null,
      })
    ) {
      throw new Error('schedule-currency-mismatch');
    }
  }

  await validateForeignTransfer(
    row,
    existing,
    accountId,
    account,
    proposed,
    options,
  );

  // A fee family of an exchange keeps its structure, base accounts included.
  const changesFamily = existing
    ? (row.is_parent !== undefined &&
        !!row.is_parent !== !!existing.isParent) ||
      (row.is_child !== undefined && !!row.is_child !== !!existing.isChild) ||
      (row.parent_id !== undefined &&
        (row.parent_id ?? null) !== (existing.parent_id ?? null))
    : !!row.is_parent || !!row.is_child || !!row.parent_id;
  if (
    changesFamily &&
    !options.validatedTransfer &&
    ((existing &&
      (await isExchangeFamily(
        existing.isParent ? existing.id : existing.parent_id,
      ))) ||
      (await isExchangeFamily(row.parent_id ?? null)))
  ) {
    throw new Error('foreign-split-unavailable');
  }

  if (!account.foreign) {
    if (row.transaction_amount != null) {
      throw new Error('native-amount-unexpected');
    }
    return {};
  }

  // Foreign splits arrive with foreign edits (MC-5): no family may be
  // created or restructured, while metadata edits of a family stay allowed.
  // The exchange handler writes its validated fee families.
  if (changesFamily && !options.validatedTransfer) {
    throw new Error('foreign-split-unavailable');
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
  // Stored foreign pairs are frozen until foreign edits (MC-5).
  if (
    existing &&
    ((row.amount !== undefined && row.amount !== existing.amount) ||
      (row.transaction_amount !== undefined &&
        row.transaction_amount !== existing.transaction_amount))
  ) {
    throw new Error('foreign-edit-unavailable');
  }
  return {
    pair: amountPair(row.amount as number, row.transaction_amount as number),
  };
}

/** Validates a whole request before any of its writes or side effects. */
export async function preflightTransactionWrites(
  {
    added = [],
    updated = [],
    deleted = [],
  }: {
    added?: TransactionWrite[];
    updated?: TransactionWrite[];
    deleted?: Array<{ id: string }>;
  },
  options: TransactionWriteOptions = {},
) {
  // Deleting part of a foreign split family restructures it (MC-5); a whole
  // family (its parent, which removes the children) may be deleted.
  // Tombstoning through an update (API, rule actions) deletes too.
  const removed = [
    ...deleted,
    ...updated.filter(
      (row): row is TransactionWrite & { id: string } =>
        row.id !== undefined && (row.tombstone === true || row.tombstone === 1),
    ),
  ];
  const deletedIds = new Set(removed.map(row => row.id));
  for (const { id } of removed) {
    const child = await db.first<{ acct: string; parent_id: string | null }>(
      'SELECT acct, parent_id FROM transactions WHERE id = ? AND isChild = 1',
      [id],
    );
    if (
      child?.parent_id &&
      !deletedIds.has(child.parent_id) &&
      ((await isForeignAccount(child.acct)) ||
        (await isExchangeFamily(child.parent_id)))
    ) {
      throw new Error('foreign-split-unavailable');
    }
  }

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
    if (!addedById.has(row.id)) {
      proposed.set(row.id, row);
    }
  }
  for (const row of proposed.values()) {
    if (addedById.has(row.id)) {
      await validateTransactionWrite(row, proposed, options);
    }
  }
  for (const row of updated) {
    if (!addedById.has(row.id)) {
      await validateTransactionWrite(row, proposed, options);
    }
  }

  // A transfer link touching a foreign account must be reciprocal, and its
  // counterpart must survive, in the request's final state. The per-row
  // guard cannot require this because addTransfer writes the two links one
  // after the other.
  const isRemoved = (
    id: string,
    write: TransactionWrite | undefined,
    stored: ExistingRow | null,
  ) =>
    deletedIds.has(id) ||
    !!write?.tombstone ||
    (write?.tombstone === undefined && stored?.tombstone === 1) ||
    (!!stored?.parent_id && deletedIds.has(stored.parent_id));
  for (const row of proposed.values()) {
    if (row.id === undefined) continue;
    const stored = await storedRow(row.id);
    const link =
      row.transfer_id !== undefined ? row.transfer_id : stored?.transferred_id;
    if (link == null || isRemoved(row.id, row, stored)) continue;
    // Only links this request sets, or rows whose payee or account it
    // changes without the hooks to follow up, are checked.
    const setsLink = row.transfer_id != null;
    const changesEnds =
      options.runTransfers === false &&
      (row.payee !== undefined || row.account !== undefined);
    if (!setsLink && !changesEnds) continue;

    const counterpart = proposed.get(link);
    const counterpartStored = await storedRow(link);
    const accountId = row.account ?? stored?.acct;
    const counterpartAccountId =
      counterpart?.account ?? counterpartStored?.acct;
    if (
      !(accountId && (await isForeignAccount(accountId))) &&
      !(counterpartAccountId && (await isForeignAccount(counterpartAccountId)))
    ) {
      continue;
    }
    const counterpartLink =
      counterpart?.transfer_id !== undefined
        ? counterpart.transfer_id
        : counterpartStored?.transferred_id;
    if (
      counterpartLink !== row.id ||
      isRemoved(link, counterpart, counterpartStored)
    ) {
      throw new Error('transfer-counterpart-invalid');
    }
    if (options.runTransfers === false) {
      const payee = row.payee !== undefined ? row.payee : stored?.description;
      const counterpartPayee =
        counterpart?.payee !== undefined
          ? counterpart.payee
          : counterpartStored?.description;
      if (
        !payee ||
        !counterpartPayee ||
        (await transferTarget(payee)) !== counterpartAccountId ||
        (await transferTarget(counterpartPayee)) !== accountId
      ) {
        throw new Error('transfer-counterpart-invalid');
      }
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
