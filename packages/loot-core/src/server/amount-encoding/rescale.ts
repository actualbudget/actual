import type * as SQL from '@jlongster/sql.js';

import * as sqlite from '#platform/server/sqlite';
import type { SqlParam } from '#platform/server/sqlite';
import { rescaleAmount, rescaleAmountGroup } from '#shared/amount-rescale';

type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
type JsonObject = { [key: string]: JsonValue };
type Transaction = {
  id: string;
  amount: number | null;
  isParent: number;
  isChild: number;
  parent_id: string | null;
  transferred_id: string | null;
  tombstone: number;
};

const numericColumns: Record<string, string[]> = {
  pending_transactions: ['amount'],
  accounts: ['balance_current', 'balance_available', 'balance_limit'],
  zero_budgets: ['amount', 'goal'],
  reflect_budgets: ['amount', 'goal'],
  zero_budget_months: ['buffered'],
};

function isObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Rewrites persisted units only. The caller owns encoding and sync publication. */
export function rescaleBudget(
  database: SQL.Database,
  sourcePrecision: number,
  targetPrecision: number,
): void {
  const rescale = (value: number | null) =>
    rescaleAmount(value, sourcePrecision, targetPrecision);
  rescale(0);

  sqlite.transaction(database, () => {
    const updates: Array<{ sql: string; params: SqlParam[] }> = [];
    function update(
      table: string,
      id: string,
      column: string,
      value: SqlParam,
    ) {
      updates.push({
        sql: `UPDATE ${table} SET ${column} = ? WHERE id = ?`,
        params: [value, id],
      });
    }

    const rows: Transaction[] = sqlite.runQuery(
      database,
      'SELECT id, amount, isParent, isChild, parent_id, transferred_id, tombstone FROM transactions ORDER BY id',
      [],
      true,
    );
    const byId = new Map(rows.map(row => [row.id, row]));
    const amounts = new Map(rows.map(row => [row.id, rescale(row.amount)]));
    const children = new Map<string, Transaction[]>();
    for (const row of rows) {
      if (row.isChild) {
        const parent = row.parent_id ? byId.get(row.parent_id) : undefined;
        // Deleted children of edited splits remain independently restorable.
        if (row.tombstone && (!parent || !parent.tombstone)) continue;
        if (
          !parent?.isParent ||
          parent.isChild ||
          parent.tombstone !== row.tombstone
        ) {
          continue;
        }
        const group = children.get(parent.id) ?? [];
        group.push(row);
        children.set(parent.id, group);
      }
    }
    const allocated = new Set<string>();
    for (const parent of rows.filter(row => row.isParent)) {
      const group = children.get(parent.id) ?? [];
      if (!group.length) continue;
      if (parent.amount === null || group.some(row => row.amount === null)) {
        throw new Error(`Missing split amount for ${parent.id}`);
      }
      const members = group.map(row => {
        if (row.amount === null) throw new Error('Missing split amount');
        return { id: row.id, amount: row.amount };
      });
      for (const row of rescaleAmountGroup(
        members,
        sourcePrecision,
        targetPrecision,
        parent.amount,
      )) {
        amounts.set(row.id, row.amount);
        allocated.add(row.id);
      }
    }
    for (const row of rows) {
      if (!row.transferred_id) continue;
      const counterpart = byId.get(row.transferred_id);
      if (
        !counterpart ||
        counterpart.transferred_id !== row.id ||
        row.amount === null ||
        counterpart.amount === null ||
        BigInt(row.amount) + BigInt(counterpart.amount) !== 0n
      ) {
        continue;
      }
      if (allocated.has(row.id)) {
        const amount = amounts.get(row.id);
        if (amount === undefined || amount === null) {
          throw new Error('Missing transfer amount');
        }
        if (
          allocated.has(counterpart.id) &&
          amounts.get(counterpart.id) !== -amount
        ) {
          throw new Error(`Conflicting split transfer rounding ${row.id}`);
        }
        amounts.set(counterpart.id, -amount);
      }
    }
    // A transfer counterpart can itself be a split parent. Check every relation
    // after allocation, before any SQL writes, so unsupported graphs fail closed.
    for (const [id, group] of children) {
      const total = group.reduce(
        (sum, row) => sum + BigInt(amounts.get(row.id) ?? 0),
        0n,
      );
      if (total !== BigInt(amounts.get(id) ?? 0)) {
        throw new Error(`Conflicting split total ${id}`);
      }
    }
    for (const row of rows) {
      update('transactions', row.id, 'amount', amounts.get(row.id) ?? null);
    }

    for (const [table, columns] of Object.entries(numericColumns)) {
      const values: Array<{ id: string } & Record<string, number | null>> =
        sqlite.runQuery(
          database,
          `SELECT id, ${columns.join(', ')} FROM ${table}`,
          [],
          true,
        );
      for (const row of values) {
        for (const column of columns) {
          update(table, row.id, column, rescale(row[column]));
        }
      }
    }

    function money(value: JsonValue | undefined): JsonValue {
      if (value === null) return null;
      if (typeof value !== 'number') {
        throw new Error('Invalid JSON money amount');
      }
      return rescale(value);
    }
    function convertItems(values: JsonValue, actions: boolean): JsonValue {
      if (!Array.isArray(values)) {
        throw new Error('Expected JSON conditions or actions array');
      }
      for (const item of values) {
        if (!isObject(item)) {
          throw new Error('Invalid JSON condition or action');
        }
        if (actions) {
          // Formula and template actions compute the amount when they run.
          const computed =
            isObject(item.options) &&
            Boolean(item.options.formula || item.options.template);
          if (
            (item.op === 'set' && item.field === 'amount' && !computed) ||
            (item.op === 'set-split-amount' &&
              isObject(item.options) &&
              item.options.method === 'fixed-amount')
          ) {
            item.value = money(item.value);
          }
        } else if (item.field === 'amount') {
          if (isObject(item.value)) {
            item.value.num1 = money(item.value.num1);
            item.value.num2 = money(item.value.num2);
          } else {
            item.value = money(item.value);
          }
        }
      }
      return values;
    }
    function convertJson(text: string, actions: boolean): string {
      return JSON.stringify(convertItems(JSON.parse(text), actions));
    }
    function moneyFields(items: JsonValue | undefined, fields: string[]) {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (!isObject(item)) continue;
        for (const field of fields) {
          if (field in item) item[field] = money(item[field]);
        }
      }
    }
    for (const table of ['rules', 'transaction_filters', 'custom_reports']) {
      for (const column of table === 'rules'
        ? ['conditions', 'actions']
        : ['conditions']) {
        const values: Array<{ id: string; value: string }> = sqlite.runQuery(
          database,
          `SELECT id, ${column} AS value FROM ${table} WHERE ${column} IS NOT NULL`,
          [],
          true,
        );
        for (const row of values) {
          update(
            table,
            row.id,
            column,
            convertJson(row.value, column === 'actions'),
          );
        }
      }
    }
    const widgets: Array<{ id: string; type: string; meta: string }> =
      sqlite.runQuery(
        database,
        'SELECT id, type, meta FROM dashboard WHERE meta IS NOT NULL',
        [],
        true,
      );
    for (const widget of widgets) {
      const meta: JsonValue = JSON.parse(widget.meta);
      if (!isObject(meta)) continue;
      if (Array.isArray(meta.conditions)) {
        meta.conditions = convertItems(meta.conditions, false);
      }
      // Crossover's expectedContribution is always read as cents, so it is not
      // a recorded-unit amount.
      if (widget.type === 'monte-carlo-card') {
        if ('minimumWithdrawal' in meta) {
          meta.minimumWithdrawal = money(meta.minimumWithdrawal);
        }
        moneyFields(meta.pots, ['startingBalance', 'annualFeeFixed']);
        moneyFields(meta.spendingPhases, ['annualWithdrawal']);
        moneyFields(meta.contributions, ['annualAmount']);
        moneyFields(meta.taxBands, ['from']);
      }
      update('dashboard', widget.id, 'meta', JSON.stringify(meta));
    }
    for (const { sql, params } of updates) {
      sqlite.runQuery(database, sql, params);
    }
  });
}
