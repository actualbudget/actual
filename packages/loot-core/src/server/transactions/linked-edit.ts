import { v4 as uuidv4 } from 'uuid';

import * as db from '#server/db';
import { resolveRate, writeManualRate } from '#server/exchange-rates/app';
import { batchMessages } from '#server/sync';
import { withUndo } from '#server/undo';
import {
  getAccountCurrency,
  getDefaultCurrencyCode,
  getRecordedAmountPrecision,
} from '#server/util/currency';
import { isValidDate, parseRate } from '#shared/exchange-rate';
import { foreignSplitBases } from '#shared/foreign-split';
import type { TransactionEntity } from '#types/models';

import { exchangeValues } from './exchange-transfer';
import { editableFields, liveRow, matches, pairFor } from './foreign-edit';
import type { PairFailure, PairInput, StoredRow } from './foreign-edit';
import {
  accountEncoding,
  isExchangeFamily,
  preflightTransactionWrites,
  sameEncoding,
  SNAPSHOT_METADATA_COLUMNS,
  transferTarget,
} from './foreign-guard';
import type {
  ForeignEdit,
  ForeignEditExpected,
  ForeignEditFinal,
} from './foreign-guard';

/** A row write that may also clear category, payee, notes or schedule. */
type RowWrite = Omit<
  Partial<TransactionEntity>,
  'category' | 'payee' | 'notes' | 'schedule' | 'parent_id'
> & {
  id: string;
  parent_id?: string | null;
  category?: string | null;
  payee?: string | null;
  notes?: string | null;
  schedule?: string | null;
};

type FamilyRow = StoredRow & {
  cleared: number;
  reconciled: number;
  category: string | null;
};

type PendingRates = Array<Parameters<typeof writeManualRate>[0]>;

async function isOffBudget(accountId: string) {
  const account = await db.first<{ offbudget: number }>(
    'SELECT offbudget FROM accounts WHERE id = ?',
    [accountId],
  );
  return account?.offbudget === 1;
}

/** Writes a family's validated rows in one batch with one undo entry. */
async function writeFamily({
  added = [],
  updated = [],
  deleted = [],
  edits,
  pendingRates,
}: {
  added?: RowWrite[];
  updated?: RowWrite[];
  deleted?: string[];
  edits: Map<string, ForeignEdit>;
  pendingRates?: PendingRates;
}) {
  const options = { foreignEdits: edits };
  await preflightTransactionWrites(
    { added, updated, deleted: deleted.map(id => ({ id })) },
    options,
  );
  await withUndo(() =>
    batchMessages(async () => {
      if (pendingRates) {
        for (const pending of pendingRates) {
          await writeManualRate(pending);
        }
      }
      // Parents before children, so structure checks see the final parent.
      for (const row of updated) {
        await db.updateTransaction(row, options);
      }
      for (const row of added) {
        await db.insertTransaction(row, options);
      }
      for (const id of deleted) {
        await db.deleteTransaction({ id });
      }
    }),
  );
}

async function familyRows(parentId: string) {
  return db.all<FamilyRow>(
    `SELECT id, acct, amount, transaction_amount, date, isParent, isChild,
       transferred_id, schedule, tombstone, cleared, category,
       ${SNAPSHOT_METADATA_COLUMNS}
       FROM transactions WHERE parent_id = ? AND tombstone = 0
       ORDER BY sort_order DESC, id`,
    [parentId],
  );
}

async function storedFamilyRow(id: string) {
  const row = await db.first<FamilyRow>(
    `SELECT id, acct, amount, transaction_amount, date, isParent, isChild,
       transferred_id, schedule, tombstone, cleared, category,
       ${SNAPSHOT_METADATA_COLUMNS}
       FROM transactions WHERE id = ?`,
    [id],
  );
  if (!row || row.tombstone) throw new Error('transaction-not-found');
  return row;
}

const CHILD = (parentId: string) => ({
  is_parent: false,
  is_child: true,
  parent_id: parentId,
  transfer_id: null,
});

/**
 * Whether the editor's snapshot is exactly the stored family: the same rows,
 * each as the editor saw it.
 */
function snapshotMatches(
  stored: StoredRow[],
  expected: Record<string, ForeignEditExpected>,
) {
  return (
    Object.keys(expected).length === stored.length &&
    stored.every(row => expected[row.id] && matches(row, expected[row.id]))
  );
}

/**
 * Creates or edits a split family in a foreign account. The children's
 * native amounts must sum to the confirmed parent total; their bases share
 * the parent's base in proportion, remainders by largest discarded
 * fraction, so the family always conserves in both units.
 */
export async function saveForeignSplit({
  id,
  expected,
  transaction_amount,
  children,
  baseAmount,
  rate,
  replaceRate,
  saveStanding,
  expectedBaseAmount,
}: {
  id: string;
  /** The transaction and any split children as the editor saw them, by id. */
  expected: Record<string, ForeignEditExpected>;
  /** The parent's confirmed native total. */
  transaction_amount: number;
  children: Array<{
    id?: string;
    transaction_amount: number;
    category?: string | null;
    notes?: string | null;
    payee?: string | null;
  }>;
} & PairInput): Promise<{ status: 'ok'; ids: string[] } | PairFailure> {
  const parent = await storedFamilyRow(id);
  const stored = parent.isParent ? await familyRows(parent.id) : [];
  if (!snapshotMatches([parent, ...stored], expected)) {
    return { status: 'stale' };
  }
  if (parent.isChild || (await isExchangeFamily(parent.id))) {
    throw new Error('foreign-split-unavailable');
  }
  if (parent.transferred_id) {
    throw new Error('foreign-transfer-edit-unavailable');
  }
  const encoding = await accountEncoding(parent.acct);
  if (encoding.currency === null) throw new Error('foreign-account-required');
  if (children.length === 0) throw new Error('foreign-split-unbalanced');
  if (
    !Number.isSafeInteger(transaction_amount) ||
    children.some(child => !Number.isSafeInteger(child.transaction_amount)) ||
    children.reduce(
      (sum, child) => sum + BigInt(child.transaction_amount),
      0n,
    ) !== BigInt(transaction_amount)
  ) {
    throw new Error('foreign-split-unbalanced');
  }

  const storedById = new Map(stored.map(child => [child.id, child]));
  if (stored.some(child => child.transferred_id)) {
    throw new Error('foreign-transfer-edit-unavailable');
  }
  for (const child of children) {
    if (child.payee && (await transferTarget(child.payee))) {
      throw new Error('foreign-transfer-edit-unavailable');
    }
  }

  // The parent's base is kept unless its native total or valuation changes.
  const date = db.fromDateRepr(parent.date);
  let parentBase = parent.amount;
  let pendingRates: PendingRates | undefined;
  if (
    transaction_amount !== parent.transaction_amount ||
    baseAmount !== undefined
  ) {
    // A zero total's own base needs no rate (zero unless a base is given);
    // a rate then only values its children and is not saved.
    const zero = transaction_amount === 0;
    const pair = await pairFor(parent.acct, transaction_amount, date, {
      baseAmount,
      rate: zero ? undefined : rate,
      replaceRate: zero ? undefined : replaceRate,
      saveStanding: zero ? undefined : saveStanding,
      expectedBaseAmount: zero ? undefined : expectedBaseAmount,
    });
    if (pair.status !== 'ok') return pair;
    parentBase = pair.amount;
    pendingRates = pair.pendingRates;
  }

  // A new child may bring the id its dialog previewed with; the guard's
  // create check rejects an id any row already has.
  const ids = children.map(child => child.id ?? uuidv4());
  let zeroTotal;
  if (transaction_amount === 0) {
    // Zero-total families value each child at the rate, keeping the sum.
    const typed = rate !== undefined ? parseRate(rate) : null;
    const resolved = typed
      ? null
      : await resolveRate({
          baseCurrency: await getDefaultCurrencyCode(),
          quoteCurrency: encoding.currency,
          date,
        });
    const childRate =
      typed ?? (resolved?.status === 'resolved' ? resolved.rate : null);
    if (!childRate) return { status: 'rate-unavailable', date };
    zeroTotal = {
      rate: childRate,
      nativePrecision: (await getAccountCurrency(parent.acct)).precision,
      basePrecision: getRecordedAmountPrecision(),
    };
  }
  const bases = foreignSplitBases(
    parentBase,
    children.map((child, index) => ({
      id: ids[index],
      native: child.transaction_amount,
    })),
    zeroTotal,
  );

  const offbudget = await isOffBudget(parent.acct);
  const edits = new Map<string, ForeignEdit>();
  const updated: RowWrite[] = [];
  const added: RowWrite[] = [];
  const parentFinal: ForeignEditFinal = {
    account: parent.acct,
    amount: parentBase,
    transaction_amount,
    structure: {
      is_parent: true,
      is_child: false,
      parent_id: null,
      transfer_id: null,
    },
  };
  edits.set(parent.id, {
    action: 'update',
    expected: expected[parent.id],
    final: parentFinal,
  });
  updated.push({
    id: parent.id,
    is_parent: true,
    amount: parentBase,
    transaction_amount,
    category: null,
  });
  children.forEach((child, index) => {
    const childId = ids[index];
    const amount = bases[index].amount;
    const final: ForeignEditFinal = {
      account: parent.acct,
      amount,
      transaction_amount: child.transaction_amount,
      structure: CHILD(parent.id),
    };
    const fields = {
      ...(child.category !== undefined && {
        category: offbudget ? null : child.category,
      }),
      ...(child.notes !== undefined && { notes: child.notes }),
      ...(child.payee !== undefined && { payee: child.payee }),
    };
    const existing = storedById.get(childId);
    if (existing) {
      edits.set(childId, {
        action: 'update',
        expected: expected[childId],
        final,
      });
      updated.push({
        id: childId,
        ...fields,
        amount,
        transaction_amount: child.transaction_amount,
      });
    } else {
      edits.set(childId, { action: 'create', final });
      added.push({
        id: childId,
        account: parent.acct,
        date,
        ...fields,
        amount,
        transaction_amount: child.transaction_amount,
        is_child: true,
        parent_id: parent.id,
        // New children inherit the parent's state, as splitting does.
        cleared: !!parent.cleared,
        reconciled: !!parent.reconciled,
      });
    }
  });
  const kept = new Set(ids);
  const deleted = stored
    .filter(child => !kept.has(child.id))
    .map(child => {
      edits.set(child.id, { action: 'delete', expected: expected[child.id] });
      return child.id;
    });

  await writeFamily({ added, updated, deleted, edits, pendingRates });
  return { status: 'ok', ids };
}

/** Turns a foreign split back into a single transaction with its pair. */
export async function collapseForeignSplit({
  id,
  expected,
}: {
  id: string;
  /** The split parent and children as the editor saw them, by id. */
  expected: Record<string, ForeignEditExpected>;
}): Promise<{ status: 'ok' } | { status: 'stale' }> {
  const parent = await storedFamilyRow(id);
  const stored = parent.isParent ? await familyRows(parent.id) : [];
  if (!snapshotMatches([parent, ...stored], expected)) {
    return { status: 'stale' };
  }
  if (!parent.isParent || (await isExchangeFamily(parent.id))) {
    throw new Error('foreign-split-unavailable');
  }
  if (stored.some(child => child.transferred_id)) {
    throw new Error('foreign-transfer-edit-unavailable');
  }
  const edits = new Map<string, ForeignEdit>([
    [
      parent.id,
      {
        action: 'update',
        expected: expected[parent.id],
        final: {
          account: parent.acct,
          amount: parent.amount,
          transaction_amount: parent.transaction_amount,
          structure: {
            is_parent: false,
            is_child: false,
            parent_id: null,
            transfer_id: null,
          },
        },
      },
    ],
  ]);
  for (const child of stored) {
    edits.set(child.id, { action: 'delete', expected: expected[child.id] });
  }
  await writeFamily({
    updated: [{ id: parent.id, is_parent: false }],
    deleted: stored.map(child => child.id),
    edits,
  });
  return { status: 'ok' };
}

/**
 * Edits a transfer between two accounts sharing a foreign encoding: the
 * edited leg takes its new pair and the counterpart the negated pair, in
 * one batch; a date change applies to both legs.
 */
export async function updateForeignTransfer({
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
  expected: { leg: ForeignEditExpected; counterpart: ForeignEditExpected };
  transaction_amount?: number;
  fields?: Record<string, unknown>;
} & PairInput): Promise<{ status: 'ok' } | PairFailure> {
  const leg = await liveRow(id);
  const counterpart = leg.transferred_id
    ? await liveRow(leg.transferred_id)
    : null;
  if (
    !matches(leg, expected.leg) ||
    !counterpart ||
    !matches(counterpart, expected.counterpart)
  ) {
    return { status: 'stale' };
  }
  if (
    leg.isParent ||
    leg.isChild ||
    counterpart.isParent ||
    counterpart.isChild ||
    counterpart.transferred_id !== leg.id
  ) {
    throw new Error('foreign-split-unavailable');
  }
  const encoding = await accountEncoding(leg.acct);
  if (
    encoding.currency === null ||
    !sameEncoding(encoding, await accountEncoding(counterpart.acct))
  ) {
    throw new Error('foreign-transfer-edit-unavailable');
  }
  const picked = await editableFields(fields);
  // Relinking a leg would unpair the transfer.
  if (picked.payee !== undefined) {
    throw new Error('foreign-transfer-edit-unavailable');
  }
  if (picked.date !== undefined && !isValidDate(picked.date)) {
    throw new Error('date-invalid');
  }
  // As in ordinary transfers, only the on-budget leg of a transfer crossing
  // the budget boundary has a category.
  if (
    picked.category !== undefined &&
    ((await isOffBudget(leg.acct)) || !(await isOffBudget(counterpart.acct)))
  ) {
    picked.category = null;
  }
  const date =
    typeof picked.date === 'string' ? picked.date : db.fromDateRepr(leg.date);
  const native = transaction_amount ?? leg.transaction_amount;
  if (native == null) throw new Error('foreign-pair-required');
  let amount = leg.amount;
  let pendingRates: PendingRates | undefined;
  if (transaction_amount !== undefined || baseAmount !== undefined) {
    const pair = await pairFor(leg.acct, native, date, {
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
  const dateFinal = typeof picked.date === 'string' ? { date } : {};
  const edits = new Map<string, ForeignEdit>([
    [
      leg.id,
      {
        action: 'update',
        expected: expected.leg,
        final: {
          account: leg.acct,
          amount,
          transaction_amount: native,
          ...dateFinal,
        },
      },
    ],
    [
      counterpart.id,
      {
        action: 'update',
        expected: expected.counterpart,
        final: {
          account: counterpart.acct,
          amount: -amount,
          transaction_amount: -native,
          ...dateFinal,
        },
      },
    ],
  ]);
  await writeFamily({
    updated: [
      { ...picked, id: leg.id, amount, transaction_amount: native },
      {
        id: counterpart.id,
        amount: -amount,
        transaction_amount: -native,
        ...dateFinal,
      },
    ],
    edits,
    pendingRates,
  });
  return { status: 'ok' };
}

type ExchangeRow = FamilyRow & {
  parent_id: string | null;
  notes: string | null;
  financial_id: string | null;
  imported_description: string | null;
};

async function exchangeRow(id: string) {
  return db.first<ExchangeRow>(
    `SELECT id, acct, amount, transaction_amount, date, isParent, isChild,
       parent_id, transferred_id, schedule, tombstone, cleared,
       category, notes, financial_id, imported_description,
       ${SNAPSHOT_METADATA_COLUMNS}
       FROM transactions WHERE id = ? AND tombstone = 0`,
    [id],
  );
}

async function exchangeChildren(parentId: string) {
  return db.all<ExchangeRow>(
    `SELECT id, acct, amount, transaction_amount, date, isParent, isChild,
       parent_id, transferred_id, schedule, tombstone, cleared,
       category, notes, financial_id, imported_description,
       ${SNAPSHOT_METADATA_COLUMNS}
       FROM transactions WHERE parent_id = ? AND tombstone = 0`,
    [parentId],
  );
}

/** An exchange family row as a budget posting, for edit notices. */
export type ExchangePosting = {
  id: string;
  account: string;
  category: string | null;
  date: string;
  amount: number;
  isParent: boolean;
  transferAccount: string | null;
};

type ExchangeSideRows = {
  leg: ExchangeRow;
  parent: ExchangeRow | null;
  fee: ExchangeRow | null;
};

async function sideOf(leg: ExchangeRow): Promise<ExchangeSideRows> {
  const parent =
    leg.isChild && leg.parent_id ? await exchangeRow(leg.parent_id) : null;
  const fee = parent
    ? ((await exchangeChildren(parent.id)).find(row => row.id !== leg.id) ??
      null)
    : null;
  return { leg, parent, fee };
}

/**
 * Both sides of the exchange family holding a row, or null with the rows
 * found when its transfer link is gone or one-sided.
 */
async function exchangeFamily(id: string) {
  const start = await exchangeRow(id);
  if (!start) return { family: null, found: [] };
  const parentId = start.isParent ? start.id : start.parent_id;
  const siblings = parentId ? await exchangeChildren(parentId) : [];
  const leg = start.transferred_id
    ? start
    : siblings.find(row => row.transferred_id);
  const other = leg?.transferred_id
    ? await exchangeRow(leg.transferred_id)
    : null;
  if (!leg || !other || other.transferred_id !== leg.id) {
    const parent =
      parentId && parentId !== start.id ? await exchangeRow(parentId) : null;
    const found = [start, ...(parent ? [parent] : []), ...siblings];
    return {
      family: null,
      found: [...new Map(found.map(row => [row.id, row])).values()],
    };
  }
  const sides = [await sideOf(leg), await sideOf(other)];
  const native = (row: ExchangeRow) => row.transaction_amount ?? row.amount;
  const [source, destination] =
    native(sides[0].leg) < 0 ? sides : [sides[1], sides[0]];
  const selected = sides.find(
    side =>
      side.leg.id === start.id ||
      side.parent?.id === start.id ||
      side.fee?.id === start.id,
  )!;
  return { family: { source, destination, selected }, found: [] };
}

function familyRowsOf(...sides: ExchangeSideRows[]) {
  return sides.flatMap(side =>
    [side.leg, side.parent, side.fee].filter(
      (row): row is ExchangeRow => row !== null,
    ),
  );
}

/**
 * An exchange family as its edit dialog needs it: the snapshot to send back,
 * the accounts and direction, and the values `updateExchangeTransfer` takes,
 * so the dialog starts from what is stored.
 */
export async function getExchangeFamily({ id }: { id: string }): Promise<
  | { status: 'unavailable' }
  | {
      status: 'ok';
      expected: Record<string, ForeignEditExpected>;
      reconciled: boolean;
      selectedSide: 'source' | 'destination';
      sourceAccount: string;
      destinationAccount: string;
      date: string;
      sourceAmount: number;
      destinationAmount: number;
      sourceFee: number;
      destinationFee: number;
      baseAmount: number;
      notes: string | null;
      category: string | null;
      feeCategory: string | null;
      /** Each row as a budget posting, for the dialog's notice. */
      postings: ExchangePosting[];
    }
> {
  const { family } = await exchangeFamily(id);
  if (!family) return { status: 'unavailable' };
  const { source, destination, selected } = family;
  if (
    sameEncoding(
      await accountEncoding(source.leg.acct),
      await accountEncoding(destination.leg.acct),
    )
  ) {
    return { status: 'unavailable' };
  }
  const rows = familyRowsOf(source, destination);
  const native = (row: ExchangeRow) => row.transaction_amount ?? row.amount;
  const top = (side: ExchangeSideRows) => side.parent ?? side.leg;
  // The principal category is the on-budget leg's.
  const onBudget = [];
  for (const side of [source, destination]) {
    if (!(await isOffBudget(side.leg.acct))) onBudget.push(side);
  }
  const fee = source.fee ?? destination.fee;
  return {
    status: 'ok',
    expected: Object.fromEntries(
      rows.map(row => [
        row.id,
        {
          account: row.acct,
          amount: row.amount,
          transaction_amount: row.transaction_amount,
          date: db.fromDateRepr(row.date),
          // The notice and the reconciled confirmation depend on these.
          category: row.mapped_category,
          reconciled: !!row.reconciled,
        },
      ]),
    ),
    postings: rows.map(row => ({
      id: row.id,
      account: row.acct,
      category: row.mapped_category,
      date: db.fromDateRepr(row.date),
      amount: row.amount,
      isParent: !!row.isParent,
      transferAccount:
        row.id === source.leg.id
          ? destination.leg.acct
          : row.id === destination.leg.id
            ? source.leg.acct
            : null,
    })),
    reconciled: rows.some(row => row.reconciled),
    selectedSide: selected === source ? 'source' : 'destination',
    sourceAccount: source.leg.acct,
    destinationAccount: destination.leg.acct,
    date: db.fromDateRepr(source.leg.date),
    sourceAmount: -native(top(source)),
    destinationAmount: native(top(destination)),
    sourceFee: source.fee ? -native(source.fee) : 0,
    destinationFee: destination.fee ? -native(destination.fee) : 0,
    baseAmount: destination.leg.amount,
    notes: top(selected).notes,
    category: onBudget.length === 1 ? onBudget[0].leg.mapped_category : null,
    feeCategory: fee?.mapped_category ?? null,
  };
}

/**
 * Edits an exchange transfer's amounts, fees, valuation and date as one
 * family update, with posting's arithmetic: rows keep their ids where the
 * structure stays, a side gaining a fee gets a new parent and fee child, and
 * a side losing one drops them, its leg keeping its id and link.
 */
export async function updateExchangeTransfer({
  id,
  expected,
  sourceAmount,
  destinationAmount,
  rate,
  sourceFee = 0,
  destinationFee = 0,
  baseAmount,
  category,
  feeCategory,
  notes,
  date: newDate,
  preview = false,
}: {
  id: string;
  /** Every row of the family as the editor saw it, by id. */
  expected: Record<string, ForeignEditExpected>;
  sourceAmount: number;
  destinationAmount?: number;
  rate?: string;
  sourceFee?: number;
  destinationFee?: number;
  baseAmount?: number;
  category?: string | null;
  feeCategory?: string | null;
  notes?: string | null;
  date?: string;
  /** Compute the family's rows without writing, for a budget notice. */
  preview?: boolean;
}): Promise<
  | { status: 'ok' }
  | { status: 'preview'; postings: ExchangePosting[] }
  | { status: 'stale' }
  | { status: 'rate-unavailable'; currencies: string[]; date: string }
> {
  // The snapshot is compared before eligibility: a family whose link has
  // since gone is stale unless the editor saw exactly the current rows.
  const { family, found } = await exchangeFamily(id);
  if (!family) {
    if (found.length === 0 || !snapshotMatches(found, expected)) {
      return { status: 'stale' };
    }
    throw new Error('exchange-transfer-edit-unavailable');
  }
  const { source, destination, selected } = family;
  if (!snapshotMatches(familyRowsOf(source, destination), expected)) {
    return { status: 'stale' };
  }
  if (
    sameEncoding(
      await accountEncoding(source.leg.acct),
      await accountEncoding(destination.leg.acct),
    )
  ) {
    throw new Error('exchange-transfer-edit-unavailable');
  }
  if (newDate !== undefined && !isValidDate(newDate)) {
    throw new Error('date-invalid');
  }

  const date = newDate ?? db.fromDateRepr(source.leg.date);
  const sideInfo = async (side: ExchangeSideRows) => ({
    ...(await getAccountCurrency(side.leg.acct)),
    foreign: (await accountEncoding(side.leg.acct)).currency !== null,
    offbudget: await isOffBudget(side.leg.acct),
  });
  const sourceInfo = await sideInfo(source);
  const destinationInfo = await sideInfo(destination);
  const values = await exchangeValues(
    {
      date,
      sourceAmount,
      destinationAmount,
      rate,
      sourceFee,
      destinationFee,
      baseAmount,
    },
    sourceInfo,
    destinationInfo,
  );
  if (values.status !== 'ok') return values;
  const { legs, value, sourceFeeBase, destinationFeeBase } = values;
  const crossesBudget = sourceInfo.offbudget !== destinationInfo.offbudget;

  const edits = new Map<string, ForeignEdit>();
  const updated: RowWrite[] = [];
  const added: RowWrite[] = [];
  const deleted: string[] = [];
  const dateFinal = newDate !== undefined ? { date: newDate } : {};
  const PARENT = {
    is_parent: true,
    is_child: false,
    parent_id: null,
    transfer_id: null,
  };
  const TOP = {
    is_parent: false,
    is_child: false,
    parent_id: null,
    transfer_id: null,
  };

  const writeSide = (
    side: ExchangeSideRows,
    info: typeof sourceInfo,
    amounts: {
      leg: [number, number];
      total: [number, number];
      fee: [number, number];
      feeNative: number;
    },
  ) => {
    const pair = ([base, native]: [number, number]) => ({
      amount: base,
      transaction_amount: info.foreign ? native : null,
    });
    const final = (
      [base, native]: [number, number],
      structure: ForeignEditFinal['structure'],
    ): ForeignEditFinal => ({
      account: side.leg.acct,
      amount: base,
      transaction_amount: info.foreign ? native : null,
      ...dateFinal,
      structure,
    });
    const update = (
      row: ExchangeRow,
      values: [number, number],
      structure: NonNullable<ForeignEditFinal['structure']>,
      fields: Omit<RowWrite, 'id'> = {},
    ) => {
      // Rows keep their transfer links.
      const exact = { ...structure, transfer_id: row.transferred_id };
      edits.set(row.id, {
        action: 'update',
        expected: expected[row.id],
        final: final(values, exact),
      });
      updated.push({
        id: row.id,
        ...fields,
        ...pair(values),
        ...dateFinal,
        is_parent: structure.is_parent,
        is_child: structure.is_child,
        parent_id: structure.parent_id,
      });
    };
    const isSelected = side === selected;
    const legCategory =
      category !== undefined && isSelected && crossesBudget && !info.offbudget
        ? { category }
        : {};
    const feeCategoryWrite =
      feeCategory !== undefined
        ? { category: info.offbudget ? null : feeCategory }
        : {};
    const topNotes = notes !== undefined && isSelected ? { notes } : {};

    if (amounts.feeNative > 0) {
      const parentId = side.parent?.id ?? uuidv4();
      const child = CHILD(parentId);
      if (side.parent && side.fee) {
        update(side.parent, amounts.total, PARENT, topNotes);
        update(side.leg, amounts.leg, child, legCategory);
        update(side.fee, amounts.fee, child, feeCategoryWrite);
      } else {
        // The new parent takes the leg's place at the top of its side.
        edits.set(parentId, {
          action: 'create',
          final: final(amounts.total, PARENT),
        });
        added.push({
          id: parentId,
          account: side.leg.acct,
          date,
          ...pair(amounts.total),
          payee: null,
          category: null,
          notes: notes !== undefined && isSelected ? notes : side.leg.notes,
          cleared: !!side.leg.cleared,
          reconciled: !!side.leg.reconciled,
          is_parent: true,
          ...(side.leg.schedule && { schedule: side.leg.schedule }),
        });
        update(side.leg, amounts.leg, child, {
          ...legCategory,
          ...(side.leg.schedule && { schedule: null }),
        });
        const feeId = uuidv4();
        edits.set(feeId, {
          action: 'create',
          final: final(amounts.fee, child),
        });
        added.push({
          id: feeId,
          account: side.leg.acct,
          date,
          ...pair(amounts.fee),
          payee: null,
          category: info.offbudget ? null : (feeCategory ?? null),
          notes: null,
          cleared: !!side.leg.cleared,
          reconciled: !!side.leg.reconciled,
          is_child: true,
          parent_id: parentId,
        });
      }
    } else if (side.parent && side.fee) {
      // A fee child's id names a separately imported fee; a parent's names
      // the account total and moves to the leg.
      if (side.fee.financial_id) {
        throw new Error('foreign-import-identity-conflict');
      }
      const parentId = side.parent.financial_id;
      if (
        parentId &&
        side.leg.financial_id &&
        side.leg.financial_id !== parentId
      ) {
        throw new Error('foreign-import-identity-conflict');
      }
      for (const row of [side.parent, side.fee]) {
        edits.set(row.id, { action: 'delete', expected: expected[row.id] });
        deleted.push(row.id);
      }
      update(side.leg, amounts.leg, TOP, {
        ...legCategory,
        // The side's notes live on its top row: the stored parent's move to
        // the promoted leg unless the request names new ones.
        notes: side.parent.notes,
        ...topNotes,
        cleared: !!(side.leg.cleared || side.parent.cleared),
        reconciled: !!(side.leg.reconciled || side.parent.reconciled),
        ...(side.parent.schedule && { schedule: side.parent.schedule }),
        ...(parentId &&
          !side.leg.financial_id && {
            imported_id: parentId,
            imported_payee: side.parent.imported_description ?? undefined,
          }),
      });
    } else {
      update(side.leg, amounts.leg, TOP, { ...legCategory, ...topNotes });
    }
  };

  writeSide(source, sourceInfo, {
    leg: [-value, -legs.principal],
    total: [-(value + sourceFeeBase), -(legs.principal + legs.sourceFee)],
    fee: [-sourceFeeBase, -legs.sourceFee],
    feeNative: legs.sourceFee,
  });
  writeSide(destination, destinationInfo, {
    leg: [value, legs.gross],
    total: [value - destinationFeeBase, legs.net],
    fee: [-destinationFeeBase, -legs.destinationFee],
    feeNative: legs.destinationFee,
  });

  if (preview) {
    const legAccount = new Map([
      [source.leg.id, destination.leg.acct],
      [destination.leg.id, source.leg.acct],
    ]);
    const after = new Map(
      familyRowsOf(source, destination).map(row => [
        row.id,
        {
          id: row.id,
          account: row.acct,
          category: row.mapped_category,
          date: db.fromDateRepr(row.date),
          amount: row.amount,
          isParent: !!row.isParent,
          transferAccount: legAccount.get(row.id) ?? null,
        },
      ]),
    );
    for (const row of updated) {
      const current = after.get(row.id)!;
      after.set(row.id, {
        ...current,
        ...(row.amount !== undefined && { amount: row.amount }),
        ...(row.date !== undefined && { date: row.date }),
        ...(row.category !== undefined && { category: row.category }),
        ...(row.is_parent !== undefined && { isParent: !!row.is_parent }),
      });
    }
    for (const row of added) {
      after.set(row.id, {
        id: row.id,
        account: row.account ?? source.leg.acct,
        category: row.category ?? null,
        date: row.date ?? date,
        amount: row.amount ?? 0,
        isParent: !!row.is_parent,
        transferAccount: null,
      });
    }
    for (const rowId of deleted) after.delete(rowId);
    return { status: 'preview', postings: [...after.values()] };
  }
  await writeFamily({ added, updated, deleted, edits });
  return { status: 'ok' };
}
