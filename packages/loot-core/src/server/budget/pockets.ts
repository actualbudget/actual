import { v4 as uuidv4 } from 'uuid';

import * as db from '#server/db';
import { batchMessages } from '#server/sync';
import { parseEncoding } from '#server/sync/coupled-cells';
import { isMulticurrencyAvailable } from '#server/util/currency';
import { reviewedAmountEncoding } from '#shared/amount-encoding';

// Budget lanes beside each category's own lane (MC-10). A category's own
// lane is generation 0 of its base slot, with assignments in zero_budgets;
// base lanes of later generations and currency pockets live in
// category_pockets, with assignments in pocket_budgets. Lanes are never
// merged, copied or rescaled: a retired lane keeps its history and is shown
// under the slot its retirement names.

export type LaneKind = 'base' | 'foreign';

export type LaneStatus =
  | 'live'
  | 'retired'
  | 'orphan'
  | 'duplicate'
  | 'unresolved';

export type SlotResolution = {
  lane: string;
  kind: LaneKind;
  origin_category: string;
  encoding: string;
  effective_owner: string | null;
  effective_category: string | null;
  status: LaneStatus;
  active: number;
};

/** A cell's whole authority: native, base, stamp and capture date. */
export type BudgetPair = {
  native: number;
  /** Null while pending. */
  base: number | null;
  /** `CUR.P`, or `''` for a base lane's budget-currency cell. */
  encoding: string;
  captureDate: string;
};

const PAIR = /^(-?\d+):(-?\d*)~([^@]*)@(\d{4}-\d{2}-\d{2})$/;

/**
 * A pocket_budgets authority: `n:b~ENC@YYYY-MM-DD`, or `n:~ENC@date` while
 * the base is pending.
 */
export function budgetPair({
  native,
  base,
  encoding,
  captureDate,
}: BudgetPair): string {
  if (
    !Number.isSafeInteger(native) ||
    (base !== null && !Number.isSafeInteger(base)) ||
    !isValidStamp(encoding) ||
    !isDate(captureDate)
  ) {
    throw new Error('budget-pair-invalid');
  }
  return `${native}:${base ?? ''}~${encoding}@${captureDate}`;
}

function isDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
  );
}

function isValidStamp(stamp: string) {
  return stamp === '' || parseEncoding(stamp)?.currency != null;
}

/** The currency a lane or stamp encoding names: `''` for the budget's. */
export function encodingCurrency(encoding: string): string {
  return encoding === '' ? '' : encoding.split('.')[0];
}

function encodingPrecision(encoding: string): number {
  return Number(encoding.split('.')[1]);
}

/**
 * Whether a cell stamp belongs to a lane: the lane's currency at any
 * supported precision (U1), or the budget currency for a base lane.
 */
export function stampFitsLane(stamp: string, laneEncoding: string): boolean {
  return (
    isValidStamp(stamp) &&
    encodingCurrency(stamp) === encodingCurrency(laneEncoding)
  );
}

/**
 * Whether a lane admits a transaction stamp (rule 1): a base lane admits
 * every stamp; a foreign lane its own currency at no finer precision.
 */
export function laneAdmits(
  lane: { kind: LaneKind; encoding: string },
  stamp: string,
): boolean {
  if (lane.kind === 'base') return true;
  return (
    stamp !== '' &&
    isValidStamp(stamp) &&
    encodingCurrency(stamp) === encodingCurrency(lane.encoding) &&
    encodingPrecision(stamp) <= encodingPrecision(lane.encoding)
  );
}

export function parseBudgetPair(value: unknown): BudgetPair | null {
  if (typeof value !== 'string') return null;
  const match = PAIR.exec(value);
  if (!match) return null;
  const [, native, base, encoding, captureDate] = match;
  const pair = {
    native: Number(native),
    base: base === '' ? null : Number(base),
    encoding,
    captureDate,
  };
  return Number.isSafeInteger(pair.native) &&
    (pair.base === null || Number.isSafeInteger(pair.base)) &&
    isDate(captureDate)
    ? pair
    : null;
}

/**
 * Dependent columns of a pocket_budgets row (coupled-cells). An absent
 * authority (undo of a first write) derives an absent cell. A stamp that
 * does not fit the lane, or is malformed, derives null amounts: the native
 * is unknown, never zero (pair-encoding-mismatch). A lane that has not
 * arrived yet cannot be judged, so its cell derives as stamped.
 */
export function derivePocketBudget(
  value: unknown,
  row: Record<string, unknown>,
) {
  if (value == null) {
    return {
      amount: null,
      amount_encoding: null,
      base_amount: null,
      capture_date: null,
    };
  }
  const match = typeof value === 'string' ? PAIR.exec(value) : null;
  const pair = parseBudgetPair(value);
  const lane =
    typeof row.lane === 'string'
      ? db.firstSync<{ encoding: string | null }>(
          'SELECT encoding FROM category_pockets WHERE id = ?',
          [row.lane],
        )
      : null;
  const fits =
    pair !== null &&
    isValidStamp(pair.encoding) &&
    (lane?.encoding == null || stampFitsLane(pair.encoding, lane.encoding));
  return {
    amount: fits ? pair.native : null,
    amount_encoding: match ? match[3] : null,
    base_amount: fits ? (pair.base ?? null) : null,
    capture_date: match ? match[4] : null,
  };
}

type LaneRow = {
  id: string;
  kind: LaneKind;
  category: string;
  encoding: string;
  generation: number;
  tombstone: boolean;
  /** A category's own lane, generation 0. */
  isCategoryLane: boolean;
};

function readLanes(): Map<string, LaneRow> {
  const lanes = new Map<string, LaneRow>();
  for (const category of db.runQuery<{ id: string; tombstone: number }>(
    'SELECT id, tombstone FROM categories',
    [],
    true,
  )) {
    lanes.set(category.id, {
      id: category.id,
      kind: 'base',
      category: category.id,
      encoding: '',
      generation: 0,
      tombstone: category.tombstone === 1,
      isCategoryLane: true,
    });
  }
  for (const pocket of db.runQuery<{
    id: string;
    category: string | null;
    kind: string | null;
    encoding: string | null;
    generation: number | null;
    tombstone: number | null;
  }>(
    'SELECT id, category, kind, encoding, generation, tombstone FROM category_pockets',
    [],
    true,
  )) {
    // A lane whose creation cells have not all arrived is not a lane yet.
    if (
      !pocket.category ||
      (pocket.kind !== 'base' && pocket.kind !== 'foreign') ||
      pocket.encoding == null
    ) {
      continue;
    }
    lanes.set(pocket.id, {
      id: pocket.id,
      kind: pocket.kind,
      category: pocket.category,
      encoding: pocket.encoding,
      generation: pocket.generation ?? 0,
      tombstone: pocket.tombstone === 1,
      isCategoryLane: false,
    });
  }
  return lanes;
}

function readRetirements(): Map<string, string> {
  return new Map(
    db
      .runQuery<{ id: string; owner: string | null }>(
        'SELECT id, owner FROM slot_retirements WHERE tombstone = 0',
        [],
        true,
      )
      .map(row => [row.id, row.owner ?? '']),
  );
}

type Topology = {
  lanes: Map<string, LaneRow>;
  retirements: Map<string, string>;
  liveCategories: Set<string>;
  mapping: Map<string, string>;
};

function readTopology(): Topology {
  return {
    lanes: readLanes(),
    retirements: readRetirements(),
    liveCategories: new Set(
      db
        .runQuery<{
          id: string;
        }>('SELECT id FROM categories WHERE tombstone = 0', [], true)
        .map(row => row.id),
    ),
    mapping: new Map(
      db
        .runQuery<{ id: string; transferId: string | null }>(
          'SELECT id, transferId FROM category_mapping',
          [],
          true,
        )
        .map(row => [row.id, row.transferId ?? '']),
    ),
  };
}

function eligibleForSlot(topology: Topology, lane: LaneRow) {
  return !lane.tombstone && !topology.retirements.has(lane.id);
}

/**
 * The canonical live foreign lane of a category in a currency: the largest
 * recorded precision, ties broken by smallest id.
 */
function canonicalForeign(
  topology: Topology,
  category: string,
  currency: string,
): LaneRow | null {
  let best: LaneRow | null = null;
  for (const lane of topology.lanes.values()) {
    if (
      lane.kind !== 'foreign' ||
      lane.category !== category ||
      encodingCurrency(lane.encoding) !== currency ||
      !eligibleForSlot(topology, lane)
    ) {
      continue;
    }
    const precision = encodingPrecision(lane.encoding);
    if (
      !best ||
      precision > encodingPrecision(best.encoding) ||
      (precision === encodingPrecision(best.encoding) && lane.id < best.id)
    ) {
      best = lane;
    }
  }
  return best;
}

/**
 * A category's current base lane: among its base lanes and own lane that
 * are neither retired nor tombstoned, the highest generation, ties broken
 * by smallest id.
 */
function currentBase(topology: Topology, category: string): LaneRow | null {
  let best: LaneRow | null = null;
  for (const lane of topology.lanes.values()) {
    if (
      lane.kind !== 'base' ||
      lane.category !== category ||
      !eligibleForSlot(topology, lane)
    ) {
      continue;
    }
    if (
      !best ||
      lane.generation > best.generation ||
      (lane.generation === best.generation && lane.id < best.id)
    ) {
      best = lane;
    }
  }
  return best;
}

function slotOf(
  topology: Topology,
  category: string,
  kind: LaneKind,
  currency: string,
): string | null {
  return (
    (kind === 'base'
      ? currentBase(topology, category)
      : canonicalForeign(topology, category, currency)
    )?.id ?? null
  );
}

function liveMapped(topology: Topology, category: string): string | null {
  const mapped = topology.mapping.get(category);
  return mapped && topology.liveCategories.has(mapped) ? mapped : null;
}

function laneIsLive(topology: Topology, lane: LaneRow) {
  return !lane.tombstone && topology.liveCategories.has(lane.category);
}

function resolveLane(
  topology: Topology,
  lane: LaneRow,
): Pick<SlotResolution, 'effective_owner' | 'effective_category' | 'status'> {
  const currency = encodingCurrency(lane.encoding);
  const fallback = () =>
    topology.liveCategories.has(lane.category)
      ? lane.category
      : liveMapped(topology, lane.category);
  const unresolved = {
    effective_owner: null,
    effective_category: fallback(),
    status: 'unresolved' as const,
  };

  // A chain that stops at a lane that is not live, or names a missing
  // owner, stays under the last known owner's category while it is live.
  // A cycle has no such owner and keeps the origin (DL7, AT9).
  const unresolvedUnder = (owner: LaneRow | null) =>
    owner && topology.liveCategories.has(owner.category)
      ? { ...unresolved, effective_category: owner.category }
      : unresolved;

  if (topology.retirements.has(lane.id)) {
    // Bounded by the number of retirements: each lane is visited once.
    const visited = new Set([lane.id]);
    let current = topology.retirements.get(lane.id) ?? '';
    let known: LaneRow | null = null;
    for (;;) {
      const owner = topology.lanes.get(current);
      if (!owner) return unresolvedUnder(known);
      if (visited.has(current)) return unresolved;
      visited.add(current);
      const next = topology.retirements.get(current);
      if (next === undefined) {
        if (!laneIsLive(topology, owner)) return unresolvedUnder(owner);
        return {
          effective_owner: slotOf(
            topology,
            owner.category,
            lane.kind,
            currency,
          ),
          effective_category: owner.category,
          status: 'retired',
        };
      }
      known = owner;
      current = next;
    }
  }
  if (lane.tombstone) return unresolved;
  if (!topology.liveCategories.has(lane.category)) {
    // A pocket of a category an older client deleted without retiring it.
    const mapped = liveMapped(topology, lane.category);
    return mapped
      ? {
          effective_owner: slotOf(topology, mapped, lane.kind, currency),
          effective_category: mapped,
          status: 'orphan',
        }
      : unresolved;
  }
  const slot = slotOf(topology, lane.category, lane.kind, currency);
  return {
    effective_owner: slot,
    effective_category: lane.category,
    status: slot === lane.id ? 'live' : 'duplicate',
  };
}

/** Lanes with any row, nonzero or unknown assignment, in any month. */
function activeLanes(): Set<string> {
  return new Set(
    db
      .runQuery<{ lane: string }>(
        `SELECT DISTINCT candidate AS lane FROM v_transaction_lanes
           WHERE live = 1 AND candidate IS NOT NULL
         UNION SELECT lane FROM pocket_budgets
           WHERE lane IS NOT NULL
             AND (amount != 0 OR (budget_pair IS NOT NULL AND amount IS NULL))
         UNION SELECT category FROM zero_budgets
           WHERE category IS NOT NULL AND amount != 0`,
        [],
        true,
      )
      .map(row => row.lane),
  );
}

/** Every lane's owner, effective category and status, from synced tables. */
export function computeSlotResolution(): SlotResolution[] {
  const topology = readTopology();
  const active = activeLanes();
  const resolved: SlotResolution[] = [];
  for (const lane of topology.lanes.values()) {
    // A category deleted without retirement keeps upstream handling: its
    // rows follow category_mapping and its budgets were transferred.
    if (
      lane.isCategoryLane &&
      lane.tombstone &&
      !topology.retirements.has(lane.id)
    ) {
      continue;
    }
    resolved.push({
      lane: lane.id,
      kind: lane.kind,
      origin_category: lane.category,
      encoding: lane.encoding,
      ...resolveLane(topology, lane),
      active: active.has(lane.id) ? 1 : 0,
    });
  }
  return resolved.sort((a, b) => (a.lane < b.lane ? -1 : 1));
}

const RESOLUTION_COLUMNS = [
  'lane',
  'kind',
  'origin_category',
  'encoding',
  'effective_owner',
  'effective_category',
  'status',
  'active',
] as const;

/**
 * Rebuilds slot_resolution, unconditionally: after every applied batch and
 * on load. Returns the categories whose attributed lanes changed (both the
 * previous and the new effective category of every changed lane).
 */
export function rebuildSlotResolution(): Set<string> {
  const changed = new Set<string>();
  db.transaction(() => {
    const previous = new Map(
      db
        .runQuery<SlotResolution>('SELECT * FROM slot_resolution', [], true)
        .map(row => [row.lane, row]),
    );
    const next = computeSlotResolution();
    let differs = previous.size !== next.length;
    for (const row of next) {
      const old = previous.get(row.lane);
      if (
        !old ||
        RESOLUTION_COLUMNS.some(column => old[column] !== row[column])
      ) {
        differs = true;
      }
      if (old?.effective_category !== row.effective_category) {
        if (old?.effective_category) changed.add(old.effective_category);
        if (row.effective_category) changed.add(row.effective_category);
      }
      previous.delete(row.lane);
    }
    for (const old of previous.values()) {
      if (old.effective_category) changed.add(old.effective_category);
    }
    if (!differs) return;
    db.runQuery('DELETE FROM slot_resolution');
    for (const row of next) {
      db.runQuery(
        `INSERT INTO slot_resolution (${RESOLUTION_COLUMNS.join(', ')})
           VALUES (${RESOLUTION_COLUMNS.map(() => '?').join(', ')})`,
        RESOLUTION_COLUMNS.map(column => row[column]),
      );
    }
  });
  return changed;
}

export type LaneInfo = {
  id: string;
  kind: LaneKind;
  category: string;
  encoding: string;
};

/** A stored lane: a category's own lane, or a category_pockets row. */
export function laneInfo(id: string | null): LaneInfo | null {
  if (!id) return null;
  const pocket = db.firstSync<{
    id: string;
    kind: LaneKind;
    category: string;
    encoding: string;
  }>(
    `SELECT id, kind, category, encoding FROM category_pockets
       WHERE id = ? AND kind IN ('base', 'foreign') AND category IS NOT NULL
         AND encoding IS NOT NULL`,
    [id],
  );
  if (pocket) return pocket;
  const category = db.firstSync<{ id: string }>(
    'SELECT id FROM categories WHERE id = ?',
    [id],
  );
  return category
    ? { id, kind: 'base', category: category.id, encoding: '' }
    : null;
}

/**
 * The lane a write routes to from a category for a stamp: its canonical
 * foreign lane in the stamp's currency when that admits the stamp, else its
 * current base lane of generation 1 or later, else none (its own lane,
 * through category_mapping).
 */
export function routeFromCategory(
  category: string | null,
  stamp: string,
): string | null {
  if (!category) return null;
  const topology = readTopology();
  if (stamp !== '' && isValidStamp(stamp)) {
    const foreign = canonicalForeign(
      topology,
      category,
      encodingCurrency(stamp),
    );
    if (foreign && laneAdmits(foreign, stamp)) return foreign.id;
  }
  const base = currentBase(topology, category);
  return base && !base.isCategoryLane ? base.id : null;
}

/** The slot a category shows for a currency (`''` for its base slot). */
export function slotFor(category: string, currency: string): string | null {
  return slotOf(
    readTopology(),
    category,
    currency === '' ? 'base' : 'foreign',
    currency,
  );
}

async function budgetCurrency(): Promise<string> {
  const row = await db.first<{ value: string }>(
    "SELECT value FROM preferences WHERE id = 'defaultCurrencyCode'",
  );
  return row?.value ?? '';
}

async function assertPocketsAvailable() {
  const type = await db.first<{ value: string }>(
    "SELECT value FROM preferences WHERE id = 'budgetType'",
  );
  // Tracking budgets have no pockets.
  if (type?.value === 'tracking') throw new Error('pockets-tracking');
  if (!(await isMulticurrencyAvailable())) {
    throw new Error('multicurrency-unavailable');
  }
}

async function liveExpenseCategory(id: string) {
  const category = await db.first<{ id: string; is_income: number }>(
    'SELECT id, is_income FROM categories WHERE id = ? AND tombstone = 0',
    [id],
  );
  if (!category) throw new Error('category-not-found');
  if (category.is_income) throw new Error('pocket-category-income');
}

function baseSlotActive(category: string): boolean {
  const base = slotFor(category, '');
  if (!base) return false;
  return (
    db.firstSync<{ found: number }>(
      `SELECT 1 AS found FROM v_transaction_lanes
         WHERE live = 1 AND candidate = ?
       UNION SELECT 1 FROM zero_budgets WHERE category = ? AND amount != 0
       UNION SELECT 1 FROM pocket_budgets
         WHERE lane = ? AND (amount != 0 OR amount IS NULL)
           AND budget_pair IS NOT NULL
       LIMIT 1`,
      [base, base, base],
    ) != null
  );
}

/**
 * Next base generation of a category: 1 + the highest generation among
 * every base lane of it this device can see, live, retired or tombstoned.
 */
export async function createBaseLane(category: string): Promise<string> {
  const row = await db.first<{ generation: number | null }>(
    `SELECT MAX(generation) AS generation FROM category_pockets
       WHERE category = ? AND kind = 'base'`,
    [category],
  );
  const id = uuidv4();
  await db.insert('category_pockets', {
    id,
    category,
    kind: 'base',
    encoding: '',
    generation: (row?.generation ?? 0) + 1,
    tombstone: 0,
  });
  return id;
}

/**
 * Add Currency: a category's slot in a currency. A foreign currency gets a
 * new lane (fresh id, encoding recorded once) unless the category already
 * has a live one; the budget currency shows the current base slot, creating
 * the next base generation when there is none. A category with history
 * keeps its own lane as a shown base slot; an empty one leaves it hidden
 * until activity or Add Currency.
 */
export async function createPocket({
  category,
  currency,
}: {
  category: string;
  currency: string;
}): Promise<{ id: string }> {
  await assertPocketsAvailable();
  await liveExpenseCategory(category);
  const base = await budgetCurrency();
  let id: string | undefined;
  await batchMessages(async () => {
    if (currency === base) {
      id = slotFor(category, '') ?? (await createBaseLane(category));
      await setSlotMeta({ id, shown: true });
      return;
    }
    const existing = slotFor(category, currency);
    if (existing) {
      id = existing;
      return;
    }
    const { precision } = reviewedAmountEncoding(currency);
    id = uuidv4();
    await db.insert('category_pockets', {
      id,
      category,
      kind: 'foreign',
      encoding: `${currency}.${precision}`,
      tombstone: 0,
    });
    const baseSlot = slotFor(category, '');
    if (baseSlot && baseSlotActive(category)) {
      await setSlotMeta({ id: baseSlot, shown: true });
    }
  });
  if (!id) throw new Error('pocket-create-failed');
  return { id };
}

/** Slot visibility; it has no accounting or routing role. */
export async function setSlotMeta({
  id,
  hidden,
  sort_order,
  shown,
}: {
  id: string;
  hidden?: boolean;
  sort_order?: number | null;
  shown?: boolean;
}) {
  const fields = {
    ...(hidden !== undefined && { hidden: hidden ? 1 : 0 }),
    ...(sort_order !== undefined && { sort_order }),
    ...(shown !== undefined && { shown: shown ? 1 : 0 }),
  };
  if (Object.keys(fields).length === 0) return;
  await db.update('category_slot_meta', { id, ...fields });
}

/**
 * Whether a category's base slot is shown: explicitly (Add Currency or
 * history at the first pocket) or through activity, and not hidden.
 */
export function baseSlotShown(category: string): boolean {
  const slot = slotFor(category, '');
  if (!slot) return false;
  const meta = db.firstSync<{ hidden: number | null; shown: number | null }>(
    'SELECT hidden, shown FROM category_slot_meta WHERE id = ?',
    [slot],
  );
  if (meta?.hidden) return false;
  return !!meta?.shown || baseSlotActive(category);
}

/**
 * Retirement and forward authority (seeded here; the deletion handlers own
 * it). Creation and metadata writes never touch it; only undo tombstones it.
 */
export async function retireLane({
  lane,
  owner,
}: {
  lane: string;
  owner: string;
}) {
  await db.insert('slot_retirements', { id: lane, owner, tombstone: 0 });
}

const monthId = (month: string) => month.replace('-', '');

/**
 * Writes one pocket_budgets cell as a whole pair. The encoding must be the
 * lane's currency at a supported precision; it may be finer than the lane's
 * creation encoding, which stays unchanged (U1). Only this cell changes.
 */
export async function writePocketBudgetCell({
  lane,
  month,
  pair,
}: {
  lane: string;
  month: string;
  pair: BudgetPair;
}): Promise<{ status: 'ok' } | { status: 'encoding-mismatch' }> {
  const info = laneInfo(lane);
  if (!info || info.id === info.category) throw new Error('lane-not-found');
  if (!stampFitsLane(pair.encoding, info.encoding)) {
    return { status: 'encoding-mismatch' };
  }
  const value = budgetPair(pair);
  const id = `${monthId(month)}-${lane}`;
  const existing = await db.first<{ id: string }>(
    'SELECT id FROM pocket_budgets WHERE id = ?',
    [id],
  );
  if (existing) {
    await db.update('pocket_budgets', { id, budget_pair: value });
  } else {
    await db.insert('pocket_budgets', {
      id,
      month: Number(monthId(month)),
      lane,
      budget_pair: value,
    });
  }
  return { status: 'ok' };
}
