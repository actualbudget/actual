import * as db from '#server/db';
import type { selectRate } from '#server/exchange-rates/app';
import * as sheet from '#server/sheet';
import { getRecordedAmountPrecision } from '#server/util/currency';
import * as monthUtils from '#shared/months';
import { MAX_SAFE_NUMBER } from '#shared/util';
import type { ExchangeRateEntity, FxRateUsed } from '#types/models';

import { rateUsed, walkFxValuation } from './fx-valuation';
import type { FxMonth, FxWalkAccount, FxWalkRow } from './fx-valuation';
import { baseSlotShown, encodingCurrency, slotFor } from './pockets';
import type { LaneStatus } from './pockets';
import { readReservationInputs, walkReservations } from './reservations';
import type {
  PocketIncompleteReason,
  PocketValuation,
  ReservationInputs,
  ReservationLaneMonth,
  ReservationMonth,
  ReservationsMonth,
} from './reservations';

// Readers of currency pocket reservations (MC-10.3): the MC-8.2 details,
// the MC-9 report bridge, envelope-budget-month and api/budget-month. Each
// takes one synchronous snapshot, reproduces the refresh's walk on it and
// reads the cells the refresh committed; none reads the refresh's own
// in-memory results.

/** One currency's explanation: the refresh's figures and the funds left. */
export type ReservationExplanation = Omit<
  ReservationMonth,
  'exact' | 'lanes'
> & {
  /** Funds To Budget has from this currency: IV - Pincl. */
  funds: number | null;
  /** Each lane with the category it counts under (null when unresolved). */
  lanes: Array<ReservationLaneMonth & { categoryId: string | null }>;
};

export type ReservationsBridge = {
  /** reservation-changes and reservation-incomplete as computed now. */
  changes: number;
  incomplete: boolean;
  /** The cells To Budget actually read. */
  cell: { changes: number; incomplete: boolean };
  /** The cells differ from the computed pair; the next refresh writes it. */
  pending: boolean;
  /** This month's assigned bases; null while any is pending or unknown. */
  assigned: number | null;
  /** Spending, resets and revaluation: changes - assigned. */
  remainder: number | null;
  currencies: ReservationExplanation[];
};

export type PocketLaneMonth = {
  laneId: string;
  kind: 'own' | 'inherited';
  originCategoryId: string;
  /** Recorded creation encoding; native fields are at PocketMonth.precision. */
  encoding: string;
  budgeted: number | null;
  /** Frozen; null while pending. */
  budgetedBase: number | null;
  captureDate: string | null;
  spent: number | null;
  spentBase: number | null;
  balance: number | null;
  /** The lane value cell; null unless the market condition holds. */
  balanceBase: number | null;
  valueKind: 'resolved' | 'unknown';
  carryover: boolean;
  status: LaneStatus;
};

/**
 * One currency slot's month. `budgeted`, `spent` and `balance` are native
 * at `precision`; every other amount is in the budget currency.
 */
export type PocketMonth = {
  id: string;
  currency: string;
  /** Display precision: the largest of lane encodings and cell stamps. */
  precision: number;
  hidden: boolean;
  budgeted: number | null;
  budgetedBase: number | null;
  spent: number | null;
  spentBase: number | null;
  balance: number | null;
  balanceBase: number | null;
  /** balanceBase - carryIn - budgetedBase - spentBase. */
  fxContribution: number | null;
  /** The previous month's value that carried in, and the value reset. */
  carryIn: number | null;
  reset: number | null;
  valuationDate: string;
  valuation: PocketValuation;
  rate: FxRateUsed | null;
  lanes: PocketLaneMonth[];
  incomplete: PocketIncompleteReason[];
};

/**
 * An affected category's month: slot totals in the budget currency (the
 * balance valued), its base slot's sheet cells and its currency pockets.
 * balance = carryIn + budgeted + spent + fxContribution.
 */
export type CategoryPocketsMonth = {
  budgeted: number | null;
  spent: number | null;
  balance: number | null;
  carryIn: number | null;
  reset: number | null;
  fxContribution: number | null;
  base: {
    budgeted: number;
    spent: number;
    balance: number;
    carryover: boolean;
    carryIn: number;
    reset: number;
  };
  pockets: PocketMonth[];
  incomplete: PocketIncompleteReason[];
  /**
   * The category's current base slot and whether the budget shows it: after
   * Add Currency in the budget currency, history or activity, unless hidden
   * (B5). Set by the reader; envelope-budget-month only.
   */
  baseSlot?: { id: string | null; shown: boolean };
};

type LaneValueCell = { value: number; status: string };

export type PocketSnapshot = {
  today: string;
  budgetCurrency: string;
  basePrecision: number;
  budgetType: 'envelope' | 'tracking';
  createdMonths: string[];
  accounts: FxWalkAccount[];
  /** Each account's dated top-level rows in date order, future included. */
  rows: Map<string, FxWalkRow[]>;
  rates: ExchangeRateEntity[];
  inputs: Pick<ReservationInputs, 'lanes' | 'laneRows' | 'cells'>;
  slots: Array<{
    lane: string;
    origin_category: string;
    effective_owner: string | null;
    effective_category: string | null;
    status: LaneStatus;
  }>;
  hidden: Set<string>;
  /** Each created month's committed reservation and lane value cells. */
  cells: Map<
    string,
    {
      changes: number;
      incomplete: boolean;
      values: Map<string, LaneValueCell>;
    }
  >;
};

/**
 * Everything the refresh walks, plus the cells it committed, read
 * synchronously so no sync, undo or edit can produce a mixed result. The
 * account and row population is the refresh's: live on-budget accounts in
 * other currencies, every dated top-level row, future ones included.
 */
export function readPocketSnapshot(today: string): PocketSnapshot {
  const budgetCurrency =
    db.firstSync<{ value: string }>(
      "SELECT value FROM preferences WHERE id = 'defaultCurrencyCode'",
    )?.value ?? '';
  const accounts = db.runQuery<FxWalkAccount>(
    `SELECT id, name, currency, currency_precision FROM accounts
       WHERE tombstone = 0 AND offbudget = 0 AND currency IS NOT NULL
         AND currency != ?
       ORDER BY sort_order, name`,
    [budgetCurrency],
    true,
  );
  const rows = new Map<string, FxWalkRow[]>(
    accounts.map(account => [account.id, []]),
  );
  for (const row of db.runQuery<{
    acct: string;
    date: number;
    amount: number;
    transaction_amount: number | null;
  }>(
    `SELECT t.acct, t.date, t.amount, t.transaction_amount FROM transactions t
       JOIN accounts a ON a.id = t.acct
       WHERE a.tombstone = 0 AND a.offbudget = 0 AND a.currency IS NOT NULL
         AND a.currency != ? AND t.tombstone = 0 AND t.isChild = 0
         AND t.date IS NOT NULL
       ORDER BY t.date, t.id`,
    [budgetCurrency],
    true,
  )) {
    rows.get(row.acct)?.push({
      date: db.fromDateRepr(row.date),
      amount: row.amount,
      transaction_amount: row.transaction_amount,
    });
  }
  const rates = db.runQuery<ExchangeRateEntity>(
    'SELECT * FROM exchange_rates WHERE base_currency = ? AND tombstone = 0',
    [budgetCurrency],
    true,
  );
  const inputs = readReservationInputs();
  const slots = db.runQuery<PocketSnapshot['slots'][number]>(
    `SELECT lane, origin_category, effective_owner, effective_category, status
       FROM slot_resolution WHERE kind = 'foreign'`,
    [],
    true,
  );
  const hidden = new Set(
    db
      .runQuery<{
        id: string;
      }>('SELECT id FROM category_slot_meta WHERE hidden = 1', [], true)
      .map(meta => meta.id),
  );

  const spreadsheet = sheet.get();
  const meta = spreadsheet?.meta();
  const createdMonths = [
    ...((meta?.createdMonths as Set<string> | undefined) ?? []),
  ].sort();
  const cells: PocketSnapshot['cells'] = new Map();
  for (const month of createdMonths) {
    const name = monthUtils.sheetForMonth(month);
    const read = (cell: string) => spreadsheet?.getCellValue(name, cell);
    const changes = read('reservation-changes');
    const values = new Map<string, LaneValueCell>();
    for (const lane of inputs.lanes) {
      const value = read(`pocket-value-${lane.id}`);
      const status = read(`pocket-value-status-${lane.id}`);
      if (typeof value === 'number' && typeof status === 'string') {
        values.set(lane.id, { value, status });
      }
    }
    cells.set(month, {
      changes: typeof changes === 'number' ? changes : 0,
      incomplete: read('reservation-incomplete') === true,
      values,
    });
  }
  return {
    today,
    budgetCurrency,
    basePrecision: getRecordedAmountPrecision(),
    budgetType: meta?.budgetType === 'tracking' ? 'tracking' : 'envelope',
    createdMonths,
    accounts,
    rows,
    rates,
    inputs,
    slots,
    hidden,
    cells,
  };
}

/**
 * The refresh's walks on a snapshot: MC-8.1's valuation over given months
 * (rows through today) and every created month's reservations.
 */
export function walkPocketSnapshot(
  snapshot: PocketSnapshot,
  select: typeof selectRate,
) {
  const { today, budgetCurrency, basePrecision } = snapshot;
  const rates = new Map<string, FxRateUsed | null>();
  const rateOn = (currency: string, date: string) => {
    const key = `${currency}|${date}`;
    if (!rates.has(key)) {
      rates.set(
        key,
        rateUsed(
          select(snapshot.rates, {
            baseCurrency: budgetCurrency,
            quoteCurrency: currency,
            date,
          }),
        ),
      );
    }
    return rates.get(key)!;
  };
  const rowsOf = (id: string) => snapshot.rows.get(id) ?? [];
  const valuation = (months: string[]): FxMonth[] =>
    walkFxValuation({
      accounts: snapshot.accounts,
      rowsOf: id => rowsOf(id).filter(row => row.date <= today),
      months,
      today,
      basePrecision,
      rateOn,
    });
  const months = snapshot.createdMonths;
  const reservations =
    snapshot.budgetType === 'envelope' && months.length > 0
      ? walkReservations({
          months,
          today,
          basePrecision,
          accounts: snapshot.accounts,
          rowsOf,
          ...snapshot.inputs,
          fx: valuation(months),
          rateOn,
        })
      : new Map<string, ReservationsMonth>();
  return { valuation, reservations };
}

/** Reads and walks a snapshot of today, loading the rate selector first. */
export async function readPockets(today = monthUtils.currentDay()) {
  // Loaded on use, as the refresh does: the rates app registers handlers
  // when imported.
  const { selectRate } = await import('#server/exchange-rates/app');
  const snapshot = readPocketSnapshot(today);
  return { snapshot, ...walkPocketSnapshot(snapshot, selectRate) };
}

/**
 * Every affected category's month as of now, or none when the budget has
 * no currency pockets (without reading or walking anything).
 */
export async function readCategoryPockets(
  month: string,
): Promise<Map<string, CategoryPocketsMonth>> {
  const found = db.firstSync<{ found: number }>(
    "SELECT 1 AS found FROM category_pockets WHERE kind = 'foreign' LIMIT 1",
  );
  if (!found) return new Map();
  const { snapshot, reservations } = await readPockets();
  return categoryPocketMonths(snapshot, reservations, month);
}

const MAX = BigInt(MAX_SAFE_NUMBER);

/** A display amount: null when unknown or beyond the wire bound. */
function bounded(value: bigint | null): number | null {
  return value === null || value > MAX || value < -MAX ? null : Number(value);
}

/** An exact sum, null when any term is unknown. */
function total(values: Array<number | null>): bigint | null {
  let sum: bigint | null = 0n;
  for (const value of values) {
    sum = sum === null || value === null ? null : sum + BigInt(value);
  }
  return sum;
}

function shown(currency: ReservationMonth) {
  return (
    currency.lanes.length > 0 ||
    [
      currency.pocketTotal,
      currency.includedReservation,
      currency.exactChange,
      currency.writtenChange,
    ].some(value => value !== 0)
  );
}

/**
 * A created month's reservations explained for MC-8.2 and MC-9: the
 * computed pair beside the captured cells, the split into this month's
 * assigned bases and the remainder, and each currency's figures.
 */
export function reservationsBridge(
  snapshot: PocketSnapshot,
  reservations: Map<string, ReservationsMonth>,
  month: string,
): ReservationsBridge | null {
  const result = reservations.get(month);
  const cell = snapshot.cells.get(month);
  if (snapshot.budgetType !== 'envelope' || !result || !cell) return null;
  const assigned = result.incomplete
    ? null
    : total(
        result.currencies.flatMap(currency =>
          currency.lanes
            .filter(lane => lane.budgeted !== 0)
            .map(lane => (lane.budgeted === null ? null : lane.budgetedBase)),
        ),
      );
  const known = bounded(assigned);
  const categories = new Map(
    snapshot.slots.map(slot => [slot.lane, slot.effective_category]),
  );
  return {
    changes: result.changes,
    incomplete: result.incomplete,
    cell: { changes: cell.changes, incomplete: cell.incomplete },
    pending:
      cell.changes !== result.changes || cell.incomplete !== result.incomplete,
    assigned: known,
    remainder:
      known === null ? null : bounded(BigInt(result.changes) - BigInt(known)),
    currencies: result.currencies
      .filter(shown)
      .map(currency => explain(currency, categories)),
  };
}

function explain(
  { exact, ...currency }: ReservationMonth,
  categories: Map<string, string | null>,
): ReservationExplanation {
  const funds = bounded(exact.includedValue - exact.includedReservation);
  const incomplete =
    funds === null && !currency.incomplete.includes('amount-out-of-range')
      ? [...currency.incomplete, 'amount-out-of-range' as const]
      : currency.incomplete;
  return {
    ...currency,
    funds,
    incomplete,
    lanes: currency.lanes.map(lane => ({
      ...lane,
      categoryId: categories.get(lane.laneId) ?? null,
    })),
  };
}

// Reasons each slot works out from its own lanes and value cells, rather
// than its currency.
const SLOT_REASONS: PocketIncompleteReason[] = [
  'entry-pending',
  'amount-out-of-range',
];
// What can leave a month's lane values unknown, named again when a later
// month carries them.
const CARRY_CAUSES: PocketIncompleteReason[] = [
  'rate-unavailable',
  'fx-excluded',
  'precision-unavailable',
  'pair-encoding-mismatch',
];

function precisionOf(encoding: string | null | undefined): number | null {
  const precision = Number(encoding?.split('.')[1]);
  return Number.isInteger(precision) && precision >= 0 && precision <= 15
    ? precision
    : null;
}

/** An exact sum, null when any term is unknown. */
function exactSum(values: Array<bigint | null>): bigint | null {
  let sum: bigint | null = 0n;
  for (const value of values) {
    sum = sum === null || value === null ? null : sum + value;
  }
  return sum;
}

/** The amounts a slot passes to its category, before display bounds. */
type ExactSlot = {
  budgetedBase: bigint | null;
  spentBase: bigint | null;
  balanceBase: bigint | null;
  carryIn: bigint | null;
  reset: bigint | null;
  fxContribution: bigint | null;
};

/**
 * Every affected category's month: categories with a currency pocket,
 * owned or inherited. Lane values are the committed cells; the base slot is
 * the category's sheet cells. Every total is formed exactly and bounded
 * once, so a representable total survives an unrepresentable term.
 */
export function categoryPocketMonths(
  snapshot: PocketSnapshot,
  reservations: Map<string, ReservationsMonth>,
  month: string,
): Map<string, CategoryPocketsMonth> {
  const result = new Map<string, CategoryPocketsMonth>();
  const walked = reservations.get(month);
  if (snapshot.budgetType !== 'envelope' || !walked) return result;
  const shownLanes = new Set(
    walked.currencies.flatMap(currency =>
      currency.lanes.map(lane => lane.laneId),
    ),
  );
  const encodings = new Map(snapshot.inputs.lanes.map(l => [l.id, l.encoding]));

  // Slots by category, then by currency.
  const slots = new Map<string, Map<string, PocketSnapshot['slots']>>();
  for (const slot of snapshot.slots) {
    const category = slot.effective_category;
    const encoding = encodings.get(slot.lane);
    if (!category || encoding === undefined || !shownLanes.has(slot.lane)) {
      continue;
    }
    const byCurrency = slots.get(category) ?? new Map();
    const currency = encodingCurrency(encoding);
    byCurrency.set(currency, [...(byCurrency.get(currency) ?? []), slot]);
    slots.set(category, byCurrency);
  }

  const sheetName = monthUtils.sheetForMonth(month);
  const prevMonth = monthUtils.prevMonth(month);
  const cellOf = (name: string, of = sheetName) => {
    const value = sheet.getCellValue(of, name);
    return typeof value === 'number' ? value : 0;
  };
  for (const [category, byCurrency] of slots) {
    const slotMonths = [...byCurrency.values()].map(members =>
      pocketMonth(members, month, { walked, reservations, snapshot }),
    );
    const pockets = slotMonths.map(slot => slot.pocket);
    const budgeted = cellOf(`budget-${category}`);
    const spent = cellOf(`sum-amount-${category}`);
    const balance = cellOf(`leftover-${category}`);
    const carryIn = balance - budgeted - spent;
    const prevLeftover = snapshot.createdMonths.includes(prevMonth)
      ? cellOf(`leftover-${category}`, monthUtils.sheetForMonth(prevMonth))
      : carryIn;
    const base = {
      budgeted,
      spent,
      balance,
      carryover:
        sheet.getCellValue(sheetName, `carryover-${category}`) === true,
      carryIn,
      reset: prevLeftover - carryIn,
    };
    const reasons = new Set(pockets.flatMap(pocket => pocket.incomplete));
    const total = (baseAmount: number, field: keyof ExactSlot) => {
      const exact = exactSum([
        BigInt(baseAmount),
        ...slotMonths.map(slot => slot.exact[field]),
      ]);
      const value = bounded(exact);
      if (exact !== null && value === null) reasons.add('amount-out-of-range');
      return value;
    };
    result.set(category, {
      budgeted: total(base.budgeted, 'budgetedBase'),
      spent: total(base.spent, 'spentBase'),
      balance: total(base.balance, 'balanceBase'),
      carryIn: total(base.carryIn, 'carryIn'),
      reset: total(base.reset, 'reset'),
      fxContribution: total(0, 'fxContribution'),
      base,
      pockets,
      incomplete: [...reasons],
      baseSlot: { id: slotFor(category, ''), shown: baseSlotShown(category) },
    });
  }
  return result;
}

type LaneNatives = {
  budgeted: bigint | null;
  spent: bigint | null;
  spentBase: bigint;
  carryIn: bigint | null;
  reset: bigint | null;
  balance: bigint | null;
};

/**
 * A lane's native recurrence through a month, exactly at a scale: the
 * walker's rule (assignments, eligible rows, and carry of last month's
 * leftover when its cell carries, else of a positive one), unbounded.
 */
function laneNatives(
  snapshot: PocketSnapshot,
  lane: string,
  month: string,
  scale: number,
) {
  const up = (value: number | null, stamp: string | null) => {
    const precision = precisionOf(stamp);
    return value === null || precision === null || precision > scale
      ? null
      : BigInt(value) * 10n ** BigInt(scale - precision);
  };
  const cells = new Map(
    snapshot.inputs.cells
      .filter(cell => cell.lane === lane)
      .map(cell => [cell.month, cell]),
  );
  const rows = snapshot.inputs.laneRows.filter(row => row.lane === lane);
  const first = [
    month,
    ...cells.keys(),
    ...rows.map(row => monthUtils.monthFromDate(row.date)),
  ].reduce((min, m) => (m < min ? m : min));
  let leftover: bigint | null = 0n;
  let carry = false;
  let current: LaneNatives = {
    budgeted: 0n,
    spent: 0n,
    spentBase: 0n,
    carryIn: 0n,
    reset: 0n,
    balance: 0n,
  };
  for (const m of monthUtils.rangeInclusive(first, month)) {
    const cell = cells.get(m);
    // An absent authority (undo of a first write) is native 0 with no
    // stamp, as the snapshot reads it: a zero assignment at any scale. A
    // mismatched stamp is a null native and stays unknown.
    const budgeted =
      !cell || cell.native === 0 ? 0n : up(cell.native, cell.stamp);
    let spent: bigint | null = 0n;
    let spentBase = 0n;
    for (const row of rows) {
      if (monthUtils.monthFromDate(row.date) !== m) continue;
      const native = up(row.native, row.stamp);
      spent = spent === null || native === null ? null : spent + native;
      spentBase += BigInt(row.amount);
    }
    const carryIn: bigint | null =
      leftover === null ? null : carry || leftover > 0n ? leftover : 0n;
    const reset: bigint | null =
      leftover === null || carryIn === null ? null : leftover - carryIn;
    leftover =
      budgeted === null || spent === null || carryIn === null
        ? null
        : budgeted + spent + carryIn;
    carry = cell?.carryover ?? false;
    current = { budgeted, spent, spentBase, carryIn, reset, balance: leftover };
  }
  return { ...current, cell: cells.get(month) };
}

function pocketMonth(
  members: PocketSnapshot['slots'],
  month: string,
  {
    walked,
    reservations,
    snapshot,
  }: {
    walked: ReservationsMonth;
    reservations: Map<string, ReservationsMonth>;
    snapshot: PocketSnapshot;
  },
): { pocket: PocketMonth; exact: ExactSlot } {
  const id = members[0].effective_owner ?? members[0].lane;
  const ids = new Set(members.map(member => member.lane));
  const lanes = snapshot.inputs.lanes.filter(lane => ids.has(lane.id));
  const code = encodingCurrency(lanes[0].encoding);
  const currency = walked.currencies.find(c => c.currency === code)!;
  // The display precision: the largest of the lanes' encodings and their
  // cells' stamps, at which every lane amount is exact.
  const precision = Math.max(
    0,
    ...[
      ...lanes.map(lane => precisionOf(lane.encoding)),
      ...snapshot.inputs.cells
        .filter(cell => ids.has(cell.lane) && cell.native !== null)
        .map(cell => precisionOf(cell.stamp)),
    ].filter(p => p !== null),
  );
  // While the currency's native is unknown, every lane's displayed balance
  // is unknown, as in the currency's own explanation (MC-10.2).
  const unknownNative = currency.valuation === 'unknown-native';
  const reasons = new Set<PocketIncompleteReason>(
    currency.incomplete.filter(reason => !SLOT_REASONS.includes(reason)),
  );
  const show = (exact: bigint | null) => {
    const value = bounded(exact);
    if (exact !== null && value === null) reasons.add('amount-out-of-range');
    return value;
  };
  // A lane's exact value: its committed cell, or the walk's exact
  // allocation behind a committed out-of-range status.
  const valueOf = (of: string, lane: string) => {
    const cell = snapshot.cells.get(of)?.values.get(lane);
    if (cell?.status === 'resolved') return BigInt(cell.value);
    if (cell?.status !== 'amount-out-of-range') return null;
    reasons.add('amount-out-of-range');
    return (
      reservations.get(of)?.laneValues.find(v => v.lane === lane)?.value ?? null
    );
  };
  const previous = reservations
    .get(monthUtils.prevMonth(month))
    ?.currencies.find(c => c.currency === code);
  const unvalued = () => {
    reasons.add('reservation-unvalued');
    for (const reason of previous?.incomplete ?? []) {
      if (CARRY_CAUSES.includes(reason)) reasons.add(reason);
    }
  };

  const rows = members.map(member => {
    const natives = laneNatives(snapshot, member.lane, month, precision);
    const { cell } = natives;
    const status = snapshot.cells.get(month)?.values.get(member.lane)?.status;
    const value = valueOf(month, member.lane);
    // A carried or reset native carries or discards last month's value.
    const carried = (native: bigint | null) => {
      if (native === 0n) return 0n;
      // An unknown native is explained by its stamp.
      if (native === null) return null;
      const last = valueOf(monthUtils.prevMonth(month), member.lane);
      if (last === null) unvalued();
      return last;
    };
    // The stored frozen base, whatever the display of its native: null
    // only for a mismatched stamp or while pending.
    const budgetedBase =
      !cell || cell.native === 0
        ? 0n
        : cell.native === null || cell.base === null
          ? null
          : BigInt(cell.base);
    if (
      cell &&
      cell.native !== null &&
      cell.native !== 0 &&
      cell.base === null
    ) {
      reasons.add('entry-pending');
    }
    if (member.status === 'unresolved') reasons.add('owner-unresolved');
    const carryIn = carried(natives.carryIn);
    const reset = carried(natives.reset);
    const balance = unknownNative ? null : natives.balance;
    // The value's change not explained by carry, assignment or spending.
    const fx =
      value === null || carryIn === null || budgetedBase === null
        ? null
        : value - carryIn - budgetedBase - natives.spentBase;
    return {
      natives: { ...natives, balance },
      exact: {
        budgetedBase,
        spentBase: natives.spentBase,
        balanceBase: value,
        carryIn,
        reset,
        fxContribution: fx,
      } satisfies ExactSlot,
      lane: {
        laneId: member.lane,
        kind:
          member.lane === (member.effective_owner ?? member.lane)
            ? ('own' as const)
            : ('inherited' as const),
        originCategoryId: member.origin_category,
        encoding: lanes.find(l => l.id === member.lane)?.encoding ?? '',
        budgeted: show(natives.budgeted),
        budgetedBase: show(budgetedBase),
        captureDate: cell?.captureDate ?? null,
        spent: show(natives.spent),
        spentBase: show(natives.spentBase),
        balance: show(balance),
        balanceBase: show(value),
        // An out-of-range value is known, though not representable.
        valueKind:
          status === 'resolved' || status === 'amount-out-of-range'
            ? ('resolved' as const)
            : ('unknown' as const),
        carryover: cell?.carryover ?? false,
        status: member.status,
      },
    };
  });

  const sum = (pick: (row: (typeof rows)[number]) => bigint | null) =>
    exactSum(rows.map(pick));
  const exact: ExactSlot = {
    budgetedBase: sum(row => row.exact.budgetedBase),
    spentBase: sum(row => row.exact.spentBase),
    balanceBase: sum(row => row.exact.balanceBase),
    carryIn: sum(row => row.exact.carryIn),
    reset: sum(row => row.exact.reset),
    fxContribution: sum(row => row.exact.fxContribution),
  };
  const pocket: PocketMonth = {
    id,
    currency: code,
    precision,
    hidden: snapshot.hidden.has(id),
    budgeted: show(sum(row => row.natives.budgeted)),
    budgetedBase: show(exact.budgetedBase),
    spent: show(sum(row => row.natives.spent)),
    spentBase: show(exact.spentBase),
    balance: show(sum(row => row.natives.balance)),
    balanceBase: show(exact.balanceBase),
    fxContribution: show(exact.fxContribution),
    carryIn: show(exact.carryIn),
    reset: show(exact.reset),
    valuationDate: currency.valuationDate,
    valuation: currency.valuation,
    rate: currency.rate,
    lanes: rows
      .map(row => row.lane)
      .sort((a, b) =>
        a.kind !== b.kind
          ? a.kind === 'own'
            ? -1
            : 1
          : a.laneId < b.laneId
            ? -1
            : 1,
      ),
    incomplete: [...reasons],
  };
  return { pocket, exact };
}
