import * as db from '#server/db';
import * as sheet from '#server/sheet';
import { batchMessages } from '#server/sync';
import { clearUndo } from '#server/undo';
import * as monthUtils from '#shared/months';

import {
  dbMonth,
  FUTURE_BUFFER_PREF,
  getFutureBufferStart,
  setBuffer,
  setCarryover,
} from './actions';
import { getBudgetType } from './base';
import { readUnfrozenBuffers } from './freeze';

export type FutureBufferMode = 'manual' | 'automatic';

// Neither direction can be undone: turning the mode off freezes months, and
// an undo of an edit from before the switch would apply to months the other
// mode now computes. Run it in a mutator but never an undoable one.
export async function setFutureBufferMode({
  mode,
}: {
  mode: FutureBufferMode;
}): Promise<void> {
  if (mode === 'automatic') {
    // Turning it on again while it's on would move the start month later
    // and hand the months in between back to their old manual holds
    if (getBudgetType() === 'envelope' && !(await getFutureBufferStart())) {
      await db.update('preferences', {
        id: FUTURE_BUFFER_PREF,
        value: monthUtils.currentMonth(),
      });
    }
  } else {
    await turnOffFutureBuffer();
  }
  clearUndo();
}

// Turns automatic mode off without moving any month's To Budget: closed
// months are frozen, and every other managed month keeps its computed buffer
// as a manual hold. Returns false if the mode was already off.
export async function turnOffFutureBuffer(): Promise<boolean> {
  const spreadsheet = sheet.get();
  const startMonth = await getFutureBufferStart();
  if (!startMonth) {
    return false;
  }

  // One clock read per run, as in the freeze
  const currentMonth = monthUtils.currentMonth();
  const buffers =
    getBudgetType() === 'envelope'
      ? await readUnfrozenBuffers(spreadsheet, startMonth)
      : [];
  if (buffers == null) {
    return false;
  }

  // Income auto-hold flags are ignored in managed months but would apply
  // again once the mode is off. Name the table: this also runs just before
  // a switch to Tracking, and the switch must not touch `reflect_budgets`.
  const autoHolds = await db.all<Pick<db.DbZeroBudget, 'id'>>(
    `SELECT b.id FROM zero_budgets b
     JOIN categories c ON c.id = b.category
     WHERE c.is_income = 1 AND b.carryover = 1 AND b.month >= ?`,
    [dbMonth(startMonth)],
  );
  const incomeCategories = await db.all<Pick<db.DbCategory, 'id'>>(
    'SELECT id FROM categories WHERE is_income = 1 AND tombstone = 0',
  );

  await batchMessages(async () => {
    // The months before the current month are frozen, as the freeze would.
    // setBuffer skips those whose stored value already matches.
    for (const { month, amount } of buffers) {
      await setBuffer(month, amount, month < currentMonth ? true : undefined);
    }

    for (const { id } of autoHolds) {
      await db.update('zero_budgets', { id, carryover: 0 });
    }
    // Months after the start month that inherit their flag would otherwise
    // pick up an auto-hold set before it
    for (const { id } of incomeCategories) {
      await setCarryover(
        'zero_budgets',
        id,
        dbMonth(startMonth).toString(),
        false,
      );
    }

    await db.update('preferences', { id: FUTURE_BUFFER_PREF, value: null });
  });
  return true;
}
