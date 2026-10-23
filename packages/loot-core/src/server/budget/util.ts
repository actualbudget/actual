import * as db from '#server/db';
import * as sheet from '#server/sheet';
import { number } from '#server/spreadsheet/globals';
import * as monthUtils from '#shared/months';
// @ts-strict-ignore
import { safeNumber } from '#shared/util';

export { number } from '#server/spreadsheet/globals';

export function sumAmounts(...amounts) {
  return safeNumber(
    amounts.reduce((total, amount) => {
      return total + number(amount);
    }, 0),
  );
}

export function flatten2(arr) {
  return Array.prototype.concat.apply([], arr);
}

export function unflatten2(arr) {
  const res = [];
  for (let i = 0; i < arr.length; i += 2) {
    res.push([arr[i], arr[i + 1]]);
  }
  return res;
}

// Keep at least 12 months ahead available, or three months beyond the latest
// non-zero saved allocation in the active budget mode, whichever is later.
// Clearing the latest allocations shrinks the range without deleting cached sheets.
// Shared by sheet creation and bulk actions so both use the same bounds.
export function getBudgetRange(start: string, end: string) {
  start = monthUtils.getMonth(start);
  end = monthUtils.getMonth(end);
  if (start > end) start = end;

  start = monthUtils.subMonths(start, 3);
  end = monthUtils.addMonths(end, 12);
  // Each mode extends from its own saved allocations, with a 12-month minimum.
  const table =
    sheet.get().meta().budgetType === 'tracking'
      ? 'reflect_budgets'
      : 'zero_budgets';
  const latest = db.firstSync<{ month: number | null }>(
    `SELECT MAX(b.month) AS month FROM ${table} b
     JOIN categories c ON c.id = b.category
     WHERE c.tombstone = 0 AND b.amount != 0`,
  );
  if (latest?.month) {
    const plannedMonth = String(latest.month);
    // Leave three empty months after the last allocation for continued planning.
    const plannedEnd = monthUtils.addMonths(
      `${plannedMonth.slice(0, 4)}-${plannedMonth.slice(4)}`,
      3,
    );
    if (plannedEnd > end) end = plannedEnd;
  }
  return { start, end, range: monthUtils.rangeInclusive(start, end) };
}
