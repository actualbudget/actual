import { rateUsed, walkFxValuation } from '#server/budget/fx-valuation';
import * as db from '#server/db';
import { selectRate } from '#server/exchange-rates/app';
import * as sheet from '#server/sheet';
import { pairEncoding } from '#server/sync/coupled-cells';
import { getRecordedAmountPrecision } from '#server/util/currency';
import { nativeToBase } from '#shared/exchange-rate';
import * as monthUtils from '#shared/months';
import { MAX_SAFE_NUMBER } from '#shared/util';
import type {
  ExchangeRateEntity,
  FxAccountMonth,
  FxBridgeMonth,
  FxChanges,
  FxExchange,
  FxExchangeEnd,
  FxImpactAccountReason,
  FxImpactMonth,
  FxImpactReason,
  FxImpactRequest,
  FxImpactResult,
  FxRateUsed,
  FxStocks,
  FxTotal,
} from '#types/models';

import {
  isForeignAccount,
  replayFxBasis,
  validateFxEvents,
  validPrecision,
} from './fx-impact-basis';
import type {
  FxClose,
  FxExchangeRecord,
  FxLeg,
  FxSnapshot,
  FxSnapshotAccount,
} from './fx-impact-basis';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_MONTHS = 120;

/** A wire amount: a safe integer within MAX_SAFE_NUMBER, else unknown. */
function bounded(value: bigint | null): number | null {
  if (value === null) return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && Math.abs(amount) <= MAX_SAFE_NUMBER
    ? amount
    : null;
}

/** The last day of a past month, today for the current month. */
function closeOf(month: string, today: string) {
  return month === monthUtils.monthFromDate(today)
    ? today
    : monthUtils.getMonthEnd(`${month}-01`);
}

function validateRequest(request: FxImpactRequest) {
  // Requests cross the worker boundary, so shapes are checked at runtime.
  const ids = (value: FxImpactRequest['accountIds']) =>
    value === null ||
    (Array.isArray(value) && value.every(id => typeof id === 'string'));
  if (
    !request ||
    typeof request.startMonth !== 'string' ||
    typeof request.endMonth !== 'string' ||
    !MONTH.test(request.startMonth) ||
    !MONTH.test(request.endMonth) ||
    request.endMonth < request.startMonth ||
    monthUtils.rangeInclusive(request.startMonth, request.endMonth).length >
      MAX_MONTHS ||
    !ids(request.accountIds) ||
    !ids(request.currencies)
  ) {
    throw new Error('fx-impact-request-invalid');
  }
}

/**
 * Reads everything the report needs synchronously, so a sync, undo or
 * local edit cannot produce a mixed result. Never fetches rates.
 */
export function readFxSnapshot(today: string): FxSnapshot {
  const budgetCurrency =
    db.firstSync<{ value: string }>(
      "SELECT value FROM preferences WHERE id = 'defaultCurrencyCode'",
    )?.value ?? '';
  const accounts = db
    .runQuery<{
      id: string;
      name: string;
      currency: string | null;
      currency_precision: number | null;
      encoding: string | null;
      offbudget: number;
      closed: number;
      sort_order: number;
    }>(
      `SELECT id, name, currency, currency_precision, encoding, offbudget,
         closed, sort_order
       FROM accounts WHERE tombstone = 0 ORDER BY sort_order, name`,
      [],
      true,
    )
    .map((account): FxSnapshotAccount => ({
      id: account.id,
      name: account.name,
      currency: account.currency,
      precision: account.currency_precision,
      encoding: effectiveEncodingOf(account),
      offbudget: account.offbudget === 1,
      closed: account.closed === 1,
      sortOrder: account.sort_order,
    }));
  // Rows of accounts in other currencies, the transfer counterparts that
  // link to or from them, and those counterparts' families.
  const rows = db.runQuery<{
    id: string;
    acct: string;
    date: number;
    amount: number;
    transaction_amount: number | null;
    amount_pair: string | null;
    isParent: number;
    isChild: number;
    parent_id: string | null;
    transferred_id: string | null;
  }>(
    `WITH f AS (
       SELECT id, transferred_id FROM transactions
       WHERE tombstone = 0 AND acct IN (
         SELECT id FROM accounts WHERE tombstone = 0
           AND currency IS NOT NULL AND currency != ?)
     ), c AS (
       SELECT id, parent_id FROM transactions
       WHERE tombstone = 0 AND (id IN (SELECT transferred_id FROM f)
         OR transferred_id IN (SELECT id FROM f))
     )
     SELECT id, acct, date, amount, transaction_amount, amount_pair, isParent,
       isChild, parent_id, transferred_id
     FROM transactions
     WHERE tombstone = 0 AND date IS NOT NULL AND date <= ? AND (
       id IN (SELECT id FROM f) OR id IN (SELECT id FROM c)
       OR id IN (SELECT parent_id FROM c)
       OR parent_id IN (SELECT parent_id FROM c))`,
    [budgetCurrency, db.toDateRepr(today)],
    true,
  );
  const rates = db.runQuery<ExchangeRateEntity>(
    'SELECT * FROM exchange_rates WHERE base_currency = ? AND tombstone = 0',
    [budgetCurrency],
    true,
  );
  const spreadsheet = sheet.get();
  const meta = spreadsheet?.meta();
  const createdMonths = [
    ...((meta?.createdMonths as Set<string> | undefined) ?? []),
  ].sort();
  const cells: FxSnapshot['cells'] = {};
  for (const month of createdMonths) {
    const name = monthUtils.sheetForMonth(month);
    const value = spreadsheet?.getCellValue(name, 'fx-changes');
    cells[month] = {
      value: typeof value === 'number' ? value : 0,
      incomplete: spreadsheet?.getCellValue(name, 'fx-incomplete') === true,
    };
  }
  return {
    today,
    budgetCurrency,
    basePrecision: getRecordedAmountPrecision(),
    budgetType: meta?.budgetType === 'tracking' ? 'tracking' : 'envelope',
    createdMonths,
    cells,
    accounts,
    rows: rows.map(row => ({
      id: row.id,
      account: row.acct,
      date: db.fromDateRepr(row.date),
      amount: row.amount,
      native: row.transaction_amount,
      pair: row.amount_pair,
      isParent: row.isParent === 1,
      parentId: row.isChild ? row.parent_id : null,
      transferId: row.transferred_id,
    })),
    rates,
  };
}

/** As foreign-guard reads it: a well formed encoding cell, else the columns. */
function effectiveEncodingOf(account: {
  encoding: string | null;
  currency: string | null;
  currency_precision: number | null;
}) {
  const valid =
    account.encoding === '' ||
    (account.encoding !== null &&
      /^[A-Z]{3}\.(\d{1,2})$/.test(account.encoding) &&
      Number(account.encoding.split('.')[1]) <= 15);
  if (valid) return account.encoding!;
  return account.currency === null
    ? ''
    : `${account.currency}.${account.currency_precision}`;
}

type AccountMonth = {
  row: FxAccountMonth;
  present: boolean;
};

function emptyTotal(): FxTotal {
  const stocks = (): FxStocks => ({
    booked: 0,
    basis: 0,
    value: 0,
    unrealized: 0,
  });
  return {
    flows: 0,
    realized: 0,
    feeRealized: 0,
    feeExpense: 0,
    unrealized: 0,
    carry: 0,
    settlement: 0,
    gap: 0,
    opening: stocks(),
    closing: stocks(),
    incompleteAccountIds: [],
  };
}

const CHANGE_FIELDS = [
  'flows',
  'realized',
  'feeRealized',
  'feeExpense',
  'unrealized',
  'carry',
  'settlement',
  'gap',
] as const;
const STOCK_FIELDS = ['booked', 'basis', 'value', 'unrealized'] as const;

/** Sums account integers per field; a null input makes that field null. */
function totalOf(rows: FxAccountMonth[]): FxTotal {
  const total = emptyTotal();
  const incomplete = new Set<string>();
  // Exact sums, bounded once, so the order of accounts never matters.
  const sum = (values: Array<[string, number | null]>) => {
    let exact: bigint | null = 0n;
    for (const [id, value] of values) {
      if (value === null) incomplete.add(id);
      exact = exact === null || value === null ? null : exact + BigInt(value);
    }
    return bounded(exact);
  };
  for (const field of CHANGE_FIELDS) {
    total[field] = sum(rows.map(row => [row.accountId, row[field]]));
  }
  for (const side of ['opening', 'closing'] as const) {
    for (const field of STOCK_FIELDS) {
      total[side][field] = sum(
        rows.map(row => [row.accountId, row[side][field]]),
      );
    }
  }
  total.incompleteAccountIds = [...incomplete];
  return total;
}

/**
 * The FX impact of the requested months: per selected account, currency
 * and in total, whole-exchange diagnostics, and the bridge MC-8.1 posts to
 * To Budget. A pure function of the snapshot.
 */
export function calculateFxImpact(
  snapshot: FxSnapshot,
  request: FxImpactRequest,
): FxImpactResult {
  validateRequest(request);
  const { today, budgetCurrency, basePrecision: bp } = snapshot;
  const current = monthUtils.monthFromDate(today);
  const endMonth = request.endMonth < current ? request.endMonth : current;
  const months =
    request.startMonth > current
      ? []
      : monthUtils.rangeInclusive(request.startMonth, endMonth);
  const accounts = new Map(snapshot.accounts.map(a => [a.id, a]));
  const foreign = (account: FxSnapshotAccount) =>
    isForeignAccount(account, budgetCurrency);
  const currencyOf = (account: FxSnapshotAccount) =>
    foreign(account) ? account.currency! : budgetCurrency;

  const unknownAccountIds = (request.accountIds ?? []).filter(
    id => !accounts.has(id),
  );
  const selectedIds = new Set(request.accountIds ?? accounts.keys());
  const currencies = request.currencies ? new Set(request.currencies) : null;
  const selected = (id: string) => {
    const account = accounts.get(id);
    return (
      account !== undefined &&
      selectedIds.has(id) &&
      (currencies === null || currencies.has(currencyOf(account)))
    );
  };

  const rates = new Map<string, FxRateUsed | null>();
  const rateOn = (currency: string, date: string) => {
    const key = `${currency}|${date}`;
    if (!rates.has(key)) {
      rates.set(
        key,
        rateUsed(
          selectRate(snapshot.rates, {
            baseCurrency: budgetCurrency,
            quoteCurrency: currency,
            date,
          }),
        ),
      );
    }
    return rates.get(key)!;
  };
  /** Native valued at a date exactly as MC-8.1 values an account. */
  type Valued = {
    value: bigint | null;
    rate: FxRateUsed | null;
    reason: 'rate-unavailable' | 'amount-out-of-range' | null;
  };
  const valueOf = (
    account: FxSnapshotAccount,
    native: bigint,
    date: string,
  ): Valued => {
    if (native === 0n) return { value: 0n, rate: null, reason: null };
    // Its account already reports precision-unavailable.
    if (!validPrecision(account.precision)) {
      return { value: null, rate: null, reason: null };
    }
    const rate = rateOn(account.currency!, date);
    if (!rate) {
      return { value: null, rate, reason: 'rate-unavailable' };
    }
    try {
      const value = BigInt(
        nativeToBase(Number(native), account.precision!, bp, rate.rate),
      );
      return bounded(value) === null
        ? { value: null, rate, reason: 'amount-out-of-range' }
        : { value, rate, reason: null };
    } catch (error) {
      if (
        !(error instanceof Error) ||
        error.message !== 'amount-out-of-range'
      ) {
        throw error;
      }
      return { value: null, rate, reason: 'amount-out-of-range' };
    }
  };

  const closes = months.length
    ? [
        closeOf(monthUtils.prevMonth(months[0]), today),
        ...months.map(month => closeOf(month, today)),
      ]
    : [];
  const { events, validation } = validateFxEvents(snapshot);
  const replay = replayFxBasis(events, validation, snapshot, { closes });
  // Valid exchange amounts beyond the wire range are reported unknown, and
  // their accounts carry the reason for that month. Invalid inputs already
  // carry their own reasons.
  const beyondWire = (value: bigint | null) =>
    value !== null && bounded(value) === null;
  const exchangeOverflow = new Map<string, string[]>();
  for (const record of replay.exchanges) {
    const flagged = new Set<string>();
    for (const leg of [record.source, record.destination, ...record.fees]) {
      if (beyondWire(leg.native) || beyondWire(leg.base)) {
        flagged.add(leg.account);
      }
    }
    if (beyondWire(record.destination.base)) {
      flagged.add(record.source.account).add(record.destination.account);
    }
    for (const account of flagged) {
      exchangeOverflow.set(account, [
        ...(exchangeOverflow.get(account) ?? []),
        record.date,
      ]);
    }
  }

  type Stocks = FxStocks & {
    native: number | null;
    rate: FxRateUsed | null;
    gap: bigint | null;
    reason: 'rate-unavailable' | 'amount-out-of-range' | null;
  };
  const stocksOf = (
    account: FxSnapshotAccount,
    close: FxClose,
    date: string,
  ): Stocks => {
    let reason: Stocks['reason'] = null;
    const keep = (value: bigint | null) => {
      const amount = bounded(value);
      if (value !== null && amount === null) reason = 'amount-out-of-range';
      return amount;
    };
    const native = keep(close.native);
    const valued =
      close.native === null || native === null
        ? { value: null, rate: null, reason: null }
        : valueOf(account, close.native, date);
    reason ??= valued.reason;
    const booked = keep(close.booked);
    const basis = keep(close.basis);
    return {
      native,
      rate: valued.rate,
      booked,
      basis,
      value: valued.value === null ? null : bounded(valued.value),
      unrealized:
        valued.value === null || close.basis === null
          ? null
          : keep(valued.value - close.basis),
      gap:
        valued.value === null || close.booked === null
          ? null
          : valued.value - close.booked,
      reason,
    };
  };

  const failuresOf = new Map<string, typeof replay.failures>();
  for (const failure of replay.failures) {
    failuresOf.set(failure.account, [
      ...(failuresOf.get(failure.account) ?? []),
      failure,
    ]);
  }
  /** One entry per reason and origin, at its earliest date on or before `through`. */
  const reasonsOf = (accountId: string, through: string) => {
    const reasons: FxImpactAccountReason[] = [];
    for (const failure of (failuresOf.get(accountId) ?? [])
      .filter(failure => failure.since <= through)
      .sort((a, b) => (a.since < b.since ? -1 : a.since > b.since ? 1 : 0))) {
      if (
        !reasons.some(
          r =>
            r.reason === failure.reason &&
            r.fromAccountId === failure.fromAccountId,
        )
      ) {
        reasons.push({
          reason: failure.reason,
          since: failure.since,
          ...(failure.fromAccountId && {
            fromAccountId: failure.fromAccountId,
          }),
        });
      }
    }
    return reasons;
  };
  const accountMonth = (
    account: FxSnapshotAccount,
    index: number,
  ): AccountMonth => {
    const list = replay.closes.get(account.id)!;
    const [openClose, closeClose] = [list[index], list[index + 1]];
    const [openDate, closeDate] = [closes[index], closes[index + 1]];
    const opening = stocksOf(account, openClose, openDate);
    const closing = stocksOf(account, closeClose, closeDate);
    let unrepresentable = false;
    const difference = (a: bigint | null, b: bigint | null) => {
      if (a === null || b === null) return null;
      const amount = bounded(b - a);
      if (amount === null) unrepresentable = true;
      return amount;
    };
    const change = (field: keyof FxClose) =>
      difference(openClose[field], closeClose[field]);
    const changes: FxChanges = {
      flows: change('booked'),
      realized: change('realized'),
      feeRealized: change('feeRealized'),
      feeExpense: change('feeExpense'),
      unrealized: difference(
        opening.unrealized === null ? null : BigInt(opening.unrealized),
        closing.unrealized === null ? null : BigInt(closing.unrealized),
      ),
      carry: change('carry'),
      settlement: change('settlement'),
      gap: difference(opening.gap, closing.gap),
    };
    const reasons = reasonsOf(account.id, closeDate);
    const market: Array<[Stocks['reason'], string]> = [
      [opening.reason, openDate],
      [closing.reason, closeDate],
      [unrepresentable ? 'amount-out-of-range' : null, closeDate],
      ...(exchangeOverflow.get(account.id) ?? [])
        .filter(date => date > openDate && date <= closeDate)
        .map((date): [Stocks['reason'], string] => [
          'amount-out-of-range',
          date,
        ]),
    ];
    for (const [reason, date] of market) {
      if (
        reason &&
        !reasons.some(r => r.reason === reason && r.since === date)
      ) {
        reasons.push({ reason, since: date });
      }
    }
    const strip = ({ gap: _gap, reason: _reason, ...rest }: Stocks) => rest;
    const row: FxAccountMonth = {
      accountId: account.id,
      ...changes,
      opening: strip(opening),
      closing: strip(closing),
      reasons,
    };
    // Unknown is not zero: a null field keeps the row.
    const nonzero = (value: number | null) => value !== 0;
    const present =
      reasons.length > 0 ||
      CHANGE_FIELDS.some(field => nonzero(row[field])) ||
      [row.opening, row.closing].some(
        side =>
          nonzero(side.native) || STOCK_FIELDS.some(f => nonzero(side[f])),
      );
    return { row, present };
  };

  // The bridge: MC-8.1's walk over the snapshot's created months.
  const bridgeAccounts = snapshot.accounts
    .filter(account => !account.offbudget && foreign(account))
    .sort((a, b) =>
      a.sortOrder !== b.sortOrder
        ? a.sortOrder - b.sortOrder
        : a.name < b.name
          ? -1
          : a.name > b.name
            ? 1
            : 0,
    );
  // The walk reads each account's rows in date order; stored order is
  // arbitrary.
  const topLevel = snapshot.rows
    .filter(row => row.parentId === null && row.date <= today)
    .sort((a, b) =>
      a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.id < b.id ? -1 : 1,
    );
  const walk = new Map(
    walkFxValuation({
      accounts: bridgeAccounts.map(account => ({
        id: account.id,
        name: account.name,
        currency: account.currency!,
        currency_precision: account.precision,
      })),
      rowsOf: id =>
        topLevel
          .filter(row => row.account === id)
          .map(row => ({
            date: row.date,
            amount: row.amount,
            transaction_amount: row.native,
          })),
      months: snapshot.createdMonths.filter(month => month <= endMonth),
      today,
      basePrecision: bp,
      rateOn,
    }).map(entry => [entry.month, entry]),
  );
  const staleSince = new Map<string, string>();
  for (const row of snapshot.rows) {
    const stamp = pairEncoding(row.pair);
    const account = accounts.get(row.account);
    if (
      account &&
      stamp !== undefined &&
      stamp !== account.encoding &&
      !(staleSince.get(row.account)! <= row.date)
    ) {
      staleSince.set(row.account, row.date);
    }
  }
  const bridgeOf = (month: string, closeDate: string): FxBridgeMonth | null => {
    const entry = walk.get(month);
    if (!entry) return null;
    const sum = bounded(
      entry.posted === null || entry.broughtForward === null
        ? null
        : BigInt(entry.posted) + BigInt(entry.broughtForward),
    );
    const contribution = sum ?? 0;
    const contributionIncomplete = entry.incomplete || sum === null;
    const cell =
      snapshot.budgetType === 'tracking'
        ? null
        : (snapshot.cells[month] ?? { value: 0, incomplete: false });
    return {
      budgetType: snapshot.budgetType,
      opening: entry.opening,
      closing: entry.closing,
      flows: entry.flows,
      posted: entry.posted,
      broughtForward: entry.broughtForward,
      incomplete: entry.incomplete,
      contribution,
      contributionIncomplete,
      cell,
      pending:
        cell !== null &&
        (cell.value !== contribution ||
          cell.incomplete !== contributionIncomplete),
      accounts: entry.accounts.map(a => ({
        accountId: a.account,
        opening: a.opening,
        closing: a.closing,
        flows: a.flows,
        posted: a.posted,
        broughtForward: a.broughtForward,
        covers: a.covers,
        openDate: a.openDate,
        openingRate: a.openingRate,
        closeDate: a.closeDate,
        rate: a.rate,
        unavailableReason: a.unavailableReason,
        stale: (staleSince.get(a.account) ?? '9999') <= closeDate,
      })),
    };
  };

  /** A reference market value for the spread; a budget-currency leg is its own value. */
  const marketOf = (leg: FxLeg, date: string): Valued => {
    const account = accounts.get(leg.account)!;
    if (leg.native === null) return { value: null, rate: null, reason: null };
    const magnitude = leg.native < 0n ? -leg.native : leg.native;
    if (!foreign(account)) {
      return { value: magnitude, rate: null, reason: null };
    }
    return valueOf(account, magnitude, date);
  };
  const exchangeOf = (record: FxExchangeRecord): FxExchange => {
    const source = marketOf(record.source, record.date);
    const destination = marketOf(record.destination, record.date);
    const spread =
      source.value === null || destination.value === null
        ? null
        : destination.value - source.value;
    const value = bounded(record.destination.base);
    /**
     * Reasons travel with the endpoint so an unselected endpoint's unknown
     * figures stay explained. A budget-currency endpoint's realization and
     * reference rate are not applicable, not unknown.
     */
    const end = (leg: FxLeg, market: Valued): FxExchangeEnd => {
      const account = accounts.get(leg.account)!;
      const isForeign = foreign(account);
      const fee = record.fees.find(f => f.account === leg.account);
      // An ambiguous family's fee is unknown, not absent.
      const unknownFee = record.feeUnknown.includes(leg.account);
      const exact = {
        native: leg.native,
        fee: unknownFee ? null : fee ? fee.native : 0n,
        feeBooked: unknownFee ? null : fee ? fee.base : 0n,
        realized: record.realized.get(leg.account) ?? null,
        feeRealized: record.feeRealized.get(leg.account) ?? null,
      };
      const known = Object.entries(exact).filter(
        ([field]) =>
          isForeign || (field !== 'realized' && field !== 'feeRealized'),
      );
      const reasons =
        value === null || known.some(([, amount]) => amount === null)
          ? reasonsOf(leg.account, record.date)
          : [];
      const add = (reason: FxImpactReason | null) => {
        if (
          reason &&
          !reasons.some(r => r.reason === reason && r.since === record.date)
        ) {
          reasons.push({ reason, since: record.date });
        }
      };
      add(market.reason);
      if (
        known.some(
          ([, amount]) => amount !== null && bounded(amount) === null,
        ) ||
        (record.destination.base !== null && value === null) ||
        (spread !== null && bounded(spread) === null)
      ) {
        add('amount-out-of-range');
      }
      return {
        accountId: leg.account,
        currency: isForeign ? account.currency : null,
        native: bounded(exact.native),
        fee: bounded(exact.fee),
        feeBooked: bounded(exact.feeBooked),
        realized: bounded(exact.realized),
        feeRealized: bounded(exact.feeRealized),
        referenceRate: market.rate,
        reasons,
      };
    };
    return {
      id: record.id,
      date: record.date,
      value,
      source: end(record.source, source),
      destination: end(record.destination, destination),
      spread: bounded(spread),
    };
  };

  const foreignAccounts = snapshot.accounts.filter(foreign);
  const budgetAccounts = snapshot.accounts.filter(a => !foreign(a));
  const result: FxImpactMonth[] = months.map((month, index) => {
    const [openDate, closeDate] = [closes[index], closes[index + 1]];
    const rows = foreignAccounts.map(account => ({
      account,
      ...accountMonth(account, index),
    }));
    const shown = rows
      .filter(entry => entry.present && selected(entry.account.id))
      .map(entry => entry.row);
    const byCurrency = new Map<string, FxAccountMonth[]>();
    for (const row of shown) {
      const currency = accounts.get(row.accountId)!.currency!;
      byCurrency.set(currency, [...(byCurrency.get(currency) ?? []), row]);
    }
    let budgetFees: bigint | null = 0n;
    const budgetIncomplete: string[] = [];
    for (const account of budgetAccounts.filter(a => selected(a.id))) {
      const list = replay.closes.get(account.id)!;
      const [a, b] = [list[index].feeExpense, list[index + 1].feeExpense];
      if (a === null || b === null) budgetIncomplete.push(account.id);
      budgetFees =
        budgetFees === null || a === null || b === null
          ? null
          : budgetFees + b - a;
    }
    const budgetCurrencyFeeExpense = bounded(budgetFees);
    const total = totalOf(shown);
    const fees = shown.map(row => row.feeExpense);
    total.feeExpense = bounded(
      budgetFees === null || fees.some(fee => fee === null)
        ? null
        : fees.reduce<bigint>((sum, fee) => sum + BigInt(fee!), budgetFees),
    );
    total.incompleteAccountIds = [
      ...total.incompleteAccountIds,
      ...budgetIncomplete,
    ];
    const exchanges = replay.exchanges
      .filter(
        record =>
          record.date > openDate &&
          record.date <= closeDate &&
          (selected(record.source.account) ||
            selected(record.destination.account)),
      )
      .map(exchangeOf);
    const sum = (values: Array<number | null>) =>
      values.some(value => value === null)
        ? null
        : bounded(values.reduce<bigint>((s, v) => s + BigInt(v!), 0n));
    return {
      month,
      openDate,
      closeDate,
      accounts: shown,
      currencies: [...byCurrency].map(([currency, list]) => ({
        currency,
        ...totalOf(list),
      })),
      budgetCurrencyFeeExpense,
      total,
      onBudget: totalOf(
        rows
          .filter(entry => entry.present && !entry.account.offbudget)
          .map(entry => entry.row),
      ),
      bridge: bridgeOf(month, closeDate),
      exchanges,
      diagnostics: {
        fees: sum(
          exchanges.flatMap(e => [e.source.feeBooked, e.destination.feeBooked]),
        ),
        spread: sum(exchanges.map(e => e.spread)),
      },
    };
  });

  return {
    today,
    budgetCurrency,
    basePrecision: bp,
    startMonth: request.startMonth,
    endMonth,
    accounts: snapshot.accounts.map(account => ({
      id: account.id,
      name: account.name,
      currency: currencyOf(account),
      precision: foreign(account) ? account.precision : bp,
      offbudget: account.offbudget,
      closed: account.closed,
    })),
    unknownAccountIds,
    createdMonths: snapshot.createdMonths.length
      ? {
          first: snapshot.createdMonths[0],
          last: snapshot.createdMonths[snapshot.createdMonths.length - 1],
        }
      : null,
    months: result,
  };
}

/**
 * `report/fx-impact`: read-only, never a mutator or undoable. Takes today
 * once and reads its whole input before its first await.
 */
export async function getFxImpact(
  request: FxImpactRequest,
): Promise<FxImpactResult> {
  validateRequest(request);
  return calculateFxImpact(readFxSnapshot(monthUtils.currentDay()), request);
}
