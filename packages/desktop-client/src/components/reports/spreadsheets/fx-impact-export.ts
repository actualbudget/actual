import type { ReservationsBridge } from '@actual-app/core/server/budget/pocket-readers';
import type {
  FxAccountMonth,
  FxBridgeAccount,
  FxExchangeEnd,
  FxImpactAccountReason,
  FxImpactResult,
  FxRateUsed,
  FxStocks,
  FxTotal,
} from '@actual-app/core/types/models';
// Use the browser ESM build; see budget-analysis-export.ts.
import { stringify as csvStringify } from 'csv-stringify/browser/esm/sync';
import { t } from 'i18next';

const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

const STOCKS = [
  ['booked', 'booked'],
  ['basis', 'basis'],
  ['value', 'value'],
  ['unrealized', 'unrealized'],
] as const;
const CHANGES = [
  ['Flows', 'flows'],
  ['Realized', 'realized'],
  ['Fee realized', 'feeRealized'],
  ['Fee expense', 'feeExpense'],
  ['Unrealized change', 'unrealized'],
  ['Transfer carry', 'carry'],
  ['Internal settlement', 'settlement'],
  ['Total change', 'gap'],
] as const;
const RATE = ['date', '', 'kind', 'source', 'timestamp', 'fallback'];
const END = [
  'account',
  'currency',
  'native',
  'fee',
  'fee booked',
  'realized',
  'fee realized',
  'reference rate',
];

// [label, field, native] for each currency's reservation figures.
const RESERVATION_FIGURES = [
  ['Holdings', 'holdings', true],
  ['Booked holdings', 'bookedHoldings', false],
  ['Held at valuation', 'heldAtValuation', true],
  ['Booked at valuation', 'bookedAtValuation', false],
  ['Reserved', 'reserved', true],
  ['Unreserved', 'unreserved', true],
  ['Holdings value', 'holdingsValue', false],
  ['Gap', 'gap', false],
  ['Excluded FX', 'excludedFx', false],
  ['Included FX', 'includedFx', false],
  ['Included value', 'includedValue', false],
  ['Market holdings', 'marketHoldings', false],
  ['Market unreserved', 'marketUnreserved', false],
  ['Account rounding', 'accountRounding', false],
  ['Planning', 'planning', false],
  ['Pocket total', 'pocketTotal', false],
  ['Included reservation', 'includedReservation', false],
  ['Exact change', 'exactChange', false],
  ['Written change', 'writtenChange', false],
  ['Spent base', 'spentBase', false],
] as const;
const LANE_FIGURES = [
  ['Budgeted', 'budgeted', true],
  ['Budgeted base', 'budgetedBase', false],
  ['Spent', 'spent', true],
  ['Lane spent base', 'spentBase', false],
  ['Carry in', 'carryIn', true],
  ['Reset', 'reset', true],
  ['Balance', 'balance', true],
  ['Balance base', 'balanceBase', false],
  ['Reservation FX', 'reservationFx', false],
] as const;

// Stable machine-readable headers, like the type and reason codes below.
const COLUMNS = [
  'Type',
  'Month',
  'Currency',
  'Account ID',
  'Account',
  'Off budget',
  ...['Opening', 'Closing'].flatMap(side => [
    `${side} native`,
    ...STOCKS.map(([label]) => `${side} ${label}`),
  ]),
  ...CHANGES.map(([label]) => label),
  ...['Opening', 'Closing'].flatMap(side =>
    RATE.map(part => `${side} rate${part ? ` ${part}` : ''}`),
  ),
  'Posted',
  'Brought forward',
  'Contribution',
  'Contribution incomplete',
  'Included in To Budget',
  'Included incomplete',
  'Pending',
  'Budget type',
  'Covers',
  'Stale',
  'Incomplete',
  'Exchange ID',
  'Date',
  'Exchange value',
  'Spread',
  ...['Source', 'Destination'].flatMap(end =>
    END.map(part => `${end} ${part}`),
  ),
  // Currency pocket reservations (MC-10): natives at the currency's
  // precision, the rest in the budget currency.
  'Valuation',
  'Rule',
  'Carried from',
  ...RESERVATION_FIGURES.map(([label]) => label),
  'Funds',
  'Shortage',
  'Assigned',
  'Remainder',
  'Lane ID',
  'Category ID',
  ...LANE_FIGURES.map(([label]) => label),
  'Capture date',
  'Value kind',
  'Carryover',
  'Reasons',
  'Incomplete accounts',
  'Note',
];

type CsvRecord = Record<string, string>;

/** An exact signed decimal from a stored integer and its recorded precision. */
export function exactDecimal(
  value: number | null,
  precision: number | null,
): string {
  if (value === null || precision === null) return '';
  const negative = value < 0;
  const digits = (negative ? -BigInt(value) : BigInt(value))
    .toString()
    .padStart(precision + 1, '0');
  const whole = digits.slice(0, digits.length - precision);
  const fraction = precision ? `.${digits.slice(-precision)}` : '';
  return `${negative ? '-' : ''}${whole}${fraction}`;
}

/** Spreadsheet formula protection for text; amounts are never passed here. */
function text(value: string | null | undefined): string {
  if (!value) return '';
  return FORMULA_TRIGGERS.test(value) ? `'${value}` : value;
}

const reasonText = (r: FxImpactAccountReason) =>
  `${r.reason} since ${r.since}${r.fromAccountId ? ` from ${r.fromAccountId}` : ''}`;

const flag = (value: boolean | null | undefined) =>
  value === null || value === undefined ? '' : String(value);

function rateCells(side: string, date: string, rate: FxRateUsed | null) {
  return {
    [`${side} rate date`]: rate ? date : '',
    [`${side} rate`]: text(rate?.rate),
    [`${side} rate kind`]: text(rate?.kind),
    [`${side} rate source`]: text(rate?.source),
    [`${side} rate timestamp`]: text(rate?.timestamp),
    [`${side} rate fallback`]: flag(rate?.fallback),
  };
}

/** One record per result record, in display order, from the result alone. */
export function buildFxImpactRecords(result: FxImpactResult): CsvRecord[] {
  const base = result.basePrecision;
  const accounts = new Map(result.accounts.map(a => [a.id, a]));
  const money = (value: number | null) => exactDecimal(value, base);
  const stocks = (side: string, values: FxStocks) =>
    Object.fromEntries(
      STOCKS.map(([label, field]) => [
        `${side} ${label}`,
        money(values[field]),
      ]),
    );
  const changes = (values: FxTotal | FxAccountMonth) =>
    Object.fromEntries(
      CHANGES.map(([label, field]) => [label, money(values[field])]),
    );
  const total = (type: string, month: string, values: FxTotal) => ({
    Type: type,
    Month: month,
    ...stocks('Opening', values.opening),
    ...stocks('Closing', values.closing),
    ...changes(values),
    'Incomplete accounts': text(values.incompleteAccountIds.join('; ')),
  });
  const end = (prefix: string, values: FxExchangeEnd) => {
    const precision =
      values.currency === null
        ? base
        : (accounts.get(values.accountId)?.precision ?? null);
    return {
      [`${prefix} account`]: text(values.accountId),
      [`${prefix} currency`]: text(values.currency ?? result.budgetCurrency),
      [`${prefix} native`]: exactDecimal(values.native, precision),
      [`${prefix} fee`]: exactDecimal(values.fee, precision),
      [`${prefix} fee booked`]: money(values.feeBooked),
      [`${prefix} realized`]: money(values.realized),
      [`${prefix} fee realized`]: money(values.feeRealized),
      [`${prefix} reference rate`]: text(values.referenceRate?.rate),
    };
  };
  const bridgeAccount = (month: string, values: FxBridgeAccount): CsvRecord => {
    const account = accounts.get(values.accountId);
    return {
      Type: 'bridge-account',
      Month: month,
      Currency: text(account?.currency),
      'Account ID': text(values.accountId),
      Account: text(account?.name),
      'Opening value': money(values.opening),
      'Closing value': money(values.closing),
      Flows: money(values.flows),
      Posted: money(values.posted),
      'Brought forward': money(values.broughtForward),
      Covers: values.covers.join('; '),
      Stale: flag(values.stale),
      ...rateCells('Opening', values.openDate, values.openingRate),
      ...rateCells('Closing', values.closeDate, values.rate),
      Reasons: text(values.unavailableReason),
    };
  };

  /** The reservation section: captured cells, split, currencies, lanes. */
  const reservationRecords = (
    month: string,
    reservations: ReservationsBridge | null,
  ): CsvRecord[] => {
    if (!reservations) return [];
    return [
      {
        Type: 'reservations',
        Month: month,
        Contribution: money(reservations.changes),
        'Contribution incomplete': flag(reservations.incomplete),
        'Included in To Budget': money(reservations.cell.changes),
        'Included incomplete': flag(reservations.cell.incomplete),
        Pending: flag(reservations.pending),
        Assigned: money(reservations.assigned),
        Remainder: money(reservations.remainder),
      },
      ...reservations.currencies.flatMap(currency => {
        const amount = (value: number | null, native: boolean) =>
          native ? exactDecimal(value, currency.precision) : money(value);
        return [
          {
            Type: 'reservation-currency',
            Month: month,
            Currency: text(currency.currency),
            Valuation: currency.valuation,
            Rule: currency.rule === null ? '' : String(currency.rule),
            'Carried from': currency.carriedFrom ?? '',
            ...rateCells('Closing', currency.valuationDate, currency.rate),
            ...Object.fromEntries(
              RESERVATION_FIGURES.map(([label, field, native]) => [
                label,
                amount(currency[field], native),
              ]),
            ),
            Funds: money(currency.funds),
            Shortage: flag(currency.backing.shortage),
            Reasons: text(currency.incomplete.join('; ')),
          },
          ...currency.lanes.map(lane => ({
            Type: 'reservation-lane',
            Month: month,
            Currency: text(currency.currency),
            'Lane ID': text(lane.laneId),
            'Category ID': text(lane.categoryId),
            ...Object.fromEntries(
              LANE_FIGURES.map(([label, field, native]) => [
                label,
                amount(lane[field], native),
              ]),
            ),
            'Capture date': lane.captureDate ?? '',
            'Value kind': lane.valueKind,
            Carryover: flag(lane.carryover),
          })),
        ];
      }),
    ];
  };

  const complete = (record: CsvRecord): CsvRecord =>
    Object.fromEntries(COLUMNS.map(column => [column, record[column] ?? '']));

  return result.months.flatMap(month => {
    const records: CsvRecord[] = month.accounts.map(row => {
      const account = accounts.get(row.accountId);
      const precision = account?.precision ?? null;
      const reasons = row.reasons.map(reasonText);
      if (precision === null) reasons.unshift('precision-unavailable');
      return {
        Type: 'account',
        Month: month.month,
        Currency: text(account?.currency),
        'Account ID': text(row.accountId),
        Account: text(account?.name),
        'Off budget': flag(account?.offbudget),
        'Opening native': exactDecimal(row.opening.native, precision),
        ...stocks('Opening', row.opening),
        'Closing native': exactDecimal(row.closing.native, precision),
        ...stocks('Closing', row.closing),
        ...changes(row),
        ...rateCells('Opening', month.openDate, row.opening.rate),
        ...rateCells('Closing', month.closeDate, row.closing.rate),
        Reasons: text(reasons.join('; ')),
      };
    });
    records.push(
      ...month.currencies.map(values => ({
        ...total('currency', month.month, values),
        Currency: text(values.currency),
      })),
      {
        Type: 'budget-currency-fees',
        Month: month.month,
        Currency: text(result.budgetCurrency),
        'Fee expense': money(month.budgetCurrencyFeeExpense),
      },
      total('total', month.month, month.total),
      total('on-budget', month.month, month.onBudget),
    );
    const bridge = month.bridge;
    if (bridge) {
      records.push(
        {
          Type: 'bridge',
          Month: month.month,
          'Opening value': money(bridge.opening),
          'Closing value': money(bridge.closing),
          Flows: money(bridge.flows),
          Posted: money(bridge.posted),
          'Brought forward': money(bridge.broughtForward),
          Contribution: money(bridge.contribution),
          'Contribution incomplete': flag(bridge.contributionIncomplete),
          'Included in To Budget': money(bridge.cell?.value ?? null),
          'Included incomplete': flag(bridge.cell?.incomplete),
          Pending: flag(bridge.pending),
          'Budget type': bridge.budgetType,
          Incomplete: flag(bridge.incomplete),
        },
        ...bridge.accounts.map(values => bridgeAccount(month.month, values)),
        ...reservationRecords(month.month, bridge.reservations ?? null),
      );
    }
    records.push(
      ...month.exchanges.map(exchange => ({
        Type: 'exchange',
        Month: month.month,
        'Exchange ID': text(exchange.id),
        Date: exchange.date,
        'Exchange value': money(exchange.value),
        Spread: money(exchange.spread),
        ...end('Source', exchange.source),
        ...end('Destination', exchange.destination),
        // Each endpoint explains its own unknown figures, selected or not.
        Reasons: text(
          [
            ...exchange.source.reasons.map(r => `source: ${reasonText(r)}`),
            ...exchange.destination.reasons.map(
              r => `destination: ${reasonText(r)}`,
            ),
          ].join('; '),
        ),
        Note: t(
          'Reference figures for whole exchanges; do not add to FX totals',
        ),
      })),
    );
    return records.map(complete);
  });
}

export function buildFxImpactCsv(result: FxImpactResult): string {
  return csvStringify(
    buildFxImpactRecords(result).map(record =>
      COLUMNS.map(column => record[column]),
    ),
    { header: true, columns: COLUMNS },
  );
}
