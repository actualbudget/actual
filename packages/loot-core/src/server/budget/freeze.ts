import * as db from '#server/db';
import * as sheet from '#server/sheet';
import { batchMessages } from '#server/sync';
import * as monthUtils from '#shared/months';

import { setBuffer } from './actions';
import { getBudgetType, getFutureBufferStart } from './base';

// In automatic mode, a month that has ended keeps the buffer it had when it
// was frozen, as a stored hold, instead of following later months. `frozen`
// only ever goes from 0 to 1, so run this in a mutator but never an undoable
// one: an undo would reopen the month on every device.
export async function freezeClosedMonths(): Promise<void> {
  if (getBudgetType() !== 'envelope') {
    return;
  }
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

  const frozenRows = await db.all<Pick<db.DbZeroBudgetMonth, 'id'>>(
    'SELECT id FROM zero_budget_months WHERE frozen = 1',
  );
  const frozen = new Set(frozenRows.map(row => row.id));
  const { createdMonths } = sheet.get().meta();
  const months = monthUtils
    .rangeInclusive(startMonth, lastClosed)
    .filter(month => !frozen.has(month) && createdMonths.has(month));
  if (months.length === 0) {
    return;
  }

  await sheet.waitOnSpreadsheet();
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
