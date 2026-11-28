// Edits of the budgets of many categories and currency lines at once, such
// as when the default currency changes
import * as db from '#server/db';
import { withMutatorContext } from '#server/mutators';
import { batchMessages } from '#server/sync';
import { convertAtMonthRate } from '#shared/fx/sql';
import { safeNumber } from '#shared/util';

import { fromLineMonth } from './category-currencies';

type BudgetRow = Pick<
  db.DbZeroBudget,
  'id' | 'month' | 'category' | 'amount' | 'carryover'
> & {
  goal: number | null;
  long_goal: number | null;
};

function hasBudgetData(row: BudgetRow): boolean {
  return (
    !!row.amount || !!row.carryover || row.goal != null || row.long_goal != null
  );
}

type MonthFilter = (month: number) => boolean;
const everyMonth: MonthFilter = () => true;

// The budget rows of one table, edited in memory and written once, as the
// writes of a batch are applied at its end
export class BudgetRows {
  private byKey: Map<string, BudgetRow>;
  private changed = new Set<string>();
  private created = new Set<string>();

  constructor(rows: BudgetRow[]) {
    this.byKey = new Map(
      rows.map(row => [`${row.month}|${row.category}`, { ...row }]),
    );
  }

  private rowsOf(id: string): BudgetRow[] {
    return [...this.byKey.values()].filter(row => row.category === id);
  }

  // The row of `id` in `month`, created empty when it has none
  private targetOf(month: number, id: string): { key: string; row: BudgetRow } {
    const key = `${month}|${id}`;
    let row = this.byKey.get(key);
    if (!row) {
      row = {
        id: `${month}-${id}`,
        month,
        category: id,
        amount: 0,
        carryover: 0,
        goal: null,
        long_goal: null,
      };
      this.byKey.set(key, row);
      this.created.add(key);
    }
    return { key, row };
  }

  // Merges the budgets, rollovers and goals of `from` into `to`, both
  // categories or currency lines, in the months (YYYYMM) `isIn` accepts
  move(from: string, to: string, isIn: MonthFilter = everyMonth) {
    for (const source of this.rowsOf(from)) {
      if (!isIn(source.month) || !hasBudgetData(source)) {
        continue;
      }
      const { key: targetKey, row: target } = this.targetOf(source.month, to);
      target.amount = safeNumber((target.amount || 0) + (source.amount || 0));
      target.carryover = target.carryover || source.carryover ? 1 : 0;
      target.goal = source.goal ?? target.goal;
      target.long_goal = source.long_goal ?? target.long_goal;
      source.amount = 0;
      source.carryover = 0;
      source.goal = null;
      source.long_goal = null;
      this.changed.add(targetKey);
      this.changed.add(`${source.month}|${from}`);
    }
  }

  // Converts the budgeted amounts and goals of `ids` from one currency into
  // another at each month's rate, the value To Budget counted for them, in
  // the months (YYYYMM) `isIn` accepts
  convert(
    ids: ReadonlySet<string>,
    from: string,
    to: string,
    isIn: MonthFilter,
  ) {
    for (const [key, row] of this.byKey) {
      if (
        !ids.has(row.category) ||
        !isIn(row.month) ||
        (!row.amount && !row.goal)
      ) {
        continue;
      }
      const month = fromLineMonth(row.month);
      if (row.amount) {
        row.amount = convertAtMonthRate(row.amount, from, to, month);
      }
      if (row.goal) {
        row.goal = convertAtMonthRate(row.goal, from, to, month);
      }
      this.changed.add(key);
    }
  }

  // Moves the budgeted amounts of `from`, a currency line in `fromCurrency`,
  // into `to`, its category in `toCurrency`, converted at each month's rate:
  // what To Budget counted for them. Its rollover goes with the line.
  convertInto(
    from: string,
    to: string,
    fromCurrency: string,
    toCurrency: string,
  ) {
    for (const source of this.rowsOf(from)) {
      if (!source.amount && !source.carryover) {
        continue;
      }
      const { key: targetKey, row: target } = this.targetOf(source.month, to);
      if (source.amount) {
        target.amount = safeNumber(
          (target.amount || 0) +
            convertAtMonthRate(
              source.amount,
              fromCurrency,
              toCurrency,
              fromLineMonth(source.month),
            ),
        );
        this.changed.add(targetKey);
      }
      source.amount = 0;
      source.carryover = 0;
      this.changed.add(`${source.month}|${from}`);
    }
  }

  async write(table: 'zero_budgets' | 'reflect_budgets') {
    for (const key of this.changed) {
      const row = this.byKey.get(key);
      if (!row) {
        continue;
      }
      const values = {
        amount: row.amount,
        carryover: row.carryover,
        goal: row.goal,
        long_goal: row.long_goal,
      };
      if (this.created.has(key)) {
        await db.insert(table, {
          id: row.id,
          month: row.month,
          category: row.category,
          ...values,
        });
      } else {
        await db.update(table, { id: row.id, ...values });
      }
    }
  }
}

export async function editBudgets(edit: (rows: BudgetRows) => void) {
  for (const table of ['zero_budgets', 'reflect_budgets'] as const) {
    const rows = new BudgetRows(
      await db.all<BudgetRow>(
        `SELECT id, month, category, amount, carryover, goal, long_goal
           FROM ${table}`,
      ),
    );
    edit(rows);
    await rows.write(table);
  }
}

// Preferences can't be deleted, so undoing a change that created one fails.
// The rows are created first, empty, outside of what undo records, so undo
// only brings their values back.
export async function createMissingPreferences(ids: string[]) {
  const existing = new Set(
    (
      await db.all<Pick<db.DbPreference, 'id'>>(
        `SELECT id FROM preferences WHERE id IN (${ids.map(() => '?').join(', ')})`,
        ids,
      )
    ).map(row => row.id),
  );
  const missing = ids.filter(id => !existing.has(id));
  if (missing.length > 0) {
    await withMutatorContext({ undoListening: false }, () =>
      batchMessages(async () => {
        for (const id of missing) {
          await db.update('preferences', { id, value: null });
        }
      }),
    );
  }
}
