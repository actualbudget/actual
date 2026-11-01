import * as db from '#server/db';
import * as sheet from '#server/sheet';
import { resolveName } from '#server/spreadsheet/util';
import * as monthUtils from '#shared/months';

import { slotFor } from './pockets';
import type { LaneStatus } from './pockets';

// The envelope cells of a category whose base slot is not just its own lane
// (MC-10.6): after a base-child cutover, or while it inherits retired or
// duplicate base lanes. Its budget, carryover and leftover cells then show
// the slot: every base lane resolved to the category, each under its own
// carry and reset rule (lanes never merge). The category's leftover formula
// applies one carry rule to the summed balance, so `carry-adjust-<cat>`
// holds the difference between the lanes' own carry-ins and that rule, and
// `carry-adjust-total` gives the matching overspending back to To Budget.
// Both are 0 for every other category, whose cells stay upstream's.

type Lane = { id: string; isCategoryLane: boolean };

type LaneMonth = { assigned: number; spent: number; carryover: boolean };

/** Categories whose cells this module wrote, per loaded sheet. */
const synced = new WeakMap<object, Set<string>>();

const dbMonth = (month: string) => Number(month.replace('-', ''));

/** Each live expense category's base lanes, when they are not just its own. */
function divergentSlots(): Map<string, Lane[]> {
  const categories = new Set(
    db
      .runQuery<{ id: string }>(
        'SELECT id FROM categories WHERE tombstone = 0 AND is_income = 0',
        [],
        true,
      )
      .map(row => row.id),
  );
  const lanes = new Map<string, Lane[]>();
  for (const row of db.runQuery<{
    lane: string;
    category: string;
    pocket: string | null;
  }>(
    // Empty tombstoned lanes are hidden and hold nothing.
    `SELECT r.lane AS lane, r.effective_category AS category, p.id AS pocket
       FROM slot_resolution r
       LEFT JOIN category_pockets p ON p.id = r.lane
     WHERE r.kind = 'base' AND r.effective_category IS NOT NULL
       AND NOT (IFNULL(p.tombstone, 0) = 1 AND r.active = 0)
     ORDER BY r.lane`,
    [],
    true,
  )) {
    if (!categories.has(row.category)) continue;
    lanes.set(row.category, [
      ...(lanes.get(row.category) ?? []),
      { id: row.lane, isCategoryLane: row.pocket === null },
    ]);
  }
  for (const [category, members] of lanes) {
    if (members.length === 1 && members[0].id === category) {
      lanes.delete(category);
    }
  }
  // A category whose own lane resolves elsewhere and that has no other lane
  // (an unresolved resolution keeps a category's own cells).
  for (const category of categories) {
    if (!lanes.has(category) && ownLaneMoved(category)) lanes.set(category, []);
  }
  return lanes;
}

function ownLaneMoved(category: string) {
  const row = db.firstSync<{ category: string | null }>(
    'SELECT effective_category AS category FROM slot_resolution WHERE lane = ?',
    [category],
  );
  return row != null && row.category !== category;
}

/** A lane's assignments, carry flags and eligible spending by month. */
function laneMonths(lane: Lane): Map<number, LaneMonth> {
  const months = new Map<number, LaneMonth>();
  const at = (month: number) => {
    const found = months.get(month) ?? {
      assigned: 0,
      spent: 0,
      carryover: false,
    };
    months.set(month, found);
    return found;
  };
  for (const cell of db.runQuery<{
    month: number;
    amount: number | null;
    carryover: number | null;
  }>(
    lane.isCategoryLane
      ? 'SELECT month, amount, carryover FROM zero_budgets WHERE category = ?'
      : 'SELECT month, amount, carryover FROM pocket_budgets WHERE lane = ?',
    [lane.id],
    true,
  )) {
    const entry = at(cell.month);
    entry.assigned += cell.amount ?? 0;
    entry.carryover = cell.carryover === 1;
  }
  for (const row of db.runQuery<{ month: number; amount: number | null }>(
    `SELECT t.date / 100 AS month, SUM(t.amount) AS amount
       FROM v_transaction_lanes l JOIN transactions t ON t.id = l.id
     WHERE l.lane = ? GROUP BY t.date / 100`,
    [lane.id],
    true,
  )) {
    at(row.month).spent += row.amount ?? 0;
  }
  return months;
}

type SlotCells = {
  budget: number;
  carryover: boolean;
  adjust: number;
};

/**
 * A divergent category's cells in each created month, by each lane's own
 * recurrence from the first created month (as the sheet starts from its
 * blank month): budget and carryover of the slot, and the carry adjustment.
 */
function slotCells(
  category: string,
  lanes: Lane[],
  months: string[],
): Map<string, SlotCells> {
  const own = slotFor(category, '');
  const histories = lanes.map(lane => ({ lane, months: laneMonths(lane) }));
  const leftovers = new Map<string, number>();
  const carries = new Map<string, boolean>();
  let ownCarry = false;
  const result = new Map<string, SlotCells>();
  for (const month of months) {
    let budget = 0;
    let carryIn = 0;
    let previous = 0;
    let carryover = false;
    for (const { lane, months: history } of histories) {
      const entry = history.get(dbMonth(month));
      const last = leftovers.get(lane.id) ?? 0;
      const laneCarryIn = carries.get(lane.id) || last > 0 ? last : 0;
      const assigned = entry?.assigned ?? 0;
      leftovers.set(lane.id, assigned + (entry?.spent ?? 0) + laneCarryIn);
      carries.set(lane.id, entry?.carryover ?? false);
      budget += assigned;
      carryIn += laneCarryIn;
      previous += last;
      if (lane.id === own) carryover = entry?.carryover ?? false;
    }
    // What the category's single rule would carry in from last month.
    const ruled = ownCarry || previous > 0 ? previous : 0;
    result.set(month, { budget, carryover, adjust: carryIn - ruled });
    ownCarry = carryover;
  }
  return result;
}

function setCell(month: string, name: string, value: number | boolean) {
  const sheetName = monthUtils.sheetForMonth(month);
  if (sheet.getCellValue(sheetName, name) !== value) {
    sheet.get().set(resolveName(sheetName, name), value);
  }
}

/** Upstream's cells again, for a category whose slot is its own lane. */
function restore(category: string, months: string[]) {
  for (const month of months) {
    const row = db.firstSync<{ amount: number | null; carryover: number }>(
      'SELECT amount, carryover FROM zero_budgets WHERE month = ? AND category = ?',
      [dbMonth(month), category],
    );
    setCell(month, `budget-${category}`, row?.amount ?? 0);
    setCell(month, `carryover-${category}`, row?.carryover === 1);
    setCell(month, `carry-adjust-${category}`, 0);
  }
}

/**
 * Writes the budget, carryover and carry adjustment cells of every
 * divergent base slot, and restores those of categories that stopped being
 * divergent. Envelope budgets only; runs after every applied batch and
 * whenever the budget cells are loaded.
 */
export function syncBaseSlots() {
  const spreadsheet = sheet.get();
  const meta = spreadsheet.meta();
  if ((meta.budgetType || 'envelope') !== 'envelope') return;
  const months = [...((meta.createdMonths as Set<string>) ?? [])].sort();
  if (months.length === 0) return;
  const slots = divergentSlots();
  const previous = synced.get(spreadsheet) ?? new Set<string>();
  const totals = new Map(months.map(month => [month, 0]));
  spreadsheet.startTransaction();
  try {
    for (const category of previous) {
      if (!slots.has(category)) restore(category, months);
    }
    for (const [category, lanes] of slots) {
      for (const [month, cells] of slotCells(category, lanes, months)) {
        setCell(month, `budget-${category}`, cells.budget);
        setCell(month, `carryover-${category}`, cells.carryover);
        setCell(month, `carry-adjust-${category}`, cells.adjust);
        totals.set(month, totals.get(month)! + cells.adjust);
      }
    }
    for (const [month, total] of totals) {
      setCell(month, 'carry-adjust-total', total);
    }
  } finally {
    spreadsheet.endTransaction();
  }
  synced.set(spreadsheet, new Set(slots.keys()));
}

/** One base lane's month, for the base slot's details and repairs. */
export type BaseLaneMonth = {
  laneId: string;
  kind: 'own' | 'inherited';
  originCategoryId: string;
  status: LaneStatus;
  budgeted: number;
  spent: number;
  /** What carried in after the lane's own reset of last month. */
  carryIn: number;
  balance: number;
  carryover: boolean;
};

/**
 * A category's base lanes in a month (MC-10.6, F4): its own lane first,
 * then every other base lane resolved to it, each by its own recurrence
 * from the first created month, as the sheet computes them.
 */
export async function baseSlotLanes({
  month,
  category,
}: {
  month: string;
  category: string;
}): Promise<{ slotId: string | null; lanes: BaseLaneMonth[] }> {
  const own = slotFor(category, '');
  const rows = db.runQuery<{
    lane: string;
    origin: string;
    status: LaneStatus;
    pocket: string | null;
  }>(
    `SELECT r.lane AS lane, r.origin_category AS origin, r.status AS status,
        p.id AS pocket
       FROM slot_resolution r
       LEFT JOIN category_pockets p ON p.id = r.lane
     WHERE r.kind = 'base' AND r.effective_category = ?
       AND NOT (IFNULL(p.tombstone, 0) = 1 AND r.active = 0)
     ORDER BY r.lane`,
    [category],
    true,
  );
  const created = [
    ...((sheet.get().meta().createdMonths as Set<string>) ?? []),
  ].sort();
  const months = created.filter(m => m <= month);
  if (months.at(-1) !== month) months.push(month);
  const lanes = rows.map(row => {
    const history = laneMonths({
      id: row.lane,
      isCategoryLane: row.pocket === null,
    });
    let leftover = 0;
    let carries = false;
    let current = { budgeted: 0, spent: 0, carryIn: 0, carryover: false };
    for (const m of months) {
      const entry = history.get(dbMonth(m));
      const carryIn = carries || leftover > 0 ? leftover : 0;
      current = {
        budgeted: entry?.assigned ?? 0,
        spent: entry?.spent ?? 0,
        carryIn,
        carryover: entry?.carryover ?? false,
      };
      leftover = current.budgeted + current.spent + carryIn;
      carries = current.carryover;
    }
    return {
      laneId: row.lane,
      kind: row.lane === own ? ('own' as const) : ('inherited' as const),
      originCategoryId: row.origin,
      status: row.status,
      budgeted: current.budgeted,
      spent: current.spent,
      carryIn: current.carryIn,
      balance: leftover,
      carryover: current.carryover,
    };
  });
  lanes.sort((a, b) =>
    a.kind !== b.kind
      ? a.kind === 'own'
        ? -1
        : 1
      : a.laneId < b.laneId
        ? -1
        : 1,
  );
  return { slotId: own, lanes };
}

/**
 * Live expense categories that display repairable base history (MC-10.6):
 * any base lane resolved to them other than their own live lane (inherited,
 * duplicate, orphan or later-generation lanes), or any such lane that is
 * not live (a retirement cycle leaves a category's own lane unresolved
 * under itself). Empty tombstoned lanes hold nothing to repair.
 */
export async function baseSlotCategories(): Promise<string[]> {
  return db
    .runQuery<{ category: string }>(
      `SELECT DISTINCT r.effective_category AS category FROM slot_resolution r
         JOIN categories c ON c.id = r.effective_category
           AND c.tombstone = 0 AND c.is_income = 0
         LEFT JOIN category_pockets p ON p.id = r.lane
       WHERE r.kind = 'base'
         AND NOT (IFNULL(p.tombstone, 0) = 1 AND r.active = 0)
         AND (r.lane != r.effective_category OR r.status != 'live')
       ORDER BY category`,
      [],
      true,
    )
    .map(row => row.category);
}
