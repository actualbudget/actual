import * as db from '#server/db';
import { batchMessages } from '#server/sync';
import {
  getDefaultCurrencyCode,
  getRecordedAmountPrecision,
} from '#server/util/currency';
import { baseToNative, nativeToBase, parseRate } from '#shared/exchange-rate';
import * as monthUtils from '#shared/months';

import {
  budgetPair,
  encodingCurrency,
  laneInfo,
  slotFor,
  writePocketBudgetCell,
} from './pockets';
import { finalizePocketAssignments } from './reservations';

// Assignment writes of currency slots (MC-10.5). A slot is a category's
// current base lane or its canonical foreign lane in one currency, plus the
// lanes it inherits. Every ordinary write (direct edits, bulk actions, flow
// endpoints, templates and the API) sets the slot's displayed amount by
// writing only its own lane's cell: own = target - inherited (U1).

type Member = { lane: string; isCategoryLane: boolean; encoding: string };

export type Slot = {
  id: string;
  kind: 'base' | 'foreign';
  /** The category the slot shows under. */
  category: string;
  /** The own lane's recorded creation encoding (`''` for a base slot). */
  encoding: string;
  /** The own lane first, then the inherited lanes. */
  members: Member[];
};

export type PocketWriteResult =
  | { status: 'ok' }
  | { status: 'encoding-mismatch' }
  | { status: 'pair-encoding-mismatch' }
  | { status: 'owner-unresolved' };

export type PocketTransferResult =
  | PocketWriteResult
  | {
      status: 'rate-unavailable';
      needs: Array<'destinationAmount' | 'rate'>;
    };

/** A native amount with the encoding its integer was produced at. */
export type RequestAmount = { amount: number; encoding: string };

const ENCODING = /^([A-Z]{3})\.(\d{1,2})$/;

function precisionOf(encoding: string): number {
  return Number(encoding.split('.')[1]);
}

/** A request encoding's precision, or null when it is not supported. */
export function requestPrecision(
  encoding: unknown,
  currency: string,
): number | null {
  const match = typeof encoding === 'string' ? ENCODING.exec(encoding) : null;
  if (!match || match[1] !== currency) return null;
  const precision = Number(match[2]);
  return precision <= 15 ? precision : null;
}

const up = (value: bigint, from: number, to: number) =>
  value * 10n ** BigInt(to - from);

/** The capture date of an entry: today, or month end for a past month. */
export function captureDate(month: string) {
  return month < monthUtils.currentMonth()
    ? monthUtils.getMonthEnd(`${month}-01`)
    : monthUtils.currentDay();
}

const cellId = (month: string, lane: string) =>
  `${month.replace('-', '')}-${lane}`;

function slotMembers(id: string, kind: 'base' | 'foreign'): Member[] {
  const rows = db.runQuery<{ lane: string; pocket: string | null }>(
    `SELECT r.lane AS lane, p.id AS pocket FROM slot_resolution r
       LEFT JOIN category_pockets p ON p.id = r.lane
     WHERE r.effective_owner = ? AND r.kind = ? AND r.lane != ?
     ORDER BY r.lane`,
    [id, kind, id],
    true,
  );
  return [id, ...rows.map(row => row.lane)].flatMap(lane => {
    const info = laneInfo(lane);
    if (!info) return [];
    return [
      {
        lane,
        isCategoryLane: info.id === info.category,
        encoding: info.encoding,
      },
    ];
  });
}

function slotById(id: string): Slot | null {
  const info = laneInfo(id);
  if (!info) return null;
  return {
    id,
    kind: info.kind,
    category: info.category,
    encoding: info.encoding,
    members: slotMembers(id, info.kind),
  };
}

/**
 * The slot any of its lanes belongs to, including a stale own lane: a live
 * lane is its own slot, others write their effective owner.
 */
export function slotOfLane(lane: string): Slot | null {
  const row = db.firstSync<{ status: string; effective_owner: string | null }>(
    'SELECT status, effective_owner FROM slot_resolution WHERE lane = ?',
    [lane],
  );
  // A lane created in this batch has not been resolved yet: it is live.
  if (!row || row.status === 'live') return slotById(lane);
  return row.effective_owner ? slotById(row.effective_owner) : null;
}

/** A category's base slot: its own lane until a cutover. */
export function baseSlotOf(category: string): Slot | null {
  const row = db.firstSync<{ status: string }>(
    'SELECT status FROM slot_resolution WHERE lane = ?',
    [category],
  );
  if (!row || row.status === 'live') return slotById(category);
  const slot = slotFor(category, '');
  return slot ? slotById(slot) : null;
}

/** A foreign pocket's slot, or null when the id is not a foreign lane. */
export function foreignSlotOf(lane: string): Slot | null {
  if (laneInfo(lane)?.kind !== 'foreign') return null;
  const slot = slotOfLane(lane);
  return slot?.kind === 'foreign' ? slot : null;
}

/** Every live foreign slot with its category's flags. */
export function foreignSlots(): Array<{
  slot: Slot;
  isIncome: boolean;
  hidden: boolean;
}> {
  return db
    .runQuery<{
      lane: string;
      is_income: number;
      hidden: number;
      group_hidden: number | null;
      slot_hidden: number | null;
    }>(
      `SELECT r.lane AS lane, c.is_income AS is_income, c.hidden AS hidden,
          g.hidden AS group_hidden, m.hidden AS slot_hidden
         FROM slot_resolution r
         JOIN categories c ON c.id = r.effective_category AND c.tombstone = 0
         LEFT JOIN category_groups g ON g.id = c.cat_group
         LEFT JOIN category_slot_meta m ON m.id = r.lane
       WHERE r.kind = 'foreign' AND r.status = 'live'
       ORDER BY r.lane`,
      [],
      true,
    )
    .flatMap(row => {
      const slot = slotById(row.lane);
      return slot
        ? [
            {
              slot,
              isIncome: row.is_income === 1,
              hidden: !!row.hidden || !!row.group_hidden || !!row.slot_hidden,
            },
          ]
        : [];
    });
}

type CellState = {
  member: Member;
  exists: boolean;
  /** Null when the stamp does not fit the lane (pair-encoding-mismatch). */
  native: bigint | null;
  precision: number;
  base: number | null;
};

function memberCell(member: Member, month: string): CellState {
  if (member.isCategoryLane) {
    const row = db.firstSync<{ amount: number | null }>(
      'SELECT amount FROM zero_budgets WHERE month = ? AND category = ?',
      [Number(month.replace('-', '')), member.lane],
    );
    const amount = BigInt(row?.amount ?? 0);
    return {
      member,
      exists: !!row,
      native: amount,
      precision: 0,
      base: Number(amount),
    };
  }
  const row = db.firstSync<{
    budget_pair: string | null;
    amount: number | null;
    amount_encoding: string | null;
    base_amount: number | null;
  }>(
    `SELECT budget_pair, amount, amount_encoding, base_amount
       FROM pocket_budgets WHERE id = ?`,
    [cellId(month, member.lane)],
  );
  // An absent authority (a flag-only cell, or undo of a first write)
  // assigns nothing.
  if (!row || row.budget_pair == null) {
    return {
      member,
      exists: !!row,
      native: 0n,
      precision: 0,
      base: 0,
    };
  }
  if (row.amount === null) {
    return { member, exists: true, native: null, precision: 0, base: null };
  }
  return {
    member,
    exists: true,
    native: BigInt(row.amount),
    precision: member.encoding === '' ? 0 : precisionOf(row.amount_encoding!),
    base: row.base_amount,
  };
}

/**
 * A foreign slot's display precision: the largest of its lanes' encodings
 * and their cells' stamps.
 */
export function displayPrecision(slot: Slot): number {
  if (slot.kind === 'base') return 0;
  const lanes = slot.members.map(m => m.lane);
  const stamps = db.runQuery<{ encoding: string }>(
    `SELECT DISTINCT amount_encoding AS encoding FROM pocket_budgets
       WHERE amount IS NOT NULL AND lane IN (${lanes.map(() => '?').join(', ')})`,
    lanes,
    true,
  );
  return Math.max(
    ...slot.members.map(m => precisionOf(m.encoding)),
    ...stamps.map(s => precisionOf(s.encoding)),
  );
}

export type SlotMonth = {
  cells: CellState[];
  /** Whether any of the slot's lanes has a cell this month. */
  exists: boolean;
  /** The displayed assignment at `scale`; null when any lane is unknown. */
  displayed: bigint | null;
  scale: number;
};

/** A slot's assignment in a month: own plus inherited, exactly. */
export function slotMonth(slot: Slot, month: string): SlotMonth {
  const cells = slot.members.map(member => memberCell(member, month));
  const scale = Math.max(0, ...cells.map(cell => cell.precision));
  let displayed: bigint | null = 0n;
  for (const cell of cells) {
    displayed =
      displayed === null || cell.native === null
        ? null
        : displayed + up(cell.native, cell.precision, scale);
  }
  return {
    cells,
    exists: cells.some(cell => cell.exists),
    displayed,
    scale,
  };
}

export async function entryRate(currency: string, date: string) {
  const { resolveRate } = await import('#server/exchange-rates/app');
  const rate = await resolveRate({
    baseCurrency: await getDefaultCurrencyCode(),
    quoteCurrency: currency,
    date,
    forEntry: true,
  });
  return rate.status === 'resolved' ? rate.rate : null;
}

export function toBase(native: number, precision: number, rate: string) {
  try {
    return nativeToBase(native, precision, getRecordedAmountPrecision(), rate);
  } catch {
    return null;
  }
}

const safe = (value: bigint) => {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error('amount-out-of-range');
  return number;
};

/** Writes a base slot's own lane: amounts are in the budget encoding. */
export function writeBaseOwn(
  slot: Slot,
  month: string,
  own: number,
): Promise<void> {
  const [ownLane] = slot.members;
  if (ownLane.isCategoryLane) {
    const existing = db.firstSync<{ id: string }>(
      'SELECT id FROM zero_budgets WHERE month = ? AND category = ?',
      [Number(month.replace('-', '')), ownLane.lane],
    );
    if (existing) {
      return db.update('zero_budgets', { id: existing.id, amount: own });
    }
    return db.insert('zero_budgets', {
      id: cellId(month, ownLane.lane),
      month: Number(month.replace('-', '')),
      category: ownLane.lane,
      amount: own,
    });
  }
  // A later base generation: its cells are pairs in the budget encoding.
  const id = cellId(month, ownLane.lane);
  const value = budgetPair({
    native: own,
    base: own,
    encoding: '',
    captureDate: captureDate(month),
  });
  if (db.firstSync('SELECT id FROM pocket_budgets WHERE id = ?', [id])) {
    return db.update('pocket_budgets', { id, budget_pair: value });
  }
  return db.insert('pocket_budgets', {
    id,
    month: Number(month.replace('-', '')),
    lane: ownLane.lane,
    budget_pair: value,
  });
}

/**
 * Sets a base slot's displayed amount: own = target - inherited. Base
 * cells are always in the budget encoding, so the write is exact.
 */
export function setBaseTarget(
  slot: Slot,
  month: string,
  target: number,
): Promise<void> {
  let inherited = 0n;
  for (const member of slot.members.slice(1)) {
    const { native } = memberCell(member, month);
    if (native === null) throw new Error('pair-encoding-mismatch');
    inherited += native;
  }
  return writeBaseOwn(slot, month, safe(BigInt(target) - inherited));
}

/**
 * The U1 writer of a foreign slot's own cell. The target is an exact amount
 * at `targetPrecision`; `request` is the precision the caller's integer was
 * produced at. The own amount takes the lane's encoding when it is exact
 * there, else the largest recorded precision among the write's terms (the
 * slot's display precision and the request encoding). Only this cell
 * changes; its base is captured from the native at its stamp.
 */
async function writeForeignOwn(
  slot: Slot,
  month: string,
  state: SlotMonth,
  target: { value: bigint; precision: number },
  request: number,
  base: (native: number, precision: number) => Promise<number | null>,
  { skipUnchanged = false } = {},
): Promise<PocketWriteResult> {
  const [own, ...inherited] = state.cells;
  if (inherited.some(cell => cell.native === null)) {
    return { status: 'pair-encoding-mismatch' };
  }
  const lanePrecision = precisionOf(slot.encoding);
  const scale = Math.max(
    target.precision,
    lanePrecision,
    ...inherited.map(cell => cell.precision),
  );
  const amount =
    up(target.value, target.precision, scale) -
    inherited.reduce(
      (sum, cell) => sum + up(cell.native!, cell.precision, scale),
      0n,
    );
  if (skipUnchanged && !own.exists && amount === 0n) return { status: 'ok' };
  const lanes = 10n ** BigInt(scale - lanePrecision);
  let precision: number;
  let native: bigint;
  if (amount % lanes === 0n) {
    precision = lanePrecision;
    native = amount / lanes;
  } else {
    precision = Math.max(displayPrecision(slot), request);
    native = up(amount, scale, precision);
  }
  const value = safe(native);
  const result = await writePocketBudgetCell({
    lane: slot.id,
    month,
    pair: {
      native: value,
      base: value === 0 ? 0 : await base(value, precision),
      encoding: `${encodingCurrency(slot.encoding)}.${precision}`,
      captureDate: captureDate(month),
    },
  });
  return result;
}

/** A base captured at the entry rate of the capture date, else pending. */
function capture(slot: Slot, month: string) {
  return async (native: number, precision: number) => {
    const entry = await entryRate(
      encodingCurrency(slot.encoding),
      captureDate(month),
    );
    return entry ? toBase(native, precision, entry) : null;
  };
}

/**
 * Sets a foreign slot's displayed amount to a server-computed target at its
 * display precision (Set zero, copies, averages), read in this mutator.
 */
export async function setForeignTarget(
  slot: Slot,
  month: string,
  target: bigint,
  precision: number,
): Promise<PocketWriteResult> {
  return writeForeignOwn(
    slot,
    month,
    slotMonth(slot, month),
    { value: target, precision },
    precision,
    capture(slot, month),
    { skipUnchanged: true },
  );
}

/**
 * api/pocket-budget-set and native slot edits: `amount` is the displayed
 * slot target, an integer at the request `encoding` the caller read.
 */
export async function setPocketBudget({
  month,
  pocketId,
  amount,
  encoding,
  baseAmount,
}: {
  month: string;
  pocketId: string;
  amount: number;
  encoding: string;
  baseAmount?: number;
}): Promise<PocketWriteResult> {
  if (laneInfo(pocketId)?.kind !== 'foreign') {
    throw new Error('pocket-not-found');
  }
  const slot = foreignSlotOf(pocketId);
  if (!slot) return { status: 'owner-unresolved' };
  const precision = requestPrecision(encoding, encodingCurrency(slot.encoding));
  if (precision === null) return { status: 'encoding-mismatch' };
  if (!Number.isSafeInteger(amount)) throw new Error('amount-invalid');
  if (baseAmount !== undefined && !Number.isSafeInteger(baseAmount)) {
    throw new Error('amount-invalid');
  }
  let result: PocketWriteResult = { status: 'ok' };
  await batchMessages(async () => {
    result = await writeForeignOwn(
      slot,
      month,
      slotMonth(slot, month),
      { value: BigInt(amount), precision },
      precision,
      baseAmount !== undefined ? async () => baseAmount : capture(slot, month),
    );
  });
  return result;
}

type Endpoint =
  | { kind: 'to-budget'; currency: '' }
  | { kind: 'base'; slot: Slot; currency: '' }
  | { kind: 'foreign'; slot: Slot; currency: string };

function endpoint(id: string): Endpoint | 'unresolved' {
  if (id === 'to-budget') return { kind: 'to-budget', currency: '' };
  const info = laneInfo(id);
  if (!info) throw new Error('pocket-not-found');
  const slot =
    info.kind === 'foreign'
      ? foreignSlotOf(id)
      : info.id === info.category
        ? baseSlotOf(id)
        : slotOfLane(id);
  if (!slot) return 'unresolved';
  return slot.kind === 'foreign'
    ? { kind: 'foreign', slot, currency: encodingCurrency(slot.encoding) }
    : { kind: 'base', slot, currency: '' };
}

/** An amount for one side: a budget integer, or a native request. */
function sideAmount(
  value: number | RequestAmount | undefined,
  side: Endpoint,
): { amount: bigint; precision: number } | 'mismatch' | undefined {
  if (value === undefined) return undefined;
  if (side.currency === '') {
    if (typeof value !== 'number') return 'mismatch';
    if (!Number.isSafeInteger(value)) throw new Error('amount-invalid');
    return { amount: BigInt(value), precision: 0 };
  }
  if (typeof value === 'number') return 'mismatch';
  const precision = requestPrecision(value.encoding, side.currency);
  if (precision === null) return 'mismatch';
  if (!Number.isSafeInteger(value.amount)) throw new Error('amount-invalid');
  return { amount: BigInt(value.amount), precision };
}

/**
 * Moves an amount between two slots, or between a slot and To Budget. Same
 * currency: an exact native move, each own cell written by the U1 writer
 * and its base recaptured at the flow's capture date. Cross currency:
 * `amount` is in source units and the destination's by entry rules; without
 * a rate the caller supplies `destinationAmount` (or a `rate` against the
 * budget currency), else nothing is written.
 */
export async function transferPocketAmount({
  month,
  from,
  to,
  amount,
  destinationAmount,
  rate,
}: {
  month: string;
  from: string;
  to: string;
  amount?: number | RequestAmount;
  destinationAmount?: number | RequestAmount;
  rate?: string;
}): Promise<PocketTransferResult> {
  if (from === to) throw new Error('transfer-same-slot');
  const source = endpoint(from);
  const destination = endpoint(to);
  if (source === 'unresolved' || destination === 'unresolved') {
    return { status: 'owner-unresolved' };
  }
  if (
    source.kind !== 'to-budget' &&
    destination.kind !== 'to-budget' &&
    source.slot.id === destination.slot.id
  ) {
    throw new Error('transfer-same-slot');
  }
  const same = source.currency === destination.currency;
  let sent = sideAmount(amount, source);
  let received = same
    ? sideAmount(amount, destination)
    : sideAmount(destinationAmount, destination);
  if (sent === 'mismatch' || received === 'mismatch') {
    return { status: 'encoding-mismatch' };
  }
  if (!sent && !received) throw new Error('amount-required');
  const bp = getRecordedAmountPrecision();
  const date = captureDate(month);
  // An explicit rate is an operation rate: like any entry, it comes before
  // saved rates. It is quoted in foreign units per budget unit, so it
  // applies only to a flow with one foreign currency.
  const foreignCurrencies = new Set(
    [source.currency, destination.currency].filter(c => c !== ''),
  );
  const explicit =
    rate !== undefined && foreignCurrencies.size === 1 ? parseRate(rate) : null;
  const rateOf = async (side: Endpoint) =>
    side.currency === ''
      ? null
      : (explicit ?? (await entryRate(side.currency, date)));
  const sourceRate = await rateOf(source);
  const destinationRate = await rateOf(destination);

  // The budget-currency value moved, when known.
  let movedBase: bigint | null = null;
  if (!same) {
    const foreignToForeign =
      source.currency !== '' && destination.currency !== '';
    const needs: Array<'destinationAmount' | 'rate'> = foreignToForeign
      ? ['destinationAmount']
      : ['destinationAmount', 'rate'];
    if (source.currency === '') movedBase = sent ? sent.amount : null;
    if (destination.currency === '') {
      movedBase = received ? received.amount : null;
    }
    // The missing side by entry rules, through the budget currency.
    const asBase = (
      side: Endpoint,
      value: { amount: bigint; precision: number },
      r: string | null,
    ) =>
      side.currency === ''
        ? value.amount
        : r
          ? BigInt(nativeToBase(safe(value.amount), value.precision, bp, r))
          : null;
    const fromBase = (side: Endpoint, base: bigint, r: string | null) => {
      if (side.currency === '') return { amount: base, precision: 0 };
      if (!r || side.kind !== 'foreign') return null;
      const precision = displayPrecision(side.slot);
      return {
        amount: BigInt(baseToNative(safe(base), bp, precision, r)),
        precision,
      };
    };
    if (!received) {
      const base = asBase(source, sent!, sourceRate);
      const value =
        base === null ? null : fromBase(destination, base, destinationRate);
      if (!value) return { status: 'rate-unavailable', needs };
      received = value;
      movedBase = base;
    } else if (!sent) {
      const base = asBase(destination, received, destinationRate);
      const value = base === null ? null : fromBase(source, base, sourceRate);
      if (!value) return { status: 'rate-unavailable', needs };
      sent = value;
      movedBase = base;
    } else if (movedBase === null && sourceRate) {
      movedBase = asBase(source, sent, sourceRate);
    }
  }

  // Both sides are read and checked before anything is written.
  const sides = [
    { side: source, delta: sent!, sign: -1n as const, rate: sourceRate },
    {
      side: destination,
      delta: received!,
      sign: 1n as const,
      rate: destinationRate,
    },
  ].map(item => ({
    ...item,
    state:
      item.side.kind === 'to-budget' ? null : slotMonth(item.side.slot, month),
  }));
  for (const { side, state } of sides) {
    if (!state) continue;
    // The own amount is moved, so every lane of the slot must be known.
    if (state.displayed === null) return { status: 'pair-encoding-mismatch' };
    if (
      side.kind === 'foreign' &&
      state.cells.slice(1).some(c => c.native === null)
    ) {
      return { status: 'pair-encoding-mismatch' };
    }
  }

  await batchMessages(async () => {
    for (const { side, delta, sign, rate: sideRate, state } of sides) {
      if (side.kind === 'to-budget' || !state) continue;
      const scale = Math.max(state.scale, delta.precision);
      const target =
        up(state.displayed!, state.scale, scale) +
        sign * up(delta.amount, delta.precision, scale);
      if (side.kind === 'base') {
        await setBaseTarget(side.slot, month, safe(target));
        continue;
      }
      const own = state.cells[0];
      await writeForeignOwn(
        side.slot,
        month,
        state,
        { value: target, precision: scale },
        delta.precision,
        async (native, precision) => {
          if (sideRate) return toBase(native, precision, sideRate);
          // Without a rate: the cell's frozen base moves by the value moved.
          if (movedBase === null || own.base === null) return null;
          return safe(BigInt(own.base) + sign * movedBase);
        },
      );
    }
  });
  return { status: 'ok' };
}

/** Carry from a month on: the slot's own and inherited lanes. */
export async function setSlotCarryover(
  slot: Slot,
  months: string[],
  flag: boolean,
) {
  for (const member of slot.members) {
    for (const month of months) {
      if (member.isCategoryLane) {
        const existing = db.firstSync<{ id: string }>(
          'SELECT id FROM zero_budgets WHERE month = ? AND category = ?',
          [Number(month.replace('-', '')), member.lane],
        );
        if (existing) {
          await db.update('zero_budgets', {
            id: existing.id,
            carryover: flag ? 1 : 0,
          });
        } else {
          await db.insert('zero_budgets', {
            id: cellId(month, member.lane),
            month: Number(month.replace('-', '')),
            category: member.lane,
            carryover: flag ? 1 : 0,
          });
        }
        continue;
      }
      const id = cellId(month, member.lane);
      if (db.firstSync('SELECT id FROM pocket_budgets WHERE id = ?', [id])) {
        await db.update('pocket_budgets', { id, carryover: flag ? 1 : 0 });
      } else {
        await db.insert('pocket_budgets', {
          id,
          month: Number(month.replace('-', '')),
          lane: member.lane,
          carryover: flag ? 1 : 0,
        });
      }
    }
  }
}

/**
 * A foreign slot's displayed spending in a month: every lane's eligible
 * rows, native, at the slot's display precision; null when unknown.
 */
export function slotSpending(slot: Slot, month: string, precision: number) {
  const { start, end } = monthUtils.bounds(month);
  const lanes = slot.members.map(m => m.lane);
  let sum: bigint | null = 0n;
  for (const row of db.runQuery<{
    native: number | null;
    stamp: string | null;
  }>(
    `SELECT t.transaction_amount AS native,
        COALESCE(t.pair_encoding, a.encoding) AS stamp
       FROM v_transaction_lanes l
       JOIN transactions t ON t.id = l.id
       JOIN accounts a ON a.id = t.acct
     WHERE l.lane IN (${lanes.map(() => '?').join(', ')})
       AND t.date >= ? AND t.date <= ?`,
    [...lanes, start, end],
    true,
  )) {
    const p = row.stamp ? precisionOf(row.stamp) : NaN;
    sum =
      sum === null || row.native === null || !(p <= precision)
        ? null
        : sum + up(BigInt(row.native), p, precision);
  }
  return sum;
}

/** Finalize pending: named cells of any lane, own or inherited. */
export function finalizePockets({
  cells,
}: {
  cells: Array<{ month: string; laneId: string; baseAmount?: number }>;
}) {
  return finalizePocketAssignments({
    cells: cells.map(({ month, laneId, baseAmount }) => ({
      id: cellId(month, laneId),
      ...(baseAmount !== undefined && { baseAmount }),
    })),
  });
}

export type BaseSlotField = 'budget' | 'sum-amount' | 'leftover' | 'carryover';

/**
 * A category's base slot when its envelope cells do not describe it: an
 * expense category after a cutover (its own lane retired or superseded) or
 * while it inherits other base lanes. Undefined when the category's own
 * cells are the slot's, including every income category: income rows leave
 * expense lanes and keep the income aggregation (AT7).
 */
async function divergentBaseSlot(
  category: string,
): Promise<Slot | null | undefined> {
  const row = await db.first<{ status: string }>(
    'SELECT status FROM slot_resolution WHERE lane = ?',
    [category],
  );
  if (!row) return undefined;
  const kind = await db.first<{ is_income: number }>(
    'SELECT is_income FROM categories WHERE id = ?',
    [category],
  );
  if (kind?.is_income) return undefined;
  if (row.status === 'live') {
    const inherits = await db.first(
      `SELECT 1 FROM slot_resolution
         WHERE effective_owner = ? AND kind = 'base' AND lane != ? LIMIT 1`,
      [category, category],
    );
    if (!inherits) return undefined;
  }
  return baseSlotOf(category);
}

type LaneHistory = Map<
  string,
  { assigned: number; spent: number; carryover: boolean }
>;

/** A base lane's months: assignments, eligible spending and carry flags. */
function laneHistory(member: Member): LaneHistory {
  const months: LaneHistory = new Map();
  const at = (month: string) => {
    const found = months.get(month) ?? {
      assigned: 0,
      spent: 0,
      carryover: false,
    };
    months.set(month, found);
    return found;
  };
  const cells = member.isCategoryLane
    ? db.runQuery<{ month: number; amount: number | null; carryover: number }>(
        'SELECT month, amount, carryover FROM zero_budgets WHERE category = ?',
        [member.lane],
        true,
      )
    : db.runQuery<{ month: number; amount: number | null; carryover: number }>(
        'SELECT month, amount, carryover FROM pocket_budgets WHERE lane = ?',
        [member.lane],
        true,
      );
  for (const cell of cells) {
    const month = String(cell.month);
    const entry = at(`${month.slice(0, 4)}-${month.slice(4)}`);
    entry.assigned += cell.amount ?? 0;
    entry.carryover = cell.carryover === 1;
  }
  for (const row of db.runQuery<{ date: number; amount: number | null }>(
    `SELECT t.date AS date, t.amount AS amount FROM v_transaction_lanes l
       JOIN transactions t ON t.id = l.id
     WHERE l.lane = ? AND t.tombstone = 0`,
    [member.lane],
    true,
  )) {
    at(monthUtils.monthFromDate(db.fromDateRepr(row.date))).spent +=
      row.amount ?? 0;
  }
  return months;
}

type LaneMonth = {
  assigned: number;
  spent: number;
  /** What carried in after the lane's own reset of last month. */
  carryIn: number;
  /** The ending balance. */
  leftover: number;
  carryover: boolean;
};

/** Each member lane's month by its own carry and reset recurrence. */
function laneMonths(slot: Slot, month: string): LaneMonth[] {
  return slot.members.map(member => {
    const history = laneHistory(member);
    const first = [...history.keys()].reduce(
      (min, m) => (m < min ? m : min),
      month,
    );
    let state: LaneMonth = {
      assigned: 0,
      spent: 0,
      carryIn: 0,
      leftover: 0,
      carryover: false,
    };
    for (const m of monthUtils.rangeInclusive(first, month)) {
      const entry = history.get(m);
      const carryIn =
        state.carryover || state.leftover > 0 ? state.leftover : 0;
      const assigned = entry?.assigned ?? 0;
      const spent = entry?.spent ?? 0;
      state = {
        assigned,
        spent,
        carryIn,
        leftover: assigned + spent + carryIn,
        carryover: entry?.carryover ?? false,
      };
    }
    return state;
  });
}

const sum = (lanes: LaneMonth[], pick: (lane: LaneMonth) => number) =>
  lanes.reduce((total, lane) => total + pick(lane), 0);

/**
 * A category's base-slot cell for template and cleanup inputs, computed
 * from its current base slot's lanes when its own envelope cells describe
 * another history; undefined when those cells are the slot's. The balance
 * is the ending balance: the sum of each lane's own carry and reset
 * recurrence. Carry is the own lane's flag.
 */
export async function baseSlotCell(
  category: string,
  month: string,
  field: BaseSlotField,
): Promise<number | boolean | undefined> {
  const slot = await divergentBaseSlot(category);
  if (slot === undefined) return undefined;
  if (field === 'carryover') {
    if (!slot) return false;
    const [own] = slot.members;
    const row = db.firstSync<{ carryover: number }>(
      own.isCategoryLane
        ? 'SELECT carryover FROM zero_budgets WHERE month = ? AND category = ?'
        : 'SELECT carryover FROM pocket_budgets WHERE month = ? AND lane = ?',
      [Number(month.replace('-', '')), own.lane],
    );
    return row?.carryover === 1;
  }
  if (!slot) return 0;
  const lanes = laneMonths(slot, month);
  if (field === 'budget') return sum(lanes, lane => lane.assigned);
  if (field === 'sum-amount') return sum(lanes, lane => lane.spent);
  return sum(lanes, lane => lane.leftover);
}

/**
 * What a category's base slot carries into a month after each lane's own
 * reset, for templates; undefined when its envelope cells describe it, so
 * the category's single carry rule applies.
 */
export async function baseSlotCarryIn(
  category: string,
  month: string,
): Promise<number | undefined> {
  const slot = await divergentBaseSlot(category);
  if (slot === undefined) return undefined;
  return slot ? sum(laneMonths(slot, month), lane => lane.carryIn) : 0;
}

/**
 * A category's overspending that resets at the end of the month by its own
 * month cell: its balance when negative, unless that cell rolls over.
 */
export async function categoryUncarriedOverspending(
  category: string,
  month: string,
  balance: number,
): Promise<number> {
  const row = await db.first<{ carryover: number | null }>(
    'SELECT carryover FROM zero_budgets WHERE month = ? and category = ?',
    [Number(month.replace('-', '')), category],
  );
  return balance < 0 && !row?.carryover ? -balance : 0;
}

/**
 * The amount cleanup adds to a category's base slot (MC-10.5 cleanup
 * ruling). For a divergent slot it is a fixed point of observable state,
 * written to the own lane only: with C the own lane's carry-in, A its
 * signed assignment, S its spending and D the inherited lanes' resetting
 * deficits (rollover off), the own assignment must reach D - C, and also
 * cover S when the own lane does not roll over. A rolling-over own lane
 * with no resetting inherited deficit gets nothing. For other categories,
 * the category rule.
 */
export async function uncarriedOverspending(
  category: string,
  month: string,
  balance: number,
): Promise<number> {
  const slot = await divergentBaseSlot(category);
  if (slot === undefined) {
    return categoryUncarriedOverspending(category, month, balance);
  }
  if (!slot) return 0;
  const [own, ...inherited] = laneMonths(slot, month);
  const resetting = sum(inherited, lane =>
    lane.leftover < 0 && !lane.carryover ? -lane.leftover : 0,
  );
  if (resetting === 0 && own.carryover) return 0;
  const minimum = resetting - own.carryIn - (own.carryover ? 0 : own.spent);
  return Math.max(0, minimum - own.assigned);
}
