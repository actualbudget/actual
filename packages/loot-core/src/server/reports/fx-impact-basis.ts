import { pairEncoding } from '#server/sync/coupled-cells';
import { allocateFractions, roundEven } from '#shared/amount-rescale';
import type { ExchangeRateEntity, FxImpactReason } from '#types/models';

export type FxSnapshotAccount = {
  id: string;
  name: string;
  /** Recorded currency; null for an account in the budget currency. */
  currency: string | null;
  precision: number | null;
  /** The effective encoding the account's rows are stamped against. */
  encoding: string;
  offbudget: boolean;
  closed: boolean;
  sortOrder: number;
};

export type FxSnapshotRow = {
  id: string;
  account: string;
  date: string;
  amount: number;
  native: number | null;
  pair: string | null;
  isParent: boolean;
  parentId: string | null;
  transferId: string | null;
};

/** Everything the report reads, captured before its first await. */
export type FxSnapshot = {
  today: string;
  budgetCurrency: string;
  basePrecision: number;
  budgetType: 'envelope' | 'tracking';
  createdMonths: string[];
  cells: Record<string, { value: number; incomplete: boolean }>;
  accounts: FxSnapshotAccount[];
  /** Live rows dated through today. */
  rows: FxSnapshotRow[];
  rates: ExchangeRateEntity[];
};

/**
 * An account's attribution is incomplete from `since`: its basis always,
 * its native position or booked base when flagged.
 */
export type FxFailure = {
  account: string;
  reason: FxImpactReason;
  since: string;
  fromAccountId?: string;
  native?: boolean;
  booked?: boolean;
  /** Fee attribution unavailable: an ambiguous exchange family. */
  fee?: boolean;
};

/**
 * One leg of an event: native in the account's recorded precision (the base
 * for a budget-currency account). Null marks a stored value that is missing,
 * not a safe integer, stale or in an unavailable precision; it is never read
 * as zero.
 */
export type FxLeg = {
  account: string;
  native: bigint | null;
  base: bigint | null;
};

export type FxEvent =
  | { kind: 'flow'; id: string; date: string; leg: FxLeg; fee: boolean }
  | {
      kind: 'transfer' | 'exchange';
      id: string;
      date: string;
      source: FxLeg;
      destination: FxLeg;
      fees: FxLeg[];
      /** Endpoints whose family is ambiguous: their fee is unknown. */
      feeUnknown: string[];
    }
  | { kind: 'base-only'; id: string; date: string; legs: [FxLeg, FxLeg] }
  /**
   * A stored movement no valid event carries: native and booked only. Its
   * id is its rejected pair's canonical id when it has one, else `row`.
   */
  | { kind: 'position'; id: string; date: string; leg: FxLeg; row: string };

export type FxValidation = { failures: FxFailure[] };

export function isForeignAccount(
  account: Pick<FxSnapshotAccount, 'currency'>,
  budgetCurrency: string,
) {
  return account.currency !== null && account.currency !== budgetCurrency;
}

export function validPrecision(precision: number | null): precision is number {
  return Number.isInteger(precision) && precision! >= 0 && precision! <= 15;
}

/** A stored integer, or null when it is missing or not a safe integer. */
const exact = (value: number | null) =>
  value !== null && Number.isSafeInteger(value) ? BigInt(value) : null;

/** Arithmetic on legs of accounts already marked incomplete. */
const known = (value: bigint | null) => value ?? 0n;

const byDateThenId = (a: { date: string; id: string }, b: typeof a) =>
  a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.id < b.id ? -1 : 1;

/** Date, then id; under one id, position moves last, by stored row. */
const eventOrder = (a: FxEvent, b: FxEvent) => {
  if (a.date !== b.date || a.id !== b.id) return byDateThenId(a, b);
  const rank = (event: FxEvent) =>
    event.kind === 'position' ? `1${event.row}` : '0';
  return rank(a) < rank(b) ? -1 : rank(a) > rank(b) ? 1 : 0;
};

/**
 * Validates the whole snapshot before any replay, so completeness never
 * depends on event order or selection, and normalizes rows into events in
 * date then id order.
 */
export function validateFxEvents(snapshot: FxSnapshot): {
  events: FxEvent[];
  validation: FxValidation;
} {
  const { budgetCurrency, basePrecision } = snapshot;
  const accounts = new Map(snapshot.accounts.map(a => [a.id, a]));
  const rows = snapshot.rows.filter(
    row => row.date <= snapshot.today && accounts.has(row.account),
  );
  const byId = new Map(rows.map(row => [row.id, row]));
  const children = new Map<string, FxSnapshotRow[]>();
  for (const row of rows) {
    if (row.parentId) {
      children.set(row.parentId, [...(children.get(row.parentId) ?? []), row]);
    }
  }
  const failures: FxFailure[] = [];
  const fail = (
    account: string,
    reason: FxImpactReason,
    since: string,
    flags: Omit<FxFailure, 'account' | 'reason' | 'since'> = {},
  ) => failures.push({ account, reason, since, ...flags });

  const accountOf = (row: FxSnapshotRow) => accounts.get(row.account)!;
  const foreign = (row: FxSnapshotRow) =>
    isForeignAccount(accountOf(row), budgetCurrency);
  const currencyOf = (row: FxSnapshotRow) =>
    foreign(row) ? accountOf(row).currency! : budgetCurrency;
  const precisionOf = (row: FxSnapshotRow) =>
    foreign(row) ? accountOf(row).precision : basePrecision;
  /** Native units; a budget-currency leg uses its base. */
  const quantity = (row: FxSnapshotRow) =>
    foreign(row) ? row.native : row.amount;
  const staleRow = (row: FxSnapshotRow) => {
    const stamp = pairEncoding(row.pair);
    return stamp !== undefined && stamp !== accountOf(row).encoding;
  };
  const leg = (row: FxSnapshotRow): FxLeg => ({
    account: row.account,
    native:
      foreign(row) &&
      (staleRow(row) || !validPrecision(accountOf(row).precision))
        ? null
        : exact(quantity(row)),
    base: exact(row.amount),
  });
  const counterpartsOf = (family: FxSnapshotRow[]) =>
    family.flatMap(row => {
      const other = row.transferId ? byId.get(row.transferId) : undefined;
      return other && other.account !== row.account ? [other.account] : [];
    });
  const familyOf = (row: FxSnapshotRow) => {
    const parentId = row.parentId ?? (row.isParent ? row.id : null);
    if (parentId === null) return [row];
    const parent = byId.get(parentId);
    return [...(parent ? [parent] : []), ...(children.get(parentId) ?? [])];
  };

  for (const row of rows) {
    const account = accountOf(row);
    const stale = staleRow(row);
    if (stale) {
      fail(row.account, 'stale-encoding', row.date, { native: true });
      for (const other of counterpartsOf(familyOf(row))) {
        fail(other, 'stale-encoding', row.date, {
          fromAccountId: row.account,
        });
      }
    }
    if (!Number.isSafeInteger(row.amount)) {
      fail(row.account, 'amount-out-of-range', row.date, { booked: true });
    }
    if (foreign(row) && !stale) {
      if (row.native === null) {
        fail(row.account, 'native-missing', row.date, { native: true });
      } else if (!Number.isSafeInteger(row.native)) {
        fail(row.account, 'amount-out-of-range', row.date, { native: true });
      }
      if (!validPrecision(account.precision)) {
        fail(row.account, 'precision-unavailable', row.date, { native: true });
      }
    }
    if (row.parentId && !byId.get(row.parentId)?.isParent) {
      fail(row.account, 'family-sum-mismatch', row.date);
    }
  }

  // Links: reciprocal, live, different accounts, same date, opposite bases.
  const linked = new Set<string>();
  for (const row of rows) {
    if (!row.transferId) continue;
    const other = byId.get(row.transferId);
    if (
      other &&
      other.transferId === row.id &&
      other.account !== row.account &&
      other.date === row.date &&
      other.amount === -row.amount
    ) {
      linked.add(row.id);
    } else {
      fail(row.account, 'transfer-link-broken', row.date);
      if (other) fail(other.account, 'transfer-link-broken', row.date);
    }
  }

  // Families. A split holding a transfer to another encoding was written
  // as an exchange (the writer routes on encoding) and must be MC-4's fee
  // family; any other split is ordinary.
  const crossesEncoding = (kid: FxSnapshotRow) => {
    const other = kid.transferId ? byId.get(kid.transferId) : undefined;
    return !!other && accountOf(other).encoding !== accountOf(kid).encoding;
  };
  const feeShape = (kids: FxSnapshotRow[]) =>
    kids.length === 2 && kids.filter(kid => kid.transferId).length === 1;
  const fees = new Map<string, FxSnapshotRow | null>();
  const ambiguous = new Set<string>();
  for (const parent of rows.filter(row => row.isParent)) {
    const kids = children.get(parent.id) ?? [];
    const transfers = kids.filter(kid => kid.transferId);
    // Sums are checked where every integer is valid; invalid integers
    // already carry their own reason.
    const sumMatches = (values: Array<bigint | null>, total: bigint | null) =>
      total === null ||
      values.some(value => value === null) ||
      values.reduce<bigint>((sum, value) => sum + value!, 0n) === total;
    const sums =
      sumMatches(
        kids.map(kid => exact(kid.amount)),
        exact(parent.amount),
      ) &&
      (!foreign(parent) ||
        sumMatches(
          kids.map(kid => exact(kid.native)),
          exact(parent.native),
        ));
    if (transfers.some(crossesEncoding)) {
      const transfer = transfers[0];
      const fee = kids.find(kid => !kid.transferId);
      const other = byId.get(transfer.transferId!);
      const otherFamily = other?.parentId ? children.get(other.parentId) : null;
      const feeNative = fee ? quantity(fee) : null;
      const feeValid =
        fee !== undefined &&
        feeNative !== null &&
        ((feeNative < 0 && fee.amount <= 0) ||
          (feeNative === 0 && fee.amount === 0));
      if (feeShape(kids) && feeValid && sums && !feeShape(otherFamily ?? [])) {
        fees.set(transfer.id, feeNative === 0 ? null : fee!);
      } else {
        fail(parent.account, 'exchange-family-ambiguous', parent.date, {
          fee: true,
        });
        for (const kid of transfers) ambiguous.add(kid.id);
        for (const other of counterpartsOf(transfers)) {
          fail(other, 'exchange-family-ambiguous', parent.date);
        }
      }
    } else if (!sums) {
      fail(parent.account, 'family-sum-mismatch', parent.date);
      for (const other of counterpartsOf(transfers)) {
        fail(other, 'family-sum-mismatch', parent.date, {
          fromAccountId: parent.account,
        });
      }
    }
  }

  const events: FxEvent[] = [];
  // What the events carry for each top-level row, to find stored movements
  // that no valid event carries.
  const covered = new Map<string, { native: bigint; base: bigint }>();
  const cover = (row: FxSnapshotRow, value: FxLeg) => {
    const top = row.parentId ?? row.id;
    const sum = covered.get(top) ?? { native: 0n, base: 0n };
    covered.set(top, {
      native: sum.native + known(value.native),
      base: sum.base + known(value.base),
    });
    return value;
  };
  const coveredLeg = (row: FxSnapshotRow) => cover(row, leg(row));
  /**
   * A stored transfer leg no valid event carries moves its position alone:
   * at its pair's canonical id when rejected, at its own id when unlinked.
   */
  const moveAlone = (id: string, row: FxSnapshotRow) => {
    if (!foreign(row)) return;
    const value = coveredLeg(row);
    if (known(value.native) === 0n && known(value.base) === 0n) return;
    events.push({
      kind: 'position',
      id,
      date: row.date,
      leg: value,
      row: row.id,
    });
  };
  const flow = (
    row: FxSnapshotRow,
    rows: FxSnapshotRow[],
    native: bigint | null,
    base: bigint | null,
  ) => {
    if (native === null || (native === 0n && base === 0n)) return;
    if (
      native !== 0n &&
      base !== null &&
      base !== 0n &&
      native < 0n !== base < 0n
    ) {
      fail(row.account, 'sign-mismatch', row.date);
    }
    for (const part of rows) cover(part, leg(part));
    events.push({
      kind: 'flow',
      id: row.id,
      date: row.date,
      leg: { account: row.account, native, base },
      fee: false,
    });
  };
  const seen = new Set<string>();
  const transfer = (row: FxSnapshotRow) => {
    if (!linked.has(row.id)) {
      moveAlone(row.id, row);
      return;
    }
    const other = byId.get(row.transferId!)!;
    const id = row.id < other.id ? row.id : other.id;
    if (seen.has(id)) return;
    seen.add(id);
    if (!foreign(row) && !foreign(other)) return;
    const feeRows = [fees.get(row.id), fees.get(other.id)].flatMap(fee =>
      fee ? [fee] : [],
    );
    const [q1, q2] = [leg(row).native, leg(other).native];
    const sameCurrency = currencyOf(row) === currencyOf(other);
    if (q1 === 0n && q2 === 0n && feeRows.length === 0) {
      // A zero/zero pair moves nothing; a base-only same-currency pair
      // moves no units but books carry.
      if (row.amount === 0) return;
      if (sameCurrency) {
        events.push({
          kind: 'base-only',
          id,
          date: row.date,
          legs: [coveredLeg(row), coveredLeg(other)],
        });
        return;
      }
    }
    // A rejected pair has no event; its stored legs still move positions.
    let [source, destination] =
      row.amount <= other.amount ? [row, other] : [other, row];
    if (q1 !== null && q2 !== null) {
      [source, destination] = q1 < 0n ? [row, other] : [other, row];
      const [qs, qd] = [leg(source).native!, leg(destination).native!];
      if (
        !(qs < 0n && source.amount <= 0 && qd > 0n && destination.amount >= 0)
      ) {
        fail(row.account, 'transfer-direction-invalid', row.date);
        fail(other.account, 'transfer-direction-invalid', row.date);
        moveAlone(id, row);
        moveAlone(id, other);
        return;
      }
      const [ps, pd] = [precisionOf(source)!, precisionOf(destination)!];
      if (sameCurrency) {
        const scale = Math.max(ps, pd);
        if (
          -qs * 10n ** BigInt(scale - ps) !==
          qd * 10n ** BigInt(scale - pd)
        ) {
          fail(row.account, 'transfer-quantity-mismatch', row.date);
          fail(other.account, 'transfer-quantity-mismatch', row.date);
          moveAlone(id, row);
          moveAlone(id, other);
          return;
        }
      }
    }
    events.push({
      kind: sameCurrency ? 'transfer' : 'exchange',
      id,
      date: row.date,
      source: coveredLeg(source),
      destination: coveredLeg(destination),
      fees: feeRows.map(coveredLeg),
      feeUnknown: [row, other]
        .filter(part => ambiguous.has(part.id))
        .map(part => part.account),
    });
  };

  for (const row of rows) {
    if (row.parentId) continue;
    if (row.isParent) {
      const kids = children.get(row.id) ?? [];
      for (const kid of kids.filter(kid => kid.transferId)) transfer(kid);
      // An exchange family's fee is applied inside its exchange.
      const ordinary = kids.filter(kid => !kid.transferId);
      if (foreign(row) && !kids.some(crossesEncoding) && ordinary.length > 0) {
        // Exact: offsetting transfer children can leave a net beyond Number.
        const total = (values: Array<bigint | null>) =>
          values.some(value => value === null)
            ? null
            : values.reduce<bigint>((sum, value) => sum + value!, 0n);
        flow(
          row,
          ordinary,
          total(ordinary.map(kid => leg(kid).native)),
          total(ordinary.map(kid => leg(kid).base)),
        );
      }
    } else if (row.transferId) {
      transfer(row);
    } else if (foreign(row)) {
      flow(row, [row], leg(row).native, leg(row).base);
    }
  }
  // Every stored top-level movement reaches its account's position once:
  // what neither events nor the transfer legs moved alone carry (an
  // invalid family's remaining discrepancy) moves native and booked only.
  for (const row of rows) {
    if (row.parentId || !foreign(row)) continue;
    const stored = leg(row);
    const carried = covered.get(row.id) ?? { native: 0n, base: 0n };
    const native = stored.native === null ? 0n : stored.native - carried.native;
    const base = stored.base === null ? 0n : stored.base - carried.base;
    if (native !== 0n || base !== 0n) {
      events.push({
        kind: 'position',
        id: row.id,
        date: row.date,
        leg: { account: row.account, native, base },
        row: row.id,
      });
    }
  }
  events.sort(eventOrder);
  return { events, validation: { failures } };
}

export type FxAccountState = {
  native: bigint;
  acquisition: bigint;
  borrowing: bigint;
  booked: bigint;
  realized: bigint;
  feeRealized: bigint;
  feeExpense: bigint;
  carry: bigint;
  settlement: bigint;
};

/** An account's basis stocks at one close; null fields are unknown. */
export type FxClose = {
  native: bigint | null;
  booked: bigint | null;
  basis: bigint | null;
  realized: bigint | null;
  feeRealized: bigint | null;
  carry: bigint | null;
  settlement: bigint | null;
  feeExpense: bigint | null;
};

export type FxExchangeRecord = {
  id: string;
  date: string;
  source: FxLeg;
  destination: FxLeg;
  fees: FxLeg[];
  feeUnknown: string[];
  /** Principal and fee realization per foreign endpoint; null when unknown. */
  realized: Map<string, bigint | null>;
  feeRealized: Map<string, bigint | null>;
};

export type FxReplay = {
  /** Per account, one close per requested close date. */
  closes: Map<string, FxClose[]>;
  failures: FxFailure[];
  exchanges: FxExchangeRecord[];
};

function shares(
  total: bigint,
  parts: Array<{ id: string; size: bigint }>,
): Map<string, bigint> {
  const size = parts.reduce((sum, part) => sum + part.size, 0n);
  if (parts.length === 0 || size === 0n) return new Map();
  return new Map(
    allocateFractions(
      parts.map(part => ({ id: part.id, numerator: total * part.size })),
      size,
    ).map(part => [part.id, BigInt(part.amount)]),
  );
}

/** Moves a position by a stored leg without attributing any basis. */
function move(state: FxAccountState, leg: FxLeg) {
  state.native += known(leg.native);
  state.booked += known(leg.base);
}

/** Applies a flow of native q booked at b; returns the realized FX. */
function applyFlow(state: FxAccountState, q: bigint, b: bigint): bigint {
  let realized = 0n;
  if (q === 0n) {
    // Moves no units (MC-7 Convert): the booked base is realized.
    realized = -b;
  } else if (q > 0n) {
    if (state.native >= 0n) {
      state.acquisition += b;
    } else {
      const debt = -state.native;
      if (q <= debt) {
        const removed =
          q === debt ? state.borrowing : roundEven(state.borrowing * q, debt);
        state.borrowing -= removed;
        realized = removed - b;
      } else {
        const split = shares(b, [
          { id: 'close', size: debt },
          { id: 'open', size: q - debt },
        ]);
        realized = state.borrowing - split.get('close')!;
        state.borrowing = 0n;
        state.acquisition = split.get('open')!;
      }
    }
  } else {
    const out = -q;
    const proceeds = -b;
    if (state.native <= 0n) {
      state.borrowing += proceeds;
    } else {
      const held = state.native;
      if (out <= held) {
        const removed =
          out === held
            ? state.acquisition
            : roundEven(state.acquisition * out, held);
        state.acquisition -= removed;
        realized = proceeds - removed;
      } else {
        const split = shares(proceeds, [
          { id: 'close', size: held },
          { id: 'open', size: out - held },
        ]);
        realized = split.get('close')! - state.acquisition;
        state.acquisition = 0n;
        state.borrowing = split.get('open')!;
      }
    }
  }
  state.native += q;
  state.booked += b;
  state.realized += realized;
  return realized;
}

/**
 * A same-currency transfer in the finer of the two precisions: up to three
 * segments by where the source's holdings and the destination's borrowing
 * end. Each position then changes once by its whole stored leg.
 */
function applyTransfer(
  source: FxAccountState,
  destination: FxAccountState,
  sourceLeg: FxLeg,
  destinationLeg: FxLeg,
  sourcePrecision: number,
  destinationPrecision: number,
) {
  const scale = Math.max(sourcePrecision, destinationPrecision);
  const sourceFactor = 10n ** BigInt(scale - sourcePrecision);
  const destinationFactor = 10n ** BigInt(scale - destinationPrecision);
  const quantity = -known(sourceLeg.native) * sourceFactor;
  const held = source.native > 0n ? source.native * sourceFactor : 0n;
  const debt =
    destination.native < 0n ? -destination.native * destinationFactor : 0n;
  const fromHoldings = held < quantity ? held : quantity;
  const repaying = debt < quantity ? debt : quantity;
  const cuts = [...new Set([0n, fromHoldings, repaying, quantity])].sort(
    (a, b) => (a < b ? -1 : a > b ? 1 : 0),
  );
  const segments = cuts.slice(1).map((end, i) => ({
    id: `s${i + 1}`,
    size: end - cuts[i],
    holdings: end <= fromHoldings,
    repayment: end <= repaying,
  }));
  const value = shares(known(destinationLeg.base), segments);
  const acquisition = shares(
    fromHoldings === 0n
      ? 0n
      : fromHoldings === held
        ? source.acquisition
        : roundEven(source.acquisition * fromHoldings, held),
    segments.filter(segment => segment.holdings),
  );
  const borrowing = shares(
    repaying === 0n
      ? 0n
      : repaying === debt
        ? destination.borrowing
        : roundEven(destination.borrowing * repaying, debt),
    segments.filter(segment => segment.repayment),
  );
  for (const segment of segments) {
    const v = value.get(segment.id)!;
    const ka = acquisition.get(segment.id) ?? 0n;
    const kq = borrowing.get(segment.id) ?? 0n;
    if (segment.holdings && !segment.repayment) {
      source.acquisition -= ka;
      destination.acquisition += ka;
      source.carry += v - ka;
      destination.carry += ka - v;
    } else if (!segment.holdings && !segment.repayment) {
      source.borrowing += v;
      destination.acquisition += v;
    } else if (!segment.holdings) {
      // The destination's debt basis is carried to the source.
      source.borrowing += kq;
      destination.borrowing -= kq;
      source.carry += v - kq;
      destination.carry += kq - v;
    } else {
      source.acquisition -= ka;
      destination.borrowing -= kq;
      source.settlement += v - ka;
      destination.settlement += kq - v;
    }
  }
  move(source, sourceLeg);
  move(destination, destinationLeg);
  return {
    usesSourceBasis: segments.some(s => s.holdings && !s.repayment),
    usesDestinationBasis: segments.some(s => !s.holdings && s.repayment),
  };
}

/**
 * Replays validated events with moving weighted average basis, capturing
 * each account's stocks at the given close dates (ascending). Failures are
 * effective from the start of their date; unknown basis propagates through
 * same-currency transfers along the segment that depends on it.
 */
export function replayFxBasis(
  events: FxEvent[],
  validation: FxValidation,
  snapshot: FxSnapshot,
  {
    closes,
    afterEvent,
  }: {
    closes: string[];
    afterEvent?: (
      event: FxEvent,
      states: Map<string, FxAccountState>,
      isKnown: (account: string) => boolean,
    ) => void;
  },
): FxReplay {
  const accounts = new Map(snapshot.accounts.map(a => [a.id, a]));
  const foreign = (id: string) =>
    isForeignAccount(accounts.get(id)!, snapshot.budgetCurrency);
  const failures = [...validation.failures];
  const since = {
    basis: new Map<string, string>(),
    native: new Map<string, string>(),
    booked: new Map<string, string>(),
    fee: new Map<string, string>(),
  };
  const mark = (map: Map<string, string>, account: string, date: string) => {
    const current = map.get(account);
    if (current === undefined || date < current) map.set(account, date);
  };
  for (const failure of failures) {
    mark(since.basis, failure.account, failure.since);
    if (failure.native) mark(since.native, failure.account, failure.since);
    if (failure.booked) mark(since.booked, failure.account, failure.since);
    if (failure.fee) mark(since.fee, failure.account, failure.since);
  }
  const knownAt = (map: Map<string, string>, account: string, date: string) => {
    const from = map.get(account);
    return from === undefined || from > date;
  };
  const propagate = (to: string, from: string, date: string) => {
    if (!knownAt(since.basis, to, date)) return;
    const origin = failures
      .filter(failure => failure.account === from && failure.since <= date)
      .sort((a, b) => (a.since < b.since ? -1 : a.since > b.since ? 1 : 0))[0];
    failures.push({
      account: to,
      reason: origin?.reason ?? 'amount-out-of-range',
      since: date,
      fromAccountId: from,
    });
    mark(since.basis, to, date);
  };

  const states = new Map<string, FxAccountState>(
    snapshot.accounts.map(account => [
      account.id,
      {
        native: 0n,
        acquisition: 0n,
        borrowing: 0n,
        booked: 0n,
        realized: 0n,
        feeRealized: 0n,
        feeExpense: 0n,
        carry: 0n,
        settlement: 0n,
      },
    ]),
  );
  // Positions and booked base come from top-level rows, as MC-8.1 reads
  // them, independently of how their families normalize into events.
  const topLevel = new Map<string, FxSnapshotRow[]>();
  for (const row of snapshot.rows) {
    if (
      row.parentId ||
      row.date > snapshot.today ||
      !accounts.has(row.account)
    ) {
      continue;
    }
    topLevel.set(row.account, [...(topLevel.get(row.account) ?? []), row]);
  }
  const totals = new Map(
    snapshot.accounts.map(account => [
      account.id,
      {
        rows: (topLevel.get(account.id) ?? []).sort(byDateThenId),
        cursor: 0,
        native: 0n,
        booked: 0n,
      },
    ]),
  );

  const output = new Map<string, FxClose[]>(
    snapshot.accounts.map(account => [account.id, []]),
  );
  const capture = (date: string) => {
    for (const account of snapshot.accounts) {
      const total = totals.get(account.id)!;
      while (
        total.cursor < total.rows.length &&
        total.rows[total.cursor].date <= date
      ) {
        const row = total.rows[total.cursor++];
        total.native += known(exact(row.native));
        total.booked += known(exact(row.amount));
      }
      const state = states.get(account.id)!;
      const basis = knownAt(since.basis, account.id, date);
      const booked = knownAt(since.booked, account.id, date);
      // Fee expense sums fee rows only, so its own integers decide it.
      const fees = knownAt(since.fee, account.id, date);
      output.get(account.id)!.push({
        native: knownAt(since.native, account.id, date) ? total.native : null,
        booked: booked ? total.booked : null,
        basis: basis ? state.acquisition - state.borrowing : null,
        realized: basis ? state.realized : null,
        feeRealized: basis ? state.feeRealized : null,
        carry: basis ? state.carry : null,
        settlement: basis ? state.settlement : null,
        feeExpense: fees ? state.feeExpense : null,
      });
    }
  };

  const exchanges: FxExchangeRecord[] = [];
  const precisionOf = (id: string) => accounts.get(id)!.precision!;
  const RANGE = 'Rescaled amount exceeds the safe integer range';
  /**
   * Runs basis arithmetic for the given legs. If the shared allocator cannot
   * represent a total, their basis is unknown from this date, and each leg
   * still moves its position once (the allocator throws before mutating).
   */
  const attributed = <T>(legs: FxLeg[], date: string, run: () => T) => {
    try {
      return run();
    } catch (error) {
      if (!(error instanceof Error) || error.message !== RANGE) throw error;
      for (const leg of legs) {
        failures.push({
          account: leg.account,
          reason: 'amount-out-of-range',
          since: date,
        });
        mark(since.basis, leg.account, date);
        move(states.get(leg.account)!, leg);
      }
      return null;
    }
  };
  const flowOn = (leg: FxLeg, date: string) => {
    const state = states.get(leg.account)!;
    const basisKnown = knownAt(since.basis, leg.account, date);
    const realized = attributed([leg], date, () =>
      applyFlow(state, known(leg.native), known(leg.base)),
    );
    return basisKnown && knownAt(since.basis, leg.account, date)
      ? realized
      : null;
  };
  const applyFee = (fee: FxLeg, date: string) => {
    const state = states.get(fee.account)!;
    if (fee.base === null) mark(since.fee, fee.account, date);
    state.feeExpense += known(fee.base);
    if (!foreign(fee.account)) return null;
    const realized = flowOn(fee, date);
    state.feeRealized += realized ?? 0n;
    return realized;
  };
  const apply = (event: FxEvent, report: (event: FxEvent) => void) => {
    if (event.kind === 'flow') {
      flowOn(event.leg, event.date);
    } else if (event.kind === 'position') {
      move(states.get(event.leg.account)!, event.leg);
    } else if (event.kind === 'base-only') {
      for (const leg of event.legs) {
        const state = states.get(leg.account)!;
        state.booked += known(leg.base);
        state.carry -= known(leg.base);
      }
    } else if (event.kind === 'exchange') {
      const record: FxExchangeRecord = {
        id: event.id,
        date: event.date,
        source: event.source,
        destination: event.destination,
        fees: event.fees,
        feeUnknown: event.feeUnknown,
        realized: new Map(),
        feeRealized: new Map(),
      };
      for (const leg of [event.source, event.destination]) {
        if (!foreign(leg.account)) {
          move(states.get(leg.account)!, leg);
          continue;
        }
        const realized = flowOn(leg, event.date);
        record.realized.set(leg.account, realized);
        record.feeRealized.set(leg.account, realized === null ? null : 0n);
      }
      for (const fee of event.fees) {
        const realized = applyFee(fee, event.date);
        if (foreign(fee.account)) record.feeRealized.set(fee.account, realized);
      }
      exchanges.push(record);
    } else {
      const { source, destination, date } = event;
      const [sourceState, destinationState] = [
        states.get(source.account)!,
        states.get(destination.account)!,
      ];
      const nativeKnown = [source, destination].map(leg =>
        knownAt(since.native, leg.account, date),
      );
      if (!nativeKnown[0] || !nativeKnown[1]) {
        // Segments need both positions: neither basis can be attributed.
        if (!nativeKnown[0]) {
          propagate(destination.account, source.account, date);
        }
        if (!nativeKnown[1]) {
          propagate(source.account, destination.account, date);
        }
        move(sourceState, source);
        move(destinationState, destination);
      } else {
        const basisKnown = [source, destination].map(leg =>
          knownAt(since.basis, leg.account, date),
        );
        const uses = attributed([source, destination], date, () =>
          applyTransfer(
            sourceState,
            destinationState,
            source,
            destination,
            precisionOf(source.account),
            precisionOf(destination.account),
          ),
        );
        if (uses?.usesSourceBasis && !basisKnown[0]) {
          propagate(destination.account, source.account, date);
        }
        if (uses?.usesDestinationBasis && !basisKnown[1]) {
          propagate(source.account, destination.account, date);
        }
      }
      // The principal is reported alone; each fee is its own outflow.
      report({ ...event, fees: [] });
      for (const fee of event.fees) {
        applyFee(fee, date);
        report({ kind: 'flow', id: event.id, date, leg: fee, fee: true });
      }
      return;
    }
    report(event);
  };

  let next = 0;
  for (const event of events) {
    if (next >= closes.length) break;
    while (next < closes.length && closes[next] < event.date) {
      capture(closes[next++]);
    }
    if (next >= closes.length) break;
    const report = (part: FxEvent) =>
      afterEvent?.(
        part,
        new Map([...states].filter(([id]) => foreign(id))),
        account => knownAt(since.basis, account, event.date),
      );
    apply(event, report);
  }
  while (next < closes.length) capture(closes[next++]);
  return { closes: output, failures, exchanges };
}
