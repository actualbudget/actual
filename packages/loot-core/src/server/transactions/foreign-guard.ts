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
  amount_pair: string | null;
};

/** A row as an edit handler read it. */
export type ForeignEditExpected = {
  account: string;
  amount: number;
  transaction_amount: number | null;
  date: string;
};

/** The exact values an edit handler computed for a row. */
export type ForeignEditFinal = {
  account: string;
  amount: number;
  transaction_amount: number | null;
  /** Set when the edit changes the date. */
  date?: string;
  /** Set when the edit creates the row or changes its family. */
  structure?: {
    is_parent: boolean;
    is_child: boolean;
    parent_id: string | null;
    transfer_id: string | null;
  };
};

/**
 * What an edit handler may do to one row: update it from the state it read
 * to exact final values, create it with exact values, or delete it as read.
 */
export type ForeignEdit =
  | { action: 'update'; expected: ForeignEditExpected; final: ForeignEditFinal }
  | { action: 'create'; final: ForeignEditFinal }
  | { action: 'delete'; expected: ForeignEditExpected };

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
  /**
   * Legs of fee-free scheduled exchanges whose amount an import replaces
   * (`replaceExchangeTotal`); only their amounts may change.
   */
  exchangeReplacements?: ReadonlySet<string>;
  /**
   * Rows an edit or move handler rewrites (`foreign-edit.ts`); a changed
   * pair or cross-encoding account is allowed only for these exact values.
   */
  foreignEdits?: ReadonlyMap<string, ForeignEdit>;
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
export async function transferTarget(payeeId: string): Promise<string | null> {
  const payee = await db.first<Pick<db.DbPayee, 'transfer_acct'>>(
    `SELECT p.transfer_acct FROM payees p
       WHERE p.id = COALESCE(
         (SELECT targetId FROM payee_mapping WHERE id = ?), ?)`,
    [payeeId, payeeId],
  );
  if (payee) return payee.transfer_acct ?? null;
  // A transfer payee created earlier in the current batch is still queued.
  const queued = getBatchedValue('payees', payeeId, 'transfer_acct');
  return typeof queued?.value === 'string' ? queued.value : null;
}

function storedRow(id: string) {
  return db.first<ExistingRow>(
    `SELECT id, acct, description, transferred_id, amount, transaction_amount,
       isParent, isChild, parent_id, schedule, category, date, tombstone,
       amount_pair
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
  'amount_pair',
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
    amount_pair: null,
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
  // or foreign accounts) shares one valuation and is frozen until MC-5,
  // apart from the amount of a leg an import replaces.
  if (existing && (await isExchangeRow(existing.id))) {
    const changes = (value: unknown, stored: unknown) =>
      value !== undefined && value !== stored;
    const replacing =
      allowedForeignEdit(row, existing, options) ||
      (await allowedReplacement(row, existing, options));
    if (
      changes(row.account, existing.acct) ||
      (!replacing && changes(row.amount, existing.amount)) ||
      (!replacing &&
        changes(row.transaction_amount, existing.transaction_amount)) ||
      (!replacing &&
        row.date !== undefined &&
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
  // A row an edit handler scoped is written exactly as authorized or not
  // at all, whatever account it names; generic rules apply only to
  // unscoped rows.
  const editAllowed = allowedForeignEdit(row, existing, options);
  const scopedId = existing?.id ?? row.id;
  if (scopedId && options.foreignEdits?.has(scopedId) && !editAllowed) {
    throw new Error('foreign-edit-unavailable');
  }
  const accountId = row.account ?? existing?.acct;
  if (!accountId) return {};
  const account = await accountContext(accountId);
  // An account that exists neither in the database nor in the current batch
  // cannot be foreign; the schema layer owns referential checks.
  if (!account) return {};
  if (existing && row.account !== undefined && row.account !== existing.acct) {
    const previous = await accountContext(existing.acct);
    // Native integers only keep their value under the same recorded encoding;
    // a move handler supplies the destination's amounts instead.
    if (
      !editAllowed &&
      ((previous?.currency ?? null) !== account.currency ||
        (previous?.precision ?? null) !== account.precision)
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
    !editAllowed &&
    ((existing &&
      (await isExchangeFamily(
        existing.isParent ? existing.id : existing.parent_id,
      ))) ||
      (await isExchangeFamily(row.parent_id ?? null)))
  ) {
    throw new Error('foreign-split-unavailable');
  }

  const movesAccount =
    existing !== null &&
    row.account !== undefined &&
    row.account !== existing.acct;
  if (!account.foreign) {
    if (row.transaction_amount != null) {
      throw new Error('native-amount-unexpected');
    }
    // A budget-currency row with an authority (moved out of a foreign
    // account) keeps it in step, so the old pair can never be re-derived;
    // a move handler writes one even when the source pair has not arrived.
    if (
      (existing?.amount_pair || editAllowed) &&
      (row.amount !== undefined || movesAccount)
    ) {
      const amount = row.amount !== undefined ? row.amount : existing?.amount;
      if (!Number.isSafeInteger(amount)) {
        throw new Error('foreign-pair-required');
      }
      return { pair: amountPair(amount as number, null, accountId) };
    }
    return {};
  }

  // Foreign splits arrive with foreign edits (MC-5): no family may be
  // created or restructured, while metadata edits of a family stay allowed.
  // The exchange handler writes its validated fee families.
  if (changesFamily && !options.validatedTransfer && !editAllowed) {
    throw new Error('foreign-split-unavailable');
  }
  // A foreign leg's base may be derived from its exchange (coupled-cells),
  // so unlinking it records its current pair as its own from then on.
  if (
    existing?.transferred_id &&
    row.transfer_id === null &&
    row.amount === undefined &&
    row.transaction_amount === undefined &&
    existing.transaction_amount !== null
  ) {
    return {
      pair: amountPair(
        existing.amount,
        existing.transaction_amount,
        existing.acct,
      ),
    };
  }
  const setsAmount =
    row.amount !== undefined || row.transaction_amount !== undefined;
  if (isUpdate && !setsAmount && !movesAccount) return {};

  // A pair is always written whole; a move alone keeps the stored pair.
  if (
    (setsAmount || !isUpdate) &&
    (!Number.isSafeInteger(row.amount) ||
      !Number.isSafeInteger(row.transaction_amount))
  ) {
    throw new Error('foreign-pair-required');
  }
  const finalAmount = setsAmount ? row.amount : existing?.amount;
  const finalNative = setsAmount
    ? row.transaction_amount
    : existing?.transaction_amount;
  if (
    !Number.isSafeInteger(finalAmount) ||
    !Number.isSafeInteger(finalNative)
  ) {
    throw new Error('foreign-pair-required');
  }
  // Stored foreign pairs are frozen until foreign edits (MC-5), apart from
  // a leg an import replaces.
  if (
    existing &&
    !editAllowed &&
    !(await allowedReplacement(row, existing, options)) &&
    ((row.amount !== undefined && row.amount !== existing.amount) ||
      (row.transaction_amount !== undefined &&
        row.transaction_amount !== existing.transaction_amount))
  ) {
    throw new Error('foreign-edit-unavailable');
  }
  return {
    pair: amountPair(finalAmount as number, finalNative as number, accountId),
  };
}

function matchesExpected(
  stored: Pick<ExistingRow, 'acct' | 'amount' | 'transaction_amount' | 'date'>,
  expected: ForeignEditExpected,
) {
  return (
    stored.acct === expected.account &&
    stored.amount === expected.amount &&
    (stored.transaction_amount ?? null) === expected.transaction_amount &&
    String(stored.date) === expected.date.replaceAll('-', '')
  );
}

/**
 * Whether a write is exactly what an edit or move handler validated: an
 * update of the row it read to the values it computed, or the creation of a
 * row that does not exist yet with those values.
 */
function allowedForeignEdit(
  row: TransactionWrite,
  existing: ExistingRow | null,
  options: TransactionWriteOptions,
) {
  const id = existing?.id ?? row.id;
  const edit = id ? options.foreignEdits?.get(id) : undefined;
  if (!edit || edit.action === 'delete') return false;
  // Deleting takes a deletion entry, checked in preflight.
  if (row.tombstone === true || row.tombstone === 1) return false;
  if (edit.action === 'update' && !existing) return false;
  if (edit.action === 'create' && existing) return false;
  if (existing && edit.action === 'update') {
    if (!matchesExpected(existing, edit.expected)) return false;
  }
  const { final } = edit;
  const value = <T>(written: T | undefined, stored: T) =>
    written !== undefined ? written : stored;
  const date = value(
    row.date?.replaceAll('-', ''),
    existing ? String(existing.date) : undefined,
  );
  const structure = {
    is_parent: !!value(row.is_parent, !!existing?.isParent),
    is_child: !!value(row.is_child, !!existing?.isChild),
    parent_id: value(row.parent_id, existing?.parent_id ?? null) ?? null,
    transfer_id:
      value(row.transfer_id, existing?.transferred_id ?? null) ?? null,
  };
  const sameStructure = final.structure
    ? structure.is_parent === final.structure.is_parent &&
      structure.is_child === final.structure.is_child &&
      structure.parent_id === final.structure.parent_id &&
      structure.transfer_id === final.structure.transfer_id
    : !!existing &&
      structure.is_parent === !!existing.isParent &&
      structure.is_child === !!existing.isChild &&
      structure.parent_id === (existing.parent_id ?? null) &&
      structure.transfer_id === (existing.transferred_id ?? null);
  return (
    value(row.account, existing?.acct) === final.account &&
    value(row.amount, existing?.amount) === final.amount &&
    (value(row.transaction_amount, existing?.transaction_amount) ?? null) ===
      final.transaction_amount &&
    (final.date === undefined
      ? !existing || date === String(existing.date)
      : date === final.date.replaceAll('-', '')) &&
    sameStructure
  );
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
    // An edit handler deletes exactly the rows it read, and only under a
    // deletion entry.
    const edit = options.foreignEdits?.get(id);
    if (edit) {
      const stored =
        edit.action === 'delete'
          ? await db.first<
              Pick<
                ExistingRow,
                'acct' | 'amount' | 'transaction_amount' | 'date'
              >
            >(
              `SELECT acct, amount, transaction_amount, date
                 FROM transactions WHERE id = ? AND tombstone = 0`,
              [id],
            )
          : null;
      if (
        edit.action !== 'delete' ||
        !stored ||
        !matchesExpected(stored, edit.expected)
      ) {
        throw new Error('foreign-split-unavailable');
      }
      continue;
    }
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

type ReplacementLeg = {
  id: string;
  acct: string;
  amount: number;
  transaction_amount: number | null;
  transferred_id: string | null;
  isParent: number;
  isChild: number;
  schedule: string | null;
  reconciled: number;
  tombstone: number;
};

function replacementLeg(id: string) {
  return db.first<ReplacementLeg>(
    `SELECT id, acct, amount, transaction_amount, transferred_id, isParent,
       isChild, schedule, reconciled, tombstone
       FROM transactions WHERE id = ?`,
    [id],
  );
}

/**
 * A leg of a fee-free scheduled exchange, whose amount imports may replace:
 * reciprocal top-level legs in two encodings, one linked to a schedule.
 */
async function replaceableExchange(legId: string) {
  const leg = await replacementLeg(legId);
  if (
    !leg ||
    leg.tombstone ||
    leg.isParent ||
    leg.isChild ||
    !leg.transferred_id
  ) {
    return null;
  }
  const other = await replacementLeg(leg.transferred_id);
  if (
    !other ||
    other.tombstone ||
    other.isParent ||
    other.isChild ||
    other.transferred_id !== leg.id ||
    (leg.schedule === null && other.schedule === null)
  ) {
    return null;
  }
  const own = await accountEncoding(leg.acct);
  const otherEncoding = await accountEncoding(other.acct);
  if (sameEncoding(own, otherEncoding)) return null;
  return {
    leg,
    other,
    foreign: own.currency !== null,
    otherForeign: otherEncoding.currency !== null,
  };
}

/** True for a leg imports may replace (criterion: fee-free and scheduled). */
export async function isReplaceableExchangeLeg(id: string) {
  return (await replaceableExchange(id)) !== null;
}

/**
 * The write replacing the amount of a fee-free scheduled exchange's leg with
 * an imported native amount. Only that leg is written: between two foreign
 * accounts it keeps its base, and with one account in the budget currency
 * the foreign leg's base is derived from the budget leg on every device
 * (coupled-cells), so concurrent replacements of opposite legs both survive.
 * Null when the leg or the resulting exchange would be invalid; reconciled
 * when the exchange has a reconciled leg.
 */
export async function replaceExchangeTotal(
  legId: string,
  native: number,
): Promise<
  | {
      status: 'ok';
      write: { id: string; amount: number; transaction_amount?: number };
    }
  | { status: 'reconciled' }
  | null
> {
  const exchange = await replaceableExchange(legId);
  if (!exchange) return null;
  const { leg, other, foreign, otherForeign } = exchange;
  const current = foreign ? leg.transaction_amount : leg.amount;
  const otherNative = otherForeign ? other.transaction_amount : other.amount;
  if (
    current === null ||
    otherNative === null ||
    !Number.isSafeInteger(native) ||
    native === 0 ||
    Math.sign(native) !== Math.sign(current) ||
    Math.sign(otherNative) !== -Math.sign(native)
  ) {
    return null;
  }
  // The legs' bases cancel after the write, with the valuation keeping the
  // direction of the native amounts (zero allowed between foreign accounts).
  const base = foreign ? leg.amount : native;
  const otherBase = otherForeign && !foreign ? -base : other.amount;
  if (
    !Number.isSafeInteger(base) ||
    otherBase !== -base ||
    (base !== 0 && Math.sign(base) !== Math.sign(native))
  ) {
    return null;
  }
  if (leg.reconciled || other.reconciled) return { status: 'reconciled' };
  return {
    status: 'ok',
    write: foreign
      ? { id: leg.id, amount: base, transaction_amount: native }
      : { id: leg.id, amount: native },
  };
}

/** Whether a scoped write matches the replacement its leg allows. */
async function allowedReplacement(
  row: TransactionWrite,
  existing: ExistingRow,
  options: TransactionWriteOptions,
) {
  if (!options.exchangeReplacements?.has(existing.id)) return false;
  const foreign = (await accountEncoding(existing.acct)).currency !== null;
  const native = foreign
    ? (row.transaction_amount ?? existing.transaction_amount)
    : (row.amount ?? existing.amount);
  if (typeof native !== 'number') return false;
  const replacement = await replaceExchangeTotal(existing.id, native);
  return (
    replacement?.status === 'ok' &&
    (row.amount ?? existing.amount) === replacement.write.amount &&
    (!foreign ||
      (row.transaction_amount ?? existing.transaction_amount) ===
        replacement.write.transaction_amount)
  );
}

/** True when any row of a transaction's exchange family is reconciled. */
export async function exchangeFamilyReconciled(id: string) {
  const ids = new Set([id]);
  // Rows, their parents and children, and the counterparts of each.
  for (let step = 0; step < 3; step++) {
    const known = [...ids];
    const marks = known.map(() => '?').join(', ');
    for (const relative of await db.all<{
      id: string;
      parent_id: string | null;
      transferred_id: string | null;
    }>(
      `SELECT id, parent_id, transferred_id FROM transactions
         WHERE tombstone = 0 AND (id IN (${marks}) OR parent_id IN (${marks}))`,
      [...known, ...known],
    )) {
      for (const value of [
        relative.id,
        relative.parent_id,
        relative.transferred_id,
      ]) {
        if (value) ids.add(value);
      }
    }
  }
  const all = [...ids];
  return (
    (await db.first(
      `SELECT 1 FROM transactions WHERE tombstone = 0 AND reconciled = 1
         AND id IN (${all.map(() => '?').join(', ')})`,
      all,
    )) != null
  );
}
