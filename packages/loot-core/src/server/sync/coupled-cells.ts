import * as db from '#server/db';
import { isMissingSchemaError } from '#shared/errors';
import { parseRate } from '#shared/exchange-rate';

// CRDT messages resolve each cell independently, so values that must change
// together are written into one authority cell as well. Inside every apply
// transaction (and after deferred replay or budget load) the dependent
// columns are recomputed from that cell as plain SQL, without new messages.
// Every device derives the same values from the same winning cell.
type CoupledTable = {
  authority: string;
  derive: (value: unknown) => Record<string, string | number | null> | null;
};

const RATE_KINDS = new Set(['dated', 'standing', 'fetched']);

export function exchangeRateSpec(spec: { rate: string; kind: string }): string {
  return JSON.stringify({
    rate: spec.rate,
    kind: spec.kind,
  });
}

function deriveExchangeRate(value: unknown) {
  if (typeof value !== 'string') return null;
  try {
    const spec: unknown = JSON.parse(value);
    if (
      typeof spec !== 'object' ||
      spec === null ||
      !('rate' in spec) ||
      !('kind' in spec) ||
      typeof spec.rate !== 'string' ||
      typeof spec.kind !== 'string' ||
      !RATE_KINDS.has(spec.kind) ||
      parseRate(spec.rate) !== spec.rate
    ) {
      return null;
    }
    return { rate: spec.rate, kind: spec.kind };
  } catch {
    return null;
  }
}

/**
 * A transaction's amount authority: `amount:native@account`, binding the
 * account with both amounts so a move and an edit made on different devices
 * resolve as one unit. Native is empty for a budget-currency account. The
 * MC-3.1 form `amount:native` (no account) stays readable.
 */
export function amountPair(
  amount: number,
  transactionAmount: number | null,
  account: string,
): string {
  if (
    !Number.isSafeInteger(amount) ||
    (transactionAmount !== null && !Number.isSafeInteger(transactionAmount))
  ) {
    throw new Error('foreign-pair-required');
  }
  return `${amount}:${transactionAmount ?? ''}@${account}`;
}

export function parseAmountPair(value: unknown): {
  amount: number;
  transaction_amount: number | null;
  acct?: string;
} | null {
  return deriveTransactionAmounts(value);
}

function deriveTransactionAmounts(value: unknown) {
  if (typeof value !== 'string') return null;
  const match = /^(-?\d+):(-?\d*)(?:@(.+))?$/.exec(value);
  if (!match) return null;
  const [, base, native, account] = match;
  // Only the account-bound form may leave native empty.
  if (native === '' && account === undefined) return null;
  const amount = Number(base);
  const transactionAmount = native === '' ? null : Number(native);
  if (
    !Number.isSafeInteger(amount) ||
    (transactionAmount !== null && !Number.isSafeInteger(transactionAmount))
  ) {
    return null;
  }
  return {
    amount,
    transaction_amount: transactionAmount,
    ...(account !== undefined && { acct: account }),
  };
}

const COUPLED_TABLES: Record<string, CoupledTable> = {
  exchange_rates: { authority: 'spec', derive: deriveExchangeRate },
  transactions: { authority: 'amount_pair', derive: deriveTransactionAmounts },
};

function deriveRows(
  table: string,
  { authority, derive }: CoupledTable,
  rows: Array<Record<string, unknown>>,
): boolean {
  let changedAny = false;
  for (const row of rows) {
    const derived = derive(row[authority]);
    if (!derived) continue;
    const changed = Object.entries(derived).filter(
      ([column, value]) => row[column] !== value,
    );
    if (changed.length === 0) continue;
    changedAny = true;
    db.runQuery(
      `UPDATE ${table} SET ${changed.map(([column]) => `${column} = ?`).join(', ')} WHERE id = ?`,
      [...changed.map(([, value]) => value), row.id as string],
    );
  }
  return changedAny;
}

// A fee-free exchange leg in a foreign account whose counterpart is a
// fee-free leg in a budget-currency account takes its base from that leg,
// so an import replacing either leg (replaceExchangeTotal) writes only its
// own row and both legs still cancel after any merge order.
const EXCHANGE_BASE_FROM = `
  FROM transactions c JOIN accounts a ON a.id = c.acct
  WHERE c.id = transactions.transferred_id
    AND c.transferred_id = transactions.id
    AND c.tombstone = 0 AND c.isParent = 0 AND c.isChild = 0
    AND a.currency IS NULL`;
const EXCHANGE_BASE_SQL = `
  UPDATE transactions
  SET amount = -(SELECT c.amount ${EXCHANGE_BASE_FROM})
  WHERE tombstone = 0 AND isParent = 0 AND isChild = 0
    AND transferred_id IS NOT NULL
    AND (SELECT currency FROM accounts WHERE id = transactions.acct) IS NOT NULL
    AND EXISTS (SELECT 1 ${EXCHANGE_BASE_FROM})
    AND amount IS NOT -(SELECT c.amount ${EXCHANGE_BASE_FROM})`;

function deriveExchangeBases(ids?: string[]): boolean {
  if (!ids) {
    return Number(db.runQuery(EXCHANGE_BASE_SQL).changes) > 0;
  }
  let changed = false;
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const result = db.runQuery(
      `${EXCHANGE_BASE_SQL} AND id IN (${chunk.map(() => '?').join(', ')})`,
      chunk,
    );
    changed = Number(result.changes) > 0 || changed;
  }
  return changed;
}

/**
 * Transaction ids with their transfer counterparts, including links an
 * apply batch sets, so rows whose values derive from a counterpart are
 * tracked with it.
 */
export function withTransferCounterparts(
  ids: string[],
  linked: string[] = [],
): string[] {
  const all = new Set([...ids, ...linked]);
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += 500) {
    const chunk = unique.slice(i, i + 500);
    const marks = chunk.map(() => '?').join(', ');
    for (const row of db.runQuery<{ id: string | null }>(
      `SELECT transferred_id AS id FROM transactions WHERE id IN (${marks})
       UNION SELECT id FROM transactions WHERE transferred_id IN (${marks})`,
      [...chunk, ...chunk],
      true,
    )) {
      if (row.id) all.add(row.id);
    }
  }
  return [...all];
}

/** Recompute dependent columns for the rows touched by an apply batch. */
export function deriveCoupledCells(idsPerTable: Record<string, string[]>) {
  for (const [table, ids] of Object.entries(idsPerTable)) {
    const coupled = COUPLED_TABLES[table];
    if (!coupled || ids.length === 0) continue;
    const unique = [...new Set(ids)];
    // Chunk to stay well inside SQLite's bound-parameter limit.
    for (let i = 0; i < unique.length; i += 500) {
      const chunk = unique.slice(i, i + 500);
      let rows;
      try {
        rows = db.runQuery<Record<string, unknown>>(
          `SELECT * FROM ${table} WHERE id IN (${chunk.map(() => '?').join(', ')})`,
          chunk,
          true,
        );
      } catch (e) {
        // A table from a newer migration: its messages were deferred.
        if (isMissingSchemaError(e)) break;
        throw e;
      }
      deriveRows(table, coupled, rows);
    }
  }
  const transactions = idsPerTable.transactions ?? [];
  if (transactions.length > 0) {
    deriveExchangeBases(withTransferCounterparts(transactions));
  }
}

/**
 * Budget-load pass: changed amounts invalidate any warm spreadsheet cache
 * computed from the pre-derivation values.
 */
export function deriveCoupledCellsForLoad() {
  db.transaction(() => {
    if (deriveAllCoupledCells().has('transactions')) {
      db.runQuery('DELETE FROM kvcache_key');
    }
  });
}

/**
 * Full pass used after deferred replay and when a budget loads. Returns the
 * tables whose dependent columns changed.
 */
export function deriveAllCoupledCells(): Set<string> {
  const changedTables = new Set<string>();
  for (const [table, coupled] of Object.entries(COUPLED_TABLES)) {
    try {
      const changed = deriveRows(
        table,
        coupled,
        db.runQuery<Record<string, unknown>>(
          `SELECT * FROM ${table} WHERE ${coupled.authority} IS NOT NULL`,
          [],
          true,
        ),
      );
      if (changed) changedTables.add(table);
      if (table === 'transactions' && deriveExchangeBases()) {
        changedTables.add(table);
      }
    } catch (e) {
      // The table or column may not exist before its migration runs.
      if (!isMissingSchemaError(e)) throw e;
    }
  }
  return changedTables;
}
