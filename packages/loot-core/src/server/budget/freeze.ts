import * as db from '#server/db';
import * as sheet from '#server/sheet';
import { batchMessages } from '#server/sync';
import * as monthUtils from '#shared/months';

import { setBuffer } from './actions';
import { createAllBudgets, getBudgetType, getFutureBufferStart } from './base';

// In automatic mode, a month that has ended keeps the buffer it had when it
// was frozen, as a stored hold, instead of following later months. `frozen`
// only ever goes from 0 to 1, so run this in a mutator but never an undoable
// one: an undo would reopen the month on every device.
export async function freezeClosedMonths(): Promise<void> {
  if (getBudgetType() !== 'envelope') {
    return;
  }
  // A closed budget unloads its spreadsheet and every load creates a new
  // one, so this tells whether the file was closed or reopened while it ran
  const spreadsheet = sheet.get();
  const startMonth = await getFutureBufferStart();
  if (!startMonth) {
    return;
  }

  // One clock read per run, so the months it closes don't depend on when
  // each step runs
  const lastClosed = monthUtils.prevMonth(monthUtils.currentMonth());
  if (lastClosed < startMonth) {
    return;
  }

  // The start month can come from another device through sync and be
  // older than this load's months, so create any that are missing
  await createAllBudgets();

  const frozenRows = await db.all<Pick<db.DbZeroBudgetMonth, 'id'>>(
    'SELECT id FROM zero_budget_months WHERE frozen = 1',
  );
  const frozen = new Set(frozenRows.map(row => row.id));
  const months = monthUtils
    .rangeInclusive(startMonth, lastClosed)
    .filter(month => !frozen.has(month));
  if (months.length === 0) {
    return;
  }

  // This is the last wait a close or a load can run during. After it,
  // setBuffer only collects messages, and applying them doesn't wait on I/O.
  await sheet.waitOnSpreadsheet();
  if (sheet.get() !== spreadsheet) {
    return;
  }
  const buffers = months.map(month => ({
    month,
    amount: sheet.getCellValue(
      monthUtils.sheetForMonth(month),
      'buffered-computed',
    ),
  }));

  await batchMessages(async () => {
    for (const { month, amount } of buffers) {
      await setBuffer(month, amount, true);
    }
  });
}
