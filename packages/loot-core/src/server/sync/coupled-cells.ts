import { derivePocketBudget } from '#server/budget/pockets';
import * as db from '#server/db';
import { isMissingSchemaError } from '#shared/errors';
import { parseRate } from '#shared/exchange-rate';

// CRDT messages resolve each cell independently, so values that must change
// together are written into one authority cell as well. Inside every apply
// transaction (and after deferred replay or budget load) the dependent
// columns are recomputed from that cell as plain SQL, without new messages.
// Every device derives the same values from the same winning cell.
type Coupled = {
  table: string;
  authority: string;
  /** Also derive rows whose authority is absent. */
  nullable?: boolean;
  derive: (
    value: unknown,
    row: Record<string, unknown>,
  ) => Record<string, string | number | null> | null;
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
 * An account's encoding as one value: `''` for the budget currency (its
 * recorded precision), `CUR.P` for a foreign account.
 */
export function encodingOf(
  currency: string | null,
  precision: number | null,
): string {
  return currency === null ? '' : `${currency}.${precision}`;
}

/**
 * The account encoding every reader uses: the authority when well formed,
 * else the one the currency columns name (a malformed cell is ignored, as
 * derivation ignores it).
 */
export function effectiveEncoding(
  encoding: unknown,
  currency: string | null,
  precision: number | null,
): string {
  return parseEncoding(encoding) !== null
    ? (encoding as string)
    : encodingOf(currency, precision);
}

export function parseEncoding(
  value: unknown,
): { currency: string | null; currency_precision: number | null } | null {
  if (value === '') return { currency: null, currency_precision: null };
  if (typeof value !== 'string') return null;
  const match = /^([A-Z]{3})\.(\d{1,2})$/.exec(value);
  if (!match) return null;
  const precision = Number(match[2]);
  return precision > 15
    ? null
    : { currency: match[1], currency_precision: precision };
}

/**
 * Cached bank balances as one value, stamped with the encoding they were
 * written in: `current:available:limit~ENC`, each integer possibly empty.
 */
export function balanceSpec(
  balances: {
    balance_current: number | null;
    balance_available: number | null;
    balance_limit: number | null;
  },
  encoding: string,
): string {
  const part = (value: number | null) => {
    if (value !== null && !Number.isSafeInteger(value)) {
      throw new Error('amount-invalid');
    }
    return value ?? '';
  };
  return `${part(balances.balance_current)}:${part(balances.balance_available)}:${part(balances.balance_limit)}~${encoding}`;
}

function deriveBalances(value: unknown, row: Record<string, unknown>) {
  if (typeof value !== 'string') return null;
  const match = /^(-?\d*):(-?\d*):(-?\d*)~(.*)$/.exec(value);
  if (!match) return null;
  const [, current, available, limit, stamp] = match;
  const integer = (text: string) => (text === '' ? null : Number(text));
  const values = [current, available, limit].map(integer);
  if (values.some(v => v !== null && !Number.isSafeInteger(v))) return null;
  // Balances written in another encoding than the account's are absent.
  const matches =
    stamp ===
    effectiveEncoding(
      row.encoding,
      (row.currency as string | null) ?? null,
      (row.currency_precision as number | null) ?? null,
    );
  return {
    balance_current: matches ? values[0] : null,
    balance_available: matches ? values[1] : null,
    balance_limit: matches ? values[2] : null,
  };
}

/**
 * A transaction's amount authority: `amount:native@account~ENC`, binding the
 * account and the encoding its integers were written in with both amounts,
 * so a move and an edit made on different devices resolve as one unit, and
 * a row written under an account's previous encoding is detectable. Native
 * is empty for a budget-currency account, whose stamp is empty. The MC-3.1
 * form `amount:native` and the MC-5.1 form `amount:native@account` stay
 * readable and carry no stamp.
 */
export function amountPair(
  amount: number,
  transactionAmount: number | null,
  account: string,
  encoding: string,
): string {
  if (
    !Number.isSafeInteger(amount) ||
    (transactionAmount !== null && !Number.isSafeInteger(transactionAmount))
  ) {
    throw new Error('foreign-pair-required');
  }
  return `${amount}:${transactionAmount ?? ''}@${account}~${encoding}`;
}

/** The encoding a pair is stamped with, or undefined for unstamped forms. */
export function pairEncoding(value: unknown): string | undefined {
  if (typeof value !== 'string' || !deriveTransactionAmounts(value)) {
    return undefined;
  }
  const match = /@[^~]+~(.*)$/.exec(value);
  // A malformed stamp names no encoding: the pair counts as unstamped.
  return match && parseEncoding(match[1]) !== null ? match[1] : undefined;
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
  const match = /^(-?\d+):(-?\d*)(?:@([^~]+)(?:~[^~]*)?)?$/.exec(value);
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

// In order: account encodings before the balances stamped with them and the
// transaction pairs and exchange bases that read them.
const COUPLED: Coupled[] = [
  { table: 'exchange_rates', authority: 'spec', derive: deriveExchangeRate },
  { table: 'accounts', authority: 'encoding', derive: parseEncoding },
  { table: 'accounts', authority: 'balance_spec', derive: deriveBalances },
  {
    table: 'transactions',
    authority: 'amount_pair',
    derive: value => {
      const derived = deriveTransactionAmounts(value);
      return (
        derived && { ...derived, pair_encoding: pairEncoding(value) ?? null }
      );
    },
  },
  // After the lanes whose encodings judge their cells.
  {
    table: 'pocket_budgets',
    authority: 'budget_pair',
    nullable: true,
    derive: (value, row) => derivePocketBudget(value, row),
  },
];

function deriveRows(
  table: string,
  { authority, derive }: Coupled,
  rows: Array<Record<string, unknown>>,
): boolean {
  let changedAny = false;
  for (const row of rows) {
    const derived = derive(row[authority], row);
    if (!derived) continue;
    const changed = Object.entries(derived).filter(
      ([column, value]) => row[column] !== value,
    );
    if (changed.length === 0) continue;
    changedAny = true;
    // Later authorities of the same row read the derived values.
    Object.assign(row, derived);
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

/** A lane's cells are judged by its encoding, which can arrive after them. */
function cellsOfLanes(lanes: string[]): string[] {
  const ids: string[] = [];
  const unique = [...new Set(lanes)];
  for (let i = 0; i < unique.length; i += 500) {
    const chunk = unique.slice(i, i + 500);
    try {
      for (const row of db.runQuery<{ id: string }>(
        `SELECT id FROM pocket_budgets WHERE lane IN (${chunk.map(() => '?').join(', ')})`,
        chunk,
        true,
      )) {
        ids.push(row.id);
      }
    } catch (e) {
      if (isMissingSchemaError(e)) return ids;
      throw e;
    }
  }
  return ids;
}

/** Recompute dependent columns for the rows touched by an apply batch. */
export function deriveCoupledCells(idsPerTable: Record<string, string[]>) {
  for (const coupled of COUPLED) {
    const { table } = coupled;
    const ids =
      table === 'pocket_budgets'
        ? [
            ...(idsPerTable.pocket_budgets ?? []),
            ...cellsOfLanes(idsPerTable.category_pockets ?? []),
          ]
        : (idsPerTable[table] ?? []);
    if (ids.length === 0) continue;
    const unique = [...new Set(ids)];
    // Chunk to stay well inside SQLite's bound-parameter limit.
    for (let i = 0; i < unique.length; i += 500) {
      const chunk = unique.slice(i, i + 500);
      let rows;
      try {
        rows = db.runQuery<Record<string, unknown>>(
          `SELECT * FROM ${table} WHERE id IN (${chunk.map(() => '?').join(', ')})
             ${coupled.nullable ? '' : `AND ${coupled.authority} IS NOT NULL`}`,
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
  for (const coupled of COUPLED) {
    const { table } = coupled;
    try {
      const changed = deriveRows(
        table,
        coupled,
        db.runQuery<Record<string, unknown>>(
          `SELECT * FROM ${table}${coupled.nullable ? '' : ` WHERE ${coupled.authority} IS NOT NULL`}`,
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
