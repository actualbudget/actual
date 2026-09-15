import * as db from '#server/db';

import type { RowState } from './replay';
import { CHANGELOG_COLUMNS } from './types';
import type { ChangeLogSnapshot } from './types';

type TransactionRow = {
  id: string;
  date: number | null;
  amount: number | null;
  description: string | null;
  acct: string | null;
  category: string | null;
  notes: string | null;
  isChild: number | null;
  tombstone: number | null;
};

type PayeeRow = {
  id: string;
  name: string | null;
  transfer_acct: string | null;
};
type NamedRow = { id: string; name: string | null };

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function selectByIds<T>(table: string, columns: string, ids: string[]) {
  const rows: T[] = [];

  // Batched to keep the parameter count well inside sqlite's limit. Note there
  // is deliberately no tombstone filter: the change log has to name entities
  // that have since been deleted.
  for (const batch of chunk(ids, 200)) {
    const placeholders = batch.map(() => '?').join(', ');
    rows.push(
      ...(await db.all<T>(
        `SELECT ${columns} FROM ${table} WHERE id IN (${placeholders})`,
        batch,
      )),
    );
  }

  return rows;
}

function formatDate(date: unknown): string | null {
  if (date == null) {
    return null;
  }
  const text = String(date);
  if (!/^\d{8}$/.test(text)) {
    return null;
  }
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

export type ChangeLogLookups = {
  transactions: Map<string, TransactionRow>;
  payees: Map<string, PayeeRow>;
  accounts: Map<string, string | null>;
  categories: Map<string, string | null>;
};

/**
 * Resolves every id referenced by a page, in a handful of batched queries.
 *
 * Ids resolve against *current* state: a category renamed since the change
 * shows its current name. Point-in-time resolution would mean replaying the
 * history of every referenced entity too, which is a different feature.
 */
export async function loadLookups(
  transactionIds: string[],
  referencedIds: {
    payees: Set<string>;
    accounts: Set<string>;
    categories: Set<string>;
  },
): Promise<ChangeLogLookups> {
  const transactions = await selectByIds<TransactionRow>(
    'transactions',
    'id, date, amount, description, acct, category, notes, isChild, tombstone',
    transactionIds,
  );

  const payeeIds = new Set(referencedIds.payees);
  const accountIds = new Set(referencedIds.accounts);
  const categoryIds = new Set(referencedIds.categories);

  for (const transaction of transactions) {
    if (transaction.description) {
      payeeIds.add(transaction.description);
    }
    if (transaction.acct) {
      accountIds.add(transaction.acct);
    }
    if (transaction.category) {
      categoryIds.add(transaction.category);
    }
  }

  const payees = await selectByIds<PayeeRow>(
    'payees',
    'id, name, transfer_acct',
    [...payeeIds],
  );

  // A transfer payee names another account, so those accounts are needed too.
  for (const payee of payees) {
    if (payee.transfer_acct) {
      accountIds.add(payee.transfer_acct);
    }
  }

  const [accounts, categories] = await Promise.all([
    selectByIds<NamedRow>('accounts', 'id, name', [...accountIds]),
    selectByIds<NamedRow>('categories', 'id, name', [...categoryIds]),
  ]);

  return {
    transactions: new Map(transactions.map(row => [row.id, row])),
    payees: new Map(payees.map(row => [row.id, row])),
    accounts: new Map(accounts.map(row => [row.id, row.name])),
    categories: new Map(categories.map(row => [row.id, row.name])),
  };
}

/**
 * Mirrors `getPrettyPayee` on the client: a payee that points at an account is
 * a transfer and shows that account's name. Resolved here rather than in the
 * UI because the client's payee/account caches exclude deleted rows, and the
 * change log has to name entities that are gone.
 */
function resolvePayeeName(
  payeeId: unknown,
  lookups: ChangeLogLookups,
): string | null {
  if (typeof payeeId !== 'string' || payeeId === '') {
    return null;
  }

  const payee = lookups.payees.get(payeeId);
  if (!payee) {
    return null;
  }
  if (payee.transfer_acct) {
    return lookups.accounts.get(payee.transfer_acct) ?? null;
  }
  return payee.name;
}

function resolveName(
  id: unknown,
  names: Map<string, string | null>,
): string | null {
  if (typeof id !== 'string' || id === '') {
    return null;
  }
  return names.get(id) ?? null;
}

/**
 * The id itself, but only when it still names something we resolved. An id the
 * lookup never saw is one the UI could not navigate to anyway.
 */
function resolveId(
  id: unknown,
  names: Map<string, string | null>,
): string | null {
  if (typeof id !== 'string' || id === '' || !names.has(id)) {
    return null;
  }
  return id;
}

/**
 * Turns a replayed row state into the snapshot the UI renders.
 *
 * A column absent from the state was never recorded and never defaulted, so it
 * stays `undefined` (unknown) rather than being reported as empty.
 */
export function toSnapshot(
  state: RowState,
  lookups: ChangeLogLookups,
): ChangeLogSnapshot {
  const read = (raw: string) => (state.has(raw) ? state.get(raw) : undefined);

  const date = read(CHANGELOG_COLUMNS.date);
  const account = read(CHANGELOG_COLUMNS.account);
  const payee = read(CHANGELOG_COLUMNS.payee);
  const notes = read(CHANGELOG_COLUMNS.notes);
  const category = read(CHANGELOG_COLUMNS.category);
  const amount = read(CHANGELOG_COLUMNS.amount);

  return {
    date: date === undefined ? undefined : formatDate(date),
    accountName:
      account === undefined
        ? undefined
        : resolveName(account, lookups.accounts),
    accountId:
      account === undefined ? undefined : resolveId(account, lookups.accounts),
    payeeName:
      payee === undefined ? undefined : resolvePayeeName(payee, lookups),
    // Replayed values carry whatever type their CRDT message held, which a
    // peer on another version could have got wrong. A mistyped value is
    // reported as empty rather than passed through: a numeric note would
    // reach a cell that expects text, and a string amount would fail both
    // sign comparisons in `useSnapshotValues` and render as two blank cells.
    notes:
      notes === undefined
        ? undefined
        : typeof notes === 'string'
          ? notes
          : null,
    categoryName:
      category === undefined
        ? undefined
        : resolveName(category, lookups.categories),
    amount:
      amount === undefined
        ? undefined
        : typeof amount === 'number'
          ? amount
          : null,
  };
}

/** The current row's raw values, used for columns with no messages at all. */
export function currentValues(
  transactionId: string,
  lookups: ChangeLogLookups,
): Record<string, string | number | null> {
  const transaction = lookups.transactions.get(transactionId);
  if (!transaction) {
    return {};
  }

  return {
    date: transaction.date,
    acct: transaction.acct,
    description: transaction.description,
    notes: transaction.notes,
    category: transaction.category,
    amount: transaction.amount,
    tombstone: transaction.tombstone,
  };
}

export function isSplitChild(
  transactionId: string,
  lookups: ChangeLogLookups,
): boolean {
  return lookups.transactions.get(transactionId)?.isChild === 1;
}
