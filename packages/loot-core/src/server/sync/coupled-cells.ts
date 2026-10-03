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

export function amountPair(amount: number, transactionAmount: number): string {
  if (
    !Number.isSafeInteger(amount) ||
    !Number.isSafeInteger(transactionAmount)
  ) {
    throw new Error('foreign-pair-required');
  }
  return `${amount}:${transactionAmount}`;
}

export function parseAmountPair(
  value: unknown,
): { amount: number; transaction_amount: number } | null {
  return deriveTransactionAmounts(value);
}

function deriveTransactionAmounts(value: unknown) {
  if (typeof value !== 'string') return null;
  const match = /^(-?\d+):(-?\d+)$/.exec(value);
  if (!match) return null;
  const amount = Number(match[1]);
  const transactionAmount = Number(match[2]);
  if (
    !Number.isSafeInteger(amount) ||
    !Number.isSafeInteger(transactionAmount)
  ) {
    return null;
  }
  return { amount, transaction_amount: transactionAmount };
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
    } catch (e) {
      // The table or column may not exist before its migration runs.
      if (!isMissingSchemaError(e)) throw e;
    }
  }
  return changedTables;
}
