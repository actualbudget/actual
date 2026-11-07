import { v4 as uuidv4 } from 'uuid';

import * as db from '#server/db';
import { batchMessages } from '#server/sync';

import {
  captureDate,
  displayPrecision,
  entryRate,
  requestPrecision,
  slotMonth,
  slotOfLane,
  toBase,
  writeBaseOwn,
} from './pocket-flows';
import type {
  PocketWriteResult,
  RequestAmount,
  SlotMonth,
} from './pocket-flows';
import {
  createBaseLane,
  encodingCurrency,
  laneInfo,
  retireLane,
  routeFromCategory,
  setSlotMeta,
  slotFor,
  writePocketBudgetCell,
} from './pockets';
import type { LaneKind, LaneStatus } from './pockets';

// Deletion and repair of currency pockets and base children (MC-10.6).
// Deletion never copies, rescales or transfers amounts: a lane with history
// is retired into the destination's slot of the same kind and currency,
// whose display then includes it, so every budget figure stays unchanged.
// An empty lane is tombstoned without retirement. Each handler is one
// batch inside mutator(undoable(...)); undo tombstones the batch's
// retirements and new lanes. The repairs are the only writes that name a
// lane other than a slot's own lane, and they are never redirected.

type Resolution = {
  lane: string;
  kind: LaneKind;
  origin_category: string;
  encoding: string;
  effective_owner: string | null;
  effective_category: string | null;
  status: LaneStatus;
  active: number;
};

function resolutionOf(lane: string): Resolution | null {
  return db.firstSync<Resolution>(
    'SELECT * FROM slot_resolution WHERE lane = ?',
    [lane],
  );
}

/** Whether any of these lanes, or a lane resolved under them, has history. */
function hasHistory(lanes: string[]): boolean {
  if (lanes.length === 0) return false;
  const marks = lanes.map(() => '?').join(', ');
  return (
    db.firstSync(
      `SELECT 1 FROM slot_resolution WHERE active = 1
         AND (lane IN (${marks}) OR effective_owner IN (${marks})) LIMIT 1`,
      [...lanes, ...lanes],
    ) != null
  );
}

async function liveExpenseCategory(id: string, error: string) {
  const category = await db.first<{ is_income: number }>(
    'SELECT is_income FROM categories WHERE id = ? AND tombstone = 0',
    [id],
  );
  if (!category) throw new Error(error);
  if (category.is_income) throw new Error('pocket-category-income');
}

/**
 * Destination slots within one batch. Writes queued in a batch are not
 * readable until it ends, so a slot created here is remembered.
 */
function destinations() {
  const created = new Map<string, string>();
  return async (
    category: string,
    kind: LaneKind,
    encoding: string,
  ): Promise<string> => {
    const currency = encodingCurrency(encoding);
    const key = `${category}:${kind}:${currency}`;
    const known = created.get(key) ?? slotFor(category, currency);
    if (known) return known;
    let id: string;
    if (kind === 'base') {
      id = await createBaseLane(category);
    } else {
      // Created in the retired lane's own encoding, never rescaled.
      id = uuidv4();
      await db.insert('category_pockets', {
        id,
        category,
        kind: 'foreign',
        encoding,
        tombstone: 0,
      });
    }
    created.set(key, id);
    return id;
  };
}

type Destination = ReturnType<typeof destinations>;

/** Retirement and forward authority; reusing the lane id updates the row. */
async function retire(lane: string, owner: string) {
  await retireLane({ lane, owner });
}

/**
 * Deletes a currency pocket. With history, its lane is retired into the
 * destination category's canonical lane in that currency (created in the
 * retired lane's encoding only when the destination has none). Without
 * history, the lane is tombstoned.
 */
export async function deletePocket({
  id,
  transferId,
}: {
  id: string;
  transferId?: string | null;
}): Promise<void> {
  const info = laneInfo(id);
  if (info?.kind !== 'foreign') throw new Error('pocket-not-found');
  const resolution = resolutionOf(id);
  if (resolution && resolution.status === 'retired') {
    throw new Error('pocket-already-deleted');
  }
  if (!hasHistory([id])) {
    await db.update('category_pockets', { id, tombstone: 1 });
    return;
  }
  if (!transferId) throw new Error('transfer-required');
  if (transferId === info.category) throw new Error('transfer-same-category');
  await liveExpenseCategory(transferId, 'transfer-category-not-found');
  await batchMessages(async () => {
    const destination = destinations();
    await retire(id, await destination(transferId, 'foreign', info.encoding));
  });
}

/**
 * Deletes a category's base child (S4, S5): its current base lane is
 * retired into the destination's current base slot and the category's
 * next base generation starts empty. The category keeps its currency
 * pockets. Without a destination, an empty base slot is only hidden.
 */
export async function deleteBaseChild({
  category,
  transferId,
}: {
  category: string;
  transferId?: string | null;
}): Promise<void> {
  await liveExpenseCategory(category, 'category-not-found');
  const own = slotFor(category, '');
  if (!own) throw new Error('base-child-not-found');
  if (!transferId) {
    if (hasHistory([own])) throw new Error('transfer-required');
    await setSlotMeta({ id: own, hidden: true, shown: false });
    return;
  }
  if (transferId === category) throw new Error('transfer-same-category');
  await liveExpenseCategory(transferId, 'transfer-category-not-found');
  await batchMessages(async () => {
    const destination = destinations();
    await retire(own, await destination(transferId, 'base', ''));
    await createBaseLane(category);
  });
}

/** Lanes of a category that are neither retired nor tombstoned. */
function liveLanesOf(category: string) {
  return db.runQuery<{ id: string; kind: LaneKind; encoding: string }>(
    `SELECT c.id AS id, 'base' AS kind, '' AS encoding FROM categories c
       WHERE c.id = ?
         AND NOT EXISTS (SELECT 1 FROM slot_retirements r
           WHERE r.id = c.id AND r.tombstone = 0)
     UNION ALL
     SELECT p.id, p.kind, p.encoding FROM category_pockets p
       WHERE p.category = ? AND p.tombstone = 0
         AND p.kind IN ('base', 'foreign') AND p.encoding IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM slot_retirements r
           WHERE r.id = p.id AND r.tombstone = 0)
     ORDER BY id`,
    [category, category],
    true,
  );
}

/** Every lane a category owns or shows, except empty tombstoned ones. */
function lanesAt(category: string) {
  return db
    .runQuery<{ lane: string }>(
      `SELECT r.lane AS lane FROM slot_resolution r
         LEFT JOIN category_pockets p ON p.id = r.lane
       WHERE (r.origin_category = ? OR r.effective_category = ?)
         AND NOT (IFNULL(p.tombstone, 0) = 1 AND r.active = 0)`,
      [category, category],
      true,
    )
    .map(row => row.lane);
}

/**
 * Whether deleting a category must go through lane retirement (MC-10): it
 * owns currency pockets or later base lanes, shows inherited lanes, or its
 * own lane is not its live base slot. Other categories keep upstream
 * deletion.
 */
export function isPocketAffected(category: string): boolean {
  const lanes = lanesAt(category);
  if (lanes.some(lane => lane !== category)) return true;
  const own = resolutionOf(category);
  return own != null && own.status !== 'live';
}

/** Whether an affected category's lanes hold any history. */
export function pocketHistoryRequiresTransfer(category: string): boolean {
  return hasHistory(lanesAt(category));
}

/** Retires every live lane of a category into the destination's slots. */
async function retireCategoryLanes(
  category: string,
  transferId: string,
  destination: Destination,
) {
  for (const lane of liveLanesOf(category)) {
    await retire(
      lane.id,
      await destination(transferId, lane.kind, lane.encoding),
    );
  }
}

/** Tombstones the empty pocket lanes of a category deleted without one. */
async function tombstoneLanes(category: string) {
  for (const lane of liveLanesOf(category)) {
    if (lane.id !== category) {
      await db.update('category_pockets', { id: lane.id, tombstone: 1 });
    }
  }
}

/**
 * Whole-parent deletion of an MC-10-affected category: its current base
 * lane and every live lane it owns are retired into the destination's slot
 * of the same kind and currency, then the category is mapped and
 * tombstoned as upstream does. There is no doTransfer: inherited lanes
 * resolve through the retired chain. Runs inside the caller's batch.
 */
export async function deleteAffectedCategory(
  category: string,
  transferId: string | null | undefined,
  destination: Destination = destinations(),
) {
  if (transferId) {
    await liveExpenseCategory(transferId, 'transfer-category-not-found');
    await retireCategoryLanes(category, transferId, destination);
  } else {
    if (pocketHistoryRequiresTransfer(category)) {
      throw new Error('transfer-required');
    }
    await tombstoneLanes(category);
  }
  await db.deleteCategory({ id: category }, transferId);
}

/** Category group deletion: affected categories retire, others transfer. */
export async function deleteAffectedCategories(
  categories: string[],
  transferId: string | null | undefined,
) {
  const destination = destinations();
  for (const category of categories) {
    if (transferId) {
      await liveExpenseCategory(transferId, 'transfer-category-not-found');
      await retireCategoryLanes(category, transferId, destination);
    } else {
      if (pocketHistoryRequiresTransfer(category)) {
        throw new Error('transfer-required');
      }
      await tombstoneLanes(category);
    }
  }
}

/**
 * Route to pockets: re-applies insert routing to chosen rows from their
 * effective category, or from a named category, writing the raw category
 * and lane pointer together so the pointer's owner test holds.
 */
export async function routeToPockets({
  ids,
  category,
}: {
  ids: string[];
  category?: string;
}): Promise<{ routed: string[] }> {
  if (category) await liveExpenseCategory(category, 'category-not-found');
  const routed: string[] = [];
  const rows = ids.flatMap(id => {
    const row = db.firstSync<{
      effective: string | null;
      stamp: string;
      is_parent: number;
    }>(
      `SELECT l.category AS effective, t.isParent AS is_parent,
          COALESCE(t.pair_encoding, CASE WHEN a.currency IS NULL THEN ''
            ELSE a.currency || '.' || a.currency_precision END) AS stamp
         FROM transactions t
         JOIN v_transaction_lanes l ON l.id = t.id
         JOIN accounts a ON a.id = t.acct
       WHERE t.id = ? AND t.tombstone = 0 AND a.offbudget = 0`,
      [id],
    );
    const target = category ?? row?.effective ?? null;
    return row && target && !row.is_parent
      ? [{ id, target, stamp: row.stamp }]
      : [];
  });
  await batchMessages(async () => {
    for (const { id, target, stamp } of rows) {
      await db.update('transactions', {
        id,
        category: target,
        pocket: routeFromCategory(target, stamp),
      });
      routed.push(id);
    }
  });
  return { routed };
}

/** Merge: a duplicate or orphan lane is retired into its effective slot. */
export async function mergeLane({ laneId }: { laneId: string }) {
  const resolution = resolutionOf(laneId);
  if (
    !resolution ||
    (resolution.status !== 'duplicate' && resolution.status !== 'orphan') ||
    !resolution.effective_category
  ) {
    throw new Error('merge-not-applicable');
  }
  const { effective_owner: owner, effective_category: category } = resolution;
  await batchMessages(async () => {
    await retire(
      laneId,
      owner ??
        (await destinations()(category, resolution.kind, resolution.encoding)),
    );
  });
}

/** Choose owner: an unresolved or orphan lane gets a category's slot. */
export async function chooseLaneOwner({
  laneId,
  categoryId,
}: {
  laneId: string;
  categoryId: string;
}) {
  const resolution = resolutionOf(laneId);
  if (
    !resolution ||
    (resolution.status !== 'unresolved' && resolution.status !== 'orphan')
  ) {
    throw new Error('choose-owner-not-applicable');
  }
  await liveExpenseCategory(categoryId, 'category-not-found');
  await batchMessages(async () => {
    const owner = await destinations()(
      categoryId,
      resolution.kind,
      resolution.encoding,
    );
    if (owner === laneId) throw new Error('choose-owner-not-applicable');
    await retire(laneId, owner);
  });
}

const up = (value: bigint, from: number, to: number) =>
  value * 10n ** BigInt(to - from);

function safe(value: bigint) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error('amount-out-of-range');
  return number;
}

/**
 * A foreign lane cell written whole by the U1 rule: the lane's encoding
 * when the amount is exact there, else the largest recorded precision of
 * the write's terms. Its base is recaptured at the capture date.
 */
async function writeForeignCell(
  lane: { id: string; encoding: string },
  month: string,
  amount: { value: bigint; scale: number },
  terms: number,
  baseAmount?: number,
) {
  const lanePrecision = Number(lane.encoding.split('.')[1]);
  const scale = Math.max(amount.scale, lanePrecision);
  const exact = up(amount.value, amount.scale, scale);
  const step = 10n ** BigInt(scale - lanePrecision);
  const precision =
    exact % step === 0n ? lanePrecision : Math.max(lanePrecision, terms);
  const native = safe(
    precision >= scale
      ? up(exact, scale, precision)
      : exact / 10n ** BigInt(scale - precision),
  );
  const date = captureDate(month);
  const currency = encodingCurrency(lane.encoding);
  let base: number | null = native === 0 ? 0 : (baseAmount ?? null);
  if (base === null) {
    const rate = await entryRate(currency, date);
    base = rate ? toBase(native, precision, rate) : null;
  }
  return writePocketBudgetCell({
    lane: lane.id,
    month,
    pair: {
      native,
      base,
      encoding: `${currency}.${precision}`,
      captureDate: date,
    },
  });
}

/**
 * Move inherited balance (WP1): moves an amount of one month's assignment
 * from a named inherited lane of a slot to the slot's own lane, in one
 * batch. Foreign amounts carry their request encoding; base amounts are in
 * the budget encoding. It never names another slot's lanes.
 */
export async function moveInheritedBalance({
  month,
  slotId,
  laneId,
  amount,
}: {
  month: string;
  slotId: string;
  laneId: string;
  amount: number | RequestAmount;
}): Promise<PocketWriteResult> {
  const slot = slotOfLane(slotId);
  if (!slot || slot.id !== slotId) throw new Error('slot-not-found');
  const index = slot.members.findIndex(m => m.lane === laneId);
  if (index < 1) throw new Error('lane-not-inherited');
  const state = slotMonth(slot, month);
  const own = state.cells[0];
  const inherited = state.cells[index];

  if (slot.kind === 'base') {
    if (typeof amount !== 'number') return { status: 'encoding-mismatch' };
    if (!Number.isSafeInteger(amount)) throw new Error('amount-invalid');
    const delta = BigInt(amount);
    await batchMessages(async () => {
      await writeBaseOwn(
        { ...slot, members: [inherited.member] },
        month,
        safe(inherited.native! - delta),
      );
      await writeBaseOwn(slot, month, safe(own.native! + delta));
    });
    return { status: 'ok' };
  }

  if (typeof amount === 'number') return { status: 'encoding-mismatch' };
  const precision = requestPrecision(
    amount.encoding,
    encodingCurrency(slot.encoding),
  );
  if (precision === null) return { status: 'encoding-mismatch' };
  if (!Number.isSafeInteger(amount.amount)) throw new Error('amount-invalid');
  if (own.native === null || inherited.native === null) {
    return { status: 'pair-encoding-mismatch' };
  }
  const terms = Math.max(displayPrecision(slot), precision);
  const moved = (cell: SlotMonth['cells'][number], sign: bigint) => {
    const scale = Math.max(cell.precision, precision);
    return {
      value:
        up(cell.native!, cell.precision, scale) +
        sign * up(BigInt(amount.amount), precision, scale),
      scale,
    };
  };
  let result: PocketWriteResult = { status: 'ok' };
  await batchMessages(async () => {
    const lanes = [
      { cell: inherited, sign: -1n },
      { cell: own, sign: 1n },
    ];
    for (const { cell, sign } of lanes) {
      const written = await writeForeignCell(
        { id: cell.member.lane, encoding: cell.member.encoding },
        month,
        moved(cell, sign),
        terms,
      );
      if (written.status !== 'ok') result = written;
    }
  });
  return result;
}

/**
 * Re-entry of a mismatched amount (MM1): writes the named cell, on
 * whichever lane holds it, as a pair in that lane's currency.
 */
export async function reenterPocketAmount({
  month,
  laneId,
  amount,
  encoding,
  baseAmount,
}: {
  month: string;
  laneId: string;
  amount: number;
  encoding: string;
  baseAmount?: number;
}): Promise<PocketWriteResult | { status: 'not-mismatched' }> {
  const info = laneInfo(laneId);
  if (info?.kind !== 'foreign') throw new Error('pocket-not-found');
  const precision = requestPrecision(encoding, encodingCurrency(info.encoding));
  if (precision === null) return { status: 'encoding-mismatch' };
  if (!Number.isSafeInteger(amount)) throw new Error('amount-invalid');
  if (baseAmount !== undefined && !Number.isSafeInteger(baseAmount)) {
    throw new Error('amount-invalid');
  }
  const stored = db.firstSync<{ budget_pair: string | null; amount: number }>(
    'SELECT budget_pair, amount FROM pocket_budgets WHERE id = ?',
    [`${month.replace('-', '')}-${laneId}`],
  );
  if (!stored || stored.budget_pair == null || stored.amount !== null) {
    return { status: 'not-mismatched' };
  }
  let result: PocketWriteResult = { status: 'ok' };
  await batchMessages(async () => {
    result = await writeForeignCell(
      { id: laneId, encoding: info.encoding },
      month,
      { value: BigInt(amount), scale: precision },
      precision,
      baseAmount,
    );
  });
  return result;
}
