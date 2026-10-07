import * as db from '#server/db';
import { liveMappedCategory } from '#server/transactions/foreign-guard';

import { isTrackingBudget } from './actions';

/** One side (before or after) of a row a dialog save changes. */
export type EditEffectSide = {
  account: string;
  category: string | null;
  /** YYYY-MM-DD */
  date: string;
  /** Base amount. */
  amount: number;
  /** A split parent summarizes its children and posts nothing itself. */
  isParent?: boolean;
  /** The account a transfer leg moves money to or from. */
  transferAccount?: string | null;
};

export type EditEffectRow = {
  before: EditEffectSide | null;
  after: EditEffectSide | null;
};

export type EditEffect = {
  category: string | null;
  name: string | null;
  kind: 'spending' | 'income' | 'uncategorized';
  amount: number;
};

async function isOnBudget(accountId: string, cache: Map<string, boolean>) {
  let onBudget = cache.get(accountId);
  if (onBudget === undefined) {
    const account = await db.first<{ offbudget: number }>(
      'SELECT offbudget FROM accounts WHERE id = ?',
      [accountId],
    );
    onBudget = !!account && account.offbudget !== 1;
    cache.set(accountId, onBudget);
  }
  return onBudget;
}

/**
 * The budget effects of a dialog save, by budgeted month: each category's
 * base change in each month that has any budgeted amount. Only postings
 * count: split parents summarize their children, off-budget rows are
 * outside the budget, and transfers between two on-budget accounts move
 * money within it (whatever their dates).
 */
export async function editEffects({
  rows,
}: {
  rows: EditEffectRow[];
}): Promise<Array<{ month: string; effects: EditEffect[] }>> {
  const onBudget = new Map<string, boolean>();
  const deltas = new Map<string, Map<string | null, number>>();
  for (const row of rows) {
    for (const [side, sign] of [
      [row.before, -1],
      [row.after, 1],
    ] as const) {
      if (!side || side.isParent) continue;
      if (!(await isOnBudget(side.account, onBudget))) continue;
      if (
        side.transferAccount &&
        (await isOnBudget(side.transferAccount, onBudget))
      ) {
        continue;
      }
      const month = side.date.slice(0, 7);
      const category = await liveMappedCategory(side.category);
      const byCategory = deltas.get(month) ?? new Map<string | null, number>();
      byCategory.set(
        category,
        (byCategory.get(category) ?? 0) + sign * side.amount,
      );
      deltas.set(month, byCategory);
    }
  }

  const table = isTrackingBudget() ? 'reflect_budgets' : 'zero_budgets';
  const result: Array<{ month: string; effects: EditEffect[] }> = [];
  for (const month of [...deltas.keys()].sort()) {
    const budgeted = await db.first(
      // Deleting a category copies its assignments to the target and keeps
      // the source rows, so only live categories count.
      `SELECT 1 FROM ${table} b
         JOIN categories c ON c.id = b.category AND c.tombstone = 0
         WHERE b.month = ? AND b.amount != 0 LIMIT 1`,
      [Number(month.replace('-', ''))],
    );
    if (!budgeted) continue;
    const effects: EditEffect[] = [];
    for (const [category, amount] of deltas.get(month)!) {
      if (amount === 0) continue;
      const info = category
        ? await db.first<{ name: string; is_income: number }>(
            'SELECT name, is_income FROM categories WHERE id = ?',
            [category],
          )
        : null;
      effects.push({
        category,
        name: info?.name ?? null,
        kind: !info ? 'uncategorized' : info.is_income ? 'income' : 'spending',
        amount,
      });
    }
    if (effects.length > 0) result.push({ month, effects });
  }
  return result;
}
