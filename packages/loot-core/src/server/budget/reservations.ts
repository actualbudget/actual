import * as db from '#server/db';
import { batchMessages } from '#server/sync';
import {
  getDefaultCurrencyCode,
  getRecordedAmountPrecision,
} from '#server/util/currency';
import { allocateFractionsExact, roundEven } from '#shared/amount-rescale';
import { bigNativeToBaseFraction, nativeToBase } from '#shared/exchange-rate';
import * as monthUtils from '#shared/months';
import { MAX_SAFE_NUMBER } from '#shared/util';
import type { FxRateUsed } from '#types/models';

import { walkFxValuation } from './fx-valuation';
import type { FxMonth, FxWalkAccount, FxWalkRow } from './fx-valuation';
import { budgetPair, encodingCurrency, parseBudgetPair } from './pockets';

// Category currency pocket arithmetic (MC-10.2). Each currency's pocket
// total P is the base value of reserved native units that To Budget
// excludes, evaluated afresh every month by one stateless rule chain; To
// Budget subtracts the change in the reservation it has actually included
// (Pincl), written by the valuation refresh as `reservation-changes`.

export type PocketIncompleteReason =
  | 'rate-unavailable'
  | 'fx-excluded'
  | 'reservation-unvalued'
  | 'reservation-incomplete'
  | 'entry-pending'
  | 'precision-unavailable'
  | 'pair-encoding-mismatch'
  | 'amount-out-of-range'
  | 'owner-unresolved';

export type PocketValuation =
  | 'market' // rule 1 or 2 under the market condition
  | 'unreserved' // rule 1 without it
  | 'included-rate' // rule 3
  | 'last-unit-value' // rule 4
  | 'unvalued' // rule 5
  | 'unknown-native'; // R unknown

/** One foreign lane's month. Native fields are at the currency's scale. */
export type ReservationLaneMonth = {
  laneId: string;
  budgeted: number | null;
  /** Frozen; null while pending. */
  budgetedBase: number | null;
  captureDate: string | null;
  spent: number | null;
  spentBase: number | null;
  carryIn: number | null;
  /** The native the carry rule discarded (zero or negative). */
  reset: number | null;
  balance: number | null;
  /** Allocated value; null unless the market condition holds. */
  balanceBase: number | null;
  valueKind: 'resolved' | 'unknown';
  carryover: boolean;
  /**
   * Display decomposition of the value change since the last known value:
   * the assigned bases (null while any is pending) and reservation FX.
   */
  assignedBase: number | null;
  reservationFx: number | null;
};

/**
 * One currency's month. Amounts are display-tier numbers: null when
 * unknown, or out of range with `amount-out-of-range`.
 */
export type ReservationMonth = {
  currency: string;
  /** The common scale of every native field. */
  precision: number;
  /** b(M): month end for past months, today otherwise. */
  valuationDate: string;
  rate: FxRateUsed | null;
  rule: 1 | 2 | 3 | 4 | 5 | null;
  valuation: PocketValuation;
  /** Rule 4: the month whose unit value is carried. */
  carriedFrom: string | null;
  holdings: number | null; // H
  bookedHoldings: number | null; // BH
  heldAtValuation: number | null; // H_b
  bookedAtValuation: number | null; // BH_b
  reserved: number | null; // R
  unreserved: number | null; // U
  holdingsValue: number | null; // VH
  gap: number | null; // G
  excludedFx: number | null; // E
  includedFx: number | null; // F_incl
  includedValue: number | null; // IV
  marketHoldings: number | null; // V(H)
  marketUnreserved: number | null; // V(U)
  accountRounding: number | null; // D
  planning: number | null; // Q
  pocketTotal: number | null; // P (gross)
  includedReservation: number | null; // Pincl
  exactChange: number | null; // X before bounding
  writtenChange: number | null; // X as written
  spentBase: number | null; // S
  backing: { reserved: number | null; held: number | null; shortage: boolean };
  incomplete: PocketIncompleteReason[];
  lanes: ReservationLaneMonth[];
  /** The identity's exact terms, never bounded. */
  exact: { includedValue: bigint; includedReservation: bigint };
};

export type ReservationsMonth = {
  /** reservation-changes: the sum of written contributions. */
  changes: number;
  incomplete: boolean;
  currencies: ReservationMonth[];
  /**
   * Every foreign lane's exact value, null unless the market condition
   * holds: the refresh writes them as lane value cells.
   */
  laneValues: Array<{ lane: string; value: bigint | null }>;
};

export type ReservationLane = {
  id: string;
  encoding: string;
  /** Tombstoned lanes are shown only while they hold history. */
  tombstone: boolean;
};

export type ReservationLaneRow = {
  lane: string;
  date: string;
  amount: number;
  native: number | null;
  stamp: string;
};

export type ReservationCell = {
  lane: string;
  month: string;
  /** Null when the stamp does not fit the lane (pair-encoding-mismatch). */
  native: number | null;
  stamp: string | null;
  base: number | null;
  captureDate: string | null;
  carryover: boolean;
};

const MAX = BigInt(MAX_SAFE_NUMBER);

function inRange(value: bigint) {
  return value <= MAX && value >= -MAX;
}

function precisionOf(encoding: string | null | undefined): number | null {
  const precision = Number(encoding?.split('.')[1]);
  return Number.isInteger(precision) && precision >= 0 && precision <= 15
    ? precision
    : null;
}

/** Rounds n / d half to even for a denominator of either sign. */
function divideEven(numerator: bigint, denominator: bigint) {
  return denominator < 0n
    ? roundEven(-numerator, -denominator)
    : roundEven(numerator, denominator);
}

const sign = (value: bigint) => (value > 0n ? 1 : value < 0n ? -1 : 0);
const max0 = (value: bigint) => (value < 0n ? 0n : value);

type LaneState = {
  lane: ReservationLane;
  precision: number;
  cells: Map<string, ReservationCell>;
  rows: Map<string, { native: bigint | null; base: bigint }>;
  leftover: bigint | null;
  carry: boolean;
  lastValue: bigint | null;
  window: { start: bigint; assigned: bigint | null; spent: bigint };
};

type Holding = { date: string; native: bigint; base: bigint };

type CurrencyState = {
  currency: string;
  scale: number;
  unknownReason: 'precision-unavailable' | null;
  holdings: Holding[];
  accounts: Set<string>;
  lanes: LaneState[];
  at: { end: number; b: number };
  H: bigint;
  BH: bigint;
  Hb: bigint;
  BHb: bigint;
  fIncl: bigint;
  vh: bigint | null;
  prev: {
    month: string | null;
    R: bigint | null;
    P: bigint | null;
    carriedFrom: string | null;
  };
  pIncl: bigint;
};

function currencyState(
  currency: string,
  input: ReservationInputs,
): CurrencyState {
  const accounts = input.accounts.filter(a => a.currency === currency);
  const lanes = input.lanes
    .filter(lane => encodingCurrency(lane.encoding) === currency)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const laneIds = new Set(lanes.map(lane => lane.id));
  const laneRows = input.laneRows.filter(row => laneIds.has(row.lane));
  const cells = input.cells.filter(cell => laneIds.has(cell.lane));
  const accountPrecisions = accounts.map(a => a.currency_precision);
  const unknownReason = accountPrecisions.some(
    p => p === null || precisionOf(`.${p}`) === null,
  )
    ? 'precision-unavailable'
    : null;
  // The largest recorded precision present in the currency.
  const scale = Math.max(
    0,
    ...[
      ...accountPrecisions.map(p => precisionOf(`.${p}`)),
      ...lanes.map(lane => precisionOf(lane.encoding)),
      ...cells
        .filter(cell => cell.native !== null)
        .map(cell => precisionOf(cell.stamp)),
      ...laneRows.map(row => precisionOf(row.stamp)),
    ].filter(p => p !== null),
  );
  const up = (value: number, precision: number) =>
    BigInt(value) * 10n ** BigInt(scale - precision);

  const holdings: Holding[] = [];
  if (!unknownReason) {
    for (const account of accounts) {
      for (const row of input.rowsOf(account.id)) {
        holdings.push({
          date: row.date,
          native: up(row.transaction_amount ?? 0, account.currency_precision!),
          base: BigInt(row.amount),
        });
      }
    }
  }
  holdings.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const laneStates = lanes.map((lane): LaneState => {
    const precision = precisionOf(lane.encoding) ?? scale;
    const rows = new Map<string, { native: bigint | null; base: bigint }>();
    for (const row of laneRows) {
      if (row.lane !== lane.id) continue;
      const month = monthUtils.monthFromDate(row.date);
      const sum = rows.get(month) ?? { native: 0n, base: 0n };
      const p = precisionOf(row.stamp);
      sum.native =
        sum.native === null || row.native === null || p === null
          ? null
          : sum.native + up(row.native, p);
      sum.base += BigInt(row.amount);
      rows.set(month, sum);
    }
    return {
      lane,
      precision,
      cells: new Map(
        cells
          .filter(cell => cell.lane === lane.id)
          .map(cell => [cell.month, cell]),
      ),
      rows,
      leftover: 0n,
      carry: false,
      lastValue: 0n,
      window: { start: 0n, assigned: 0n, spent: 0n },
    };
  });

  return {
    currency,
    scale,
    unknownReason,
    holdings,
    accounts: new Set(accounts.map(a => a.id)),
    lanes: laneStates,
    at: { end: 0, b: 0 },
    H: 0n,
    BH: 0n,
    Hb: 0n,
    BHb: 0n,
    fIncl: 0n,
    // Without on-budget accounts every close resolves, to zero.
    vh: accounts.length === 0 ? 0n : null,
    prev: { month: null, R: 0n, P: 0n, carriedFrom: null },
    pIncl: 0n,
  };
}

type LaneStep = {
  state: LaneState;
  assign: bigint | null;
  cell: ReservationCell | undefined;
  spent: bigint | null;
  spentBase: bigint;
  carryIn: bigint | null;
  reset: bigint | null;
  leftover: bigint | null;
  value: bigint | null;
  assignedBase: bigint | null;
  reservationFx: bigint | null;
};

type Step = {
  state: CurrencyState;
  b: string;
  rate: FxRateUsed | null;
  rule: ReservationMonth['rule'];
  valuation: PocketValuation;
  carriedFrom: string | null;
  R: bigint | null;
  U: bigint | null;
  G: bigint | null;
  E: bigint | null;
  IV: bigint;
  vH: bigint | null;
  vU: bigint | null;
  D: bigint | null;
  Q: bigint | null;
  P: bigint;
  S: bigint;
  X: bigint;
  written: bigint;
  reasons: Set<PocketIncompleteReason>;
  lanes: LaneStep[];
};

function stepCurrency(
  state: CurrencyState,
  month: string,
  input: ReservationInputs,
  fxEntry: FxMonth | undefined,
  closeEntry: FxMonth | undefined,
  current: string,
): Step {
  const { today, basePrecision: bp } = input;
  const end = monthUtils.getMonthEnd(`${month}-01`);
  const b = month < current ? end : today;
  const reasons = new Set<PocketIncompleteReason>();

  // H and BH through the planning cutoff (the month's end), H_b and BH_b
  // through b(M). Both bounds only move forward.
  const { holdings } = state;
  while (state.at.end < holdings.length && holdings[state.at.end].date <= end) {
    state.H += holdings[state.at.end].native;
    state.BH += holdings[state.at.end].base;
    state.at.end++;
  }
  while (state.at.b < holdings.length && holdings[state.at.b].date <= b) {
    state.Hb += holdings[state.at.b].native;
    state.BHb += holdings[state.at.b].base;
    state.at.b++;
  }

  // What MC-8.1 included for this currency: only FX written in created
  // months. Future months add nothing.
  const ours = (entry: FxMonth) =>
    entry.accounts.filter(a => state.accounts.has(a.account));
  if (month <= current && fxEntry) {
    const included =
      fxEntry.posted !== null &&
      fxEntry.broughtForward !== null &&
      inRange(BigInt(fxEntry.posted) + BigInt(fxEntry.broughtForward));
    if (included) {
      for (const row of ours(fxEntry)) {
        state.fIncl += BigInt(row.posted) + BigInt(row.broughtForward ?? 0);
      }
    }
  }
  // MC-8.1's account close values at b(M), in every walked month with or
  // without a sheet. Future months are valued at today's close.
  if (month <= current && closeEntry) {
    const rows = ours(closeEntry);
    state.vh = rows.some(row => row.closing === null)
      ? null
      : rows.reduce((sum, row) => sum + BigInt(row.closing!), 0n);
  }

  const { H, BH, Hb, BHb, fIncl } = state;
  const rate = state.unknownReason ? null : input.rateOn(state.currency, b);
  const fraction = (native: bigint) =>
    bigNativeToBaseFraction(native, state.scale, bp, rate!.rate);
  const V = (native: bigint) => {
    const { numerator, denominator } = fraction(native);
    return divideEven(numerator, denominator);
  };
  const G = state.vh === null ? null : state.vh - BHb;
  const E = G === null ? null : G - fIncl;
  const IV = BH + fIncl;
  const market = rate !== null && E === 0n;

  // Lane recurrences, each at its own carry and reset rule.
  const lanes = state.lanes.map((lane): LaneStep => {
    const cell = lane.cells.get(month);
    const assign = !cell
      ? 0n
      : cell.native === null
        ? null
        : BigInt(cell.native) *
          10n ** BigInt(state.scale - (precisionOf(cell.stamp) ?? 0));
    const rows = lane.rows.get(month);
    const spent = rows ? rows.native : 0n;
    const prev = lane.leftover;
    const carryIn = prev === null ? null : lane.carry ? prev : max0(prev);
    const leftover =
      assign === null || spent === null || carryIn === null
        ? null
        : assign + spent + carryIn;
    return {
      state: lane,
      assign,
      cell,
      spent,
      spentBase: rows?.base ?? 0n,
      carryIn,
      reset: prev === null || carryIn === null ? null : prev - carryIn,
      leftover,
      value: null,
      assignedBase: null,
      reservationFx: null,
    };
  });
  const S = lanes.reduce((sum, lane) => sum + lane.spentBase, 0n);
  const R = lanes.some(lane => lane.leftover === null)
    ? null
    : lanes.reduce((sum, lane) => sum + lane.leftover!, 0n);
  if (lanes.some(l => l.cell && l.cell.native !== 0 && l.cell.base === null)) {
    reasons.add('entry-pending');
  }

  const U = R === null ? null : H - R;
  const vH = rate ? V(H) : null;
  const vU = rate && U !== null ? V(U) : null;
  const D = market ? state.vh! - V(Hb) : null;
  const Q = market ? BH - BHb - (V(H) - V(Hb)) : null;

  let rule: Step['rule'] = null;
  let valuation: PocketValuation;
  let carriedFrom: string | null = null;
  let P: bigint;
  const prev = state.prev;
  if (R === null || state.unknownReason) {
    // The native is unknown: no rule applies and the currency contributes
    // nothing this month. P is a placeholder, never a value.
    valuation = 'unknown-native';
    P = state.pIncl + S;
    reasons.add(state.unknownReason ?? 'pair-encoding-mismatch');
    reasons.add('reservation-incomplete');
  } else if (R === 0n) {
    rule = 1;
    valuation = market ? 'market' : 'unreserved';
    P = 0n;
  } else if (market) {
    rule = 2;
    valuation = 'market';
    P = vH! - vU!;
  } else if (H !== 0n && sign(H) === sign(IV)) {
    // The reserved share at the rate To Budget has actually included.
    rule = 3;
    valuation = 'included-rate';
    P = IV - divideEven(U! * IV, H);
    reasons.add(rate ? 'fx-excluded' : 'rate-unavailable');
  } else if (
    prev.R !== null &&
    prev.P !== null &&
    prev.R !== 0n &&
    sign(prev.R) === sign(prev.P)
  ) {
    rule = 4;
    valuation = 'last-unit-value';
    carriedFrom = prev.carriedFrom ?? prev.month;
    P = divideEven(R * prev.P, prev.R);
    reasons.add('reservation-unvalued');
  } else {
    rule = 5;
    valuation = 'unvalued';
    P = 0n;
    reasons.add('reservation-unvalued');
  }
  if (!rate && !state.unknownReason) reasons.add('rate-unavailable');

  // Lane values exist only under the market condition: P allocated over
  // lanes with native units by exact fractions at the rate.
  if (market && R !== null) {
    const held = lanes.filter(lane => lane.leftover !== 0n);
    // Exact: each value is bounded alone, at its display conversion.
    const { denominator } = fraction(1n);
    const values = new Map(
      allocateFractionsExact(
        held.map(lane => ({
          id: lane.state.lane.id,
          numerator: fraction(lane.leftover!).numerator,
        })),
        denominator,
        P * denominator,
      ).map(({ id, amount }) => [id, amount]),
    );
    for (const lane of lanes) {
      lane.value =
        lane.leftover === 0n ? 0n : (values.get(lane.state.lane.id) ?? null);
    }
  }

  for (const lane of lanes) {
    const { state: l } = lane;
    // A known carried value, or a reset to zero units, starts a new window.
    const reset = lane.carryIn === 0n && (lane.reset ?? 0n) !== 0n;
    if (reset) {
      l.window = { start: 0n, assigned: 0n, spent: 0n };
    } else if (l.lastValue !== null) {
      l.window = { start: l.lastValue, assigned: 0n, spent: 0n };
    }
    const cellBase =
      !lane.cell || lane.cell.native === 0
        ? 0n
        : lane.cell.native === null || lane.cell.base === null
          ? null
          : BigInt(lane.cell.base);
    l.window.assigned =
      l.window.assigned === null || cellBase === null
        ? null
        : l.window.assigned + cellBase;
    l.window.spent += lane.spentBase;
    if (lane.value !== null) {
      lane.assignedBase = l.window.assigned;
      lane.reservationFx =
        l.window.assigned === null
          ? null
          : lane.value - l.window.start - l.window.spent - l.window.assigned;
    }
    l.lastValue = lane.value;
    l.leftover = lane.leftover;
    l.carry = lane.cell?.carryover ?? false;
  }

  const X = P - state.pIncl - S;
  state.prev = {
    month,
    R,
    P: R === null ? null : P,
    carriedFrom,
  };
  return {
    state,
    b,
    rate,
    rule,
    valuation,
    carriedFrom,
    R,
    U,
    G,
    E,
    IV,
    vH,
    vU,
    D,
    Q,
    P,
    S,
    X,
    written: inRange(X) ? X : 0n,
    reasons,
    lanes,
  };
}

function detailOf(step: Step): ReservationMonth {
  const { state, reasons } = step;
  const show = (value: bigint | null) => {
    if (value === null) return null;
    if (!inRange(value)) {
      reasons.add('amount-out-of-range');
      return null;
    }
    return Number(value);
  };
  const unknownNative = step.valuation === 'unknown-native';
  const detail: Omit<ReservationMonth, 'incomplete'> = {
    currency: state.currency,
    precision: state.scale,
    valuationDate: step.b,
    rate: step.rate,
    rule: step.rule,
    valuation: step.valuation,
    carriedFrom: step.carriedFrom,
    holdings: show(state.H),
    bookedHoldings: show(state.BH),
    heldAtValuation: show(state.Hb),
    bookedAtValuation: show(state.BHb),
    reserved: show(step.R),
    unreserved: show(step.U),
    holdingsValue: show(state.vh),
    gap: show(step.G),
    excludedFx: show(step.E),
    includedFx: show(state.fIncl),
    includedValue: show(step.IV),
    marketHoldings: show(step.vH),
    marketUnreserved: show(step.vU),
    accountRounding: show(step.D),
    planning: show(step.Q),
    pocketTotal: show(step.P),
    includedReservation: show(state.pIncl),
    exactChange: show(step.X),
    writtenChange: show(step.written),
    spentBase: show(step.S),
    backing: {
      reserved: show(step.R),
      held: show(state.H),
      // Negative holdings never back positive reservations.
      shortage: step.R !== null && step.R > 0n && step.R > state.H,
    },
    lanes: step.lanes
      .filter(
        lane =>
          !lane.state.lane.tombstone ||
          lane.state.cells.size > 0 ||
          lane.state.rows.size > 0,
      )
      .map(lane => ({
        laneId: lane.state.lane.id,
        budgeted: show(lane.assign),
        budgetedBase:
          lane.cell && lane.cell.native !== null ? lane.cell.base : null,
        captureDate: lane.cell?.captureDate ?? null,
        spent: show(lane.spent),
        spentBase: show(lane.spentBase),
        carryIn: show(lane.carryIn),
        reset: show(lane.reset),
        balance: unknownNative ? null : show(lane.leftover),
        balanceBase: show(lane.value),
        valueKind: lane.value === null ? 'unknown' : 'resolved',
        carryover: lane.cell?.carryover ?? false,
        assignedBase: show(lane.assignedBase),
        reservationFx: show(lane.reservationFx),
      })),
    exact: { includedValue: step.IV, includedReservation: state.pIncl },
  };
  return { ...detail, incomplete: [...reasons] };
}

export type ReservationInputs = {
  months: string[];
  today: string;
  basePrecision: number;
  /** Live on-budget accounts in other currencies. */
  accounts: FxWalkAccount[];
  /** Each account's dated top-level rows in date order, future included. */
  rowsOf: (account: string) => FxWalkRow[];
  lanes: ReservationLane[];
  /** Eligible rows of foreign lanes (v_transaction_lanes). */
  laneRows: ReservationLaneRow[];
  cells: ReservationCell[];
  /** MC-8.1's walk over the same accounts and months. */
  fx: FxMonth[];
  rateOn: (currency: string, date: string) => FxRateUsed | null;
};

/**
 * Every created month's reservation contributions, in month order. Pure,
 * so every reader reproduces the written cells from the same snapshot.
 */
export function walkReservations(
  input: ReservationInputs,
): Map<string, ReservationsMonth> {
  const months = [...new Set(input.months)].sort();
  const current = monthUtils.monthFromDate(input.today);
  const fx = new Map(input.fx.map(entry => [entry.month, entry]));
  const currencies = [
    ...new Set([
      ...input.accounts.map(account => account.currency),
      ...input.lanes.map(lane => encodingCurrency(lane.encoding)),
    ]),
  ].sort();
  const states = currencies.map(c => currencyState(c, input));
  const result = new Map<string, ReservationsMonth>();
  if (months.length === 0) return result;
  // Lane history starts at its earliest activity, which can precede the
  // first sheet or fall between sheets; only created months are published.
  const created = new Set(months);
  const earliest = [
    months[0],
    ...input.cells.map(cell => cell.month),
    ...input.laneRows.map(row => monthUtils.monthFromDate(row.date)),
  ].reduce((min, month) => (month < min ? month : min));
  const walked = monthUtils.rangeInclusive(earliest, months[months.length - 1]);
  // Account closes at every walked boundary; inclusion stays with `fx`.
  const closes = new Map(
    walkFxValuation({
      accounts: input.accounts,
      rowsOf: input.rowsOf,
      months: walked,
      today: input.today,
      basePrecision: input.basePrecision,
      rateOn: input.rateOn,
    }).map(entry => [entry.month, entry]),
  );
  for (const month of walked) {
    const steps = states.map(state =>
      stepCurrency(
        state,
        month,
        input,
        fx.get(month),
        closes.get(month),
        current,
      ),
    );
    if (!created.has(month)) {
      // Nothing is included without a sheet: no X is written, and booked
      // spending still moves Pincl, so P's change reaches the next created
      // month through it.
      for (const step of steps) step.state.pIncl += step.S;
      continue;
    }
    // Each contribution is bounded alone; an unrepresentable month sum
    // writes nothing for any currency. Pincl does not absorb an unwritten
    // contribution, so the next month catches it up.
    const sum = steps.reduce((total, step) => total + step.written, 0n);
    const overflow = !inRange(sum);
    for (const step of steps) {
      if (overflow) step.written = 0n;
      if (step.written !== step.X) step.reasons.add('reservation-incomplete');
      step.state.pIncl += step.S + step.written;
    }
    result.set(month, {
      changes: overflow ? 0 : Number(sum),
      incomplete: steps.some(step =>
        step.reasons.has('reservation-incomplete'),
      ),
      currencies: steps.map(detailOf),
      laneValues: steps.flatMap(step =>
        step.lanes.map(lane => ({
          lane: lane.state.lane.id,
          value: lane.value,
        })),
      ),
    });
  }
  return result;
}

/**
 * The foreign lanes, their eligible rows and their cells, read
 * synchronously for the refresh snapshot.
 */
export function readReservationInputs(): Pick<
  ReservationInputs,
  'lanes' | 'laneRows' | 'cells'
> {
  const lanes = db
    .runQuery<{ id: string; encoding: string; tombstone: number | null }>(
      `SELECT id, encoding, tombstone FROM category_pockets
         WHERE kind = 'foreign' AND category IS NOT NULL
           AND encoding IS NOT NULL`,
      [],
      true,
    )
    .map(lane => ({ ...lane, tombstone: lane.tombstone === 1 }));
  const laneRows = db
    .runQuery<{
      lane: string;
      date: number;
      amount: number | null;
      native: number | null;
      stamp: string | null;
    }>(
      `SELECT l.lane AS lane, t.date AS date, t.amount AS amount,
          t.transaction_amount AS native,
          COALESCE(t.pair_encoding, a.encoding) AS stamp
         FROM v_transaction_lanes l
         JOIN category_pockets p ON p.id = l.lane AND p.kind = 'foreign'
         JOIN transactions t ON t.id = l.id
         JOIN accounts a ON a.id = t.acct`,
      [],
      true,
    )
    .map(row => ({
      lane: row.lane,
      date: db.fromDateRepr(row.date),
      amount: row.amount ?? 0,
      native: row.native,
      stamp: row.stamp ?? '',
    }));
  const cells = db
    .runQuery<{
      lane: string;
      month: number;
      carryover: number | null;
      budget_pair: string | null;
      amount: number | null;
      amount_encoding: string | null;
      base_amount: number | null;
      capture_date: string | null;
    }>(
      `SELECT lane, month, carryover, budget_pair, amount, amount_encoding,
          base_amount, capture_date FROM pocket_budgets
         WHERE lane IS NOT NULL AND month IS NOT NULL`,
      [],
      true,
    )
    .map(cell => {
      const month = String(cell.month);
      const absent = cell.budget_pair == null;
      return {
        lane: cell.lane,
        month: `${month.slice(0, 4)}-${month.slice(4)}`,
        // An absent authority (undo of a first write) assigns nothing.
        native: absent ? 0 : cell.amount,
        stamp: absent ? null : cell.amount_encoding,
        base: absent ? 0 : cell.base_amount,
        captureDate: cell.capture_date,
        carryover: cell.carryover === 1,
      };
    });
  return { lanes, laneRows, cells };
}

let latest = new Map<string, ReservationsMonth>();

/** Kept by the refresh pass with the cells it commits. */
export function setReservations(result: Map<string, ReservationsMonth>) {
  latest = result;
}

/** Each currency's reservation for a month, as of the last refresh. */
export function reservationDetails(month: string): ReservationMonth[] {
  return latest.get(month)?.currencies ?? [];
}

/**
 * Finalizes pending assignment equivalents explicitly: with the base the
 * user entered, else at the entry rate on each cell's stored capture date.
 * Native, stamp and capture date stay, so no pocket total changes. Cells
 * without an entry rate stay pending.
 */
export async function finalizePocketAssignments({
  cells,
}: {
  cells: Array<{ id: string; baseAmount?: number }>;
}): Promise<{
  finalized: string[];
  pending: Array<{
    id: string;
    reason: 'rate-unavailable' | 'amount-out-of-range';
  }>;
}> {
  const baseCurrency = await getDefaultCurrencyCode();
  const bp = getRecordedAmountPrecision();
  const { resolveRate } = await import('#server/exchange-rates/app');
  const finalized: string[] = [];
  const pending: Array<{
    id: string;
    reason: 'rate-unavailable' | 'amount-out-of-range';
  }> = [];
  await batchMessages(async () => {
    for (const { id, baseAmount } of cells) {
      const row = await db.first<{
        budget_pair: string | null;
        amount: number | null;
      }>('SELECT budget_pair, amount FROM pocket_budgets WHERE id = ?', [id]);
      const pair = parseBudgetPair(row?.budget_pair);
      if (!row || !pair || row.amount === null || pair.base !== null) {
        throw new Error('assignment-not-pending');
      }
      let base: number;
      if (baseAmount !== undefined) {
        if (!Number.isSafeInteger(baseAmount)) {
          throw new Error('amount-invalid');
        }
        base = baseAmount;
      } else {
        const rate = await resolveRate({
          baseCurrency,
          quoteCurrency: encodingCurrency(pair.encoding),
          date: pair.captureDate,
          forEntry: true,
        });
        if (rate.status !== 'resolved') {
          pending.push({ id, reason: 'rate-unavailable' });
          continue;
        }
        try {
          base = nativeToBase(
            pair.native,
            precisionOf(pair.encoding)!,
            bp,
            rate.rate,
          );
        } catch {
          pending.push({ id, reason: 'amount-out-of-range' });
          continue;
        }
      }
      await db.update('pocket_budgets', {
        id,
        budget_pair: budgetPair({ ...pair, base }),
      });
      finalized.push(id);
    }
  });
  return { finalized, pending };
}
