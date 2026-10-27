import * as db from '#server/db';
import { batchMessages } from '#server/sync';
import * as monthUtils from '#shared/months';

const SEEDED_PREF = 'carryoverChainSeeded';

function dbMonth(month: string): number {
  return parseInt(month.replace('-', ''));
}

function fromDbMonth(month: number): string {
  const str = month.toString();
  return `${str.slice(0, 4)}-${str.slice(4)}`;
}

// Carryover used to stop at the first month without a budget row. Now that
// such a month inherits the previous month's flag, a window that ended
// before this version would start carrying again. This writes an explicit
// off at the month after each window that already ended, once per file.
// A window whose last row is last month keeps carrying into this month.
export async function seedCarryoverChain(): Promise<void> {
  const seeded = await db.first<Pick<db.DbPreference, 'value'>>(
    'SELECT value FROM preferences WHERE id = ?',
    [SEEDED_PREF],
  );
  if (seeded?.value === 'true') {
    return;
  }

  const currentMonth = dbMonth(monthUtils.currentMonth());

  await batchMessages(async () => {
    for (const table of ['zero_budgets', 'reflect_budgets']) {
      const rows = await db.all<
        Pick<db.DbZeroBudget, 'month' | 'category' | 'carryover'>
      >(`SELECT month, category, carryover FROM ${table}`);
      const existing = new Set(rows.map(row => `${row.month}-${row.category}`));

      for (const row of rows) {
        if (row.carryover !== 1) {
          continue;
        }
        const next = dbMonth(monthUtils.nextMonth(fromDbMonth(row.month)));
        const id = `${next}-${row.category}`;
        if (next < currentMonth && !existing.has(id)) {
          existing.add(id);
          await db.insert(table, {
            id,
            month: next,
            category: row.category,
            carryover: 0,
          });
        }
      }
    }

    await db.update('preferences', { id: SEEDED_PREF, value: 'true' });
  });
}
