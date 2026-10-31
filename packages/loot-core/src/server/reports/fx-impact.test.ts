import { writeFileSync } from 'fs';

import { Timestamp } from '@actual-app/crdt';

import {
  correctAccountCurrency,
  previewCurrencyCorrection,
} from '#server/accounts/currency-correction';
import { createAllBudgets } from '#server/budget/base';
import {
  fxValuation,
  refreshFxChanges,
  stopFxDayWatch,
} from '#server/budget/fx-valuation';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import {
  exchangeRateId,
  app as exchangeRatesApp,
} from '#server/exchange-rates/app';
import * as prefs from '#server/prefs';
import { createSchedule } from '#server/schedules/app';
import * as sheet from '#server/sheet';
import { applyMessages, setSyncingMode } from '#server/sync';
import { parseAmountPair } from '#server/sync/coupled-cells';
import { batchUpdateTransactions } from '#server/transactions';
import { app as transactionsApp } from '#server/transactions/app';
import { replaceExchangeTotal } from '#server/transactions/foreign-guard';
import { loadRules } from '#server/transactions/transaction-rules';
import * as monthUtils from '#shared/months';
import type { FxImpactRequest, FxImpactResult } from '#types/models';

import { app as reportsApp } from './app';
import { calculateFxImpact, getFxImpact, readFxSnapshot } from './fx-impact';

// The shared months module is loaded by the test setup before this file,
// so the day is replaced on its namespace, which every importer reads.
const clock = { today: '2026-02-14' };
vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

const postForeign = transactionsApp.handlers['transactions/post-foreign-entry'];
const postExchange =
  transactionsApp.handlers['transactions/post-exchange-transfer'];
const editExchange =
  transactionsApp.handlers['transactions/update-exchange-transfer'];
const batchUpdate = transactionsApp.handlers['transactions-batch-update'];

const payeeOf = (account: string) =>
  db.firstSync<{ id: string }>(
    'SELECT id FROM payees WHERE transfer_acct = ?',
    [account],
  )!.id;

const stored = () =>
  db.runQuery<{
    id: string;
    acct: string;
    amount: number;
    transaction_amount: number | null;
    transferred_id: string | null;
  }>(
    `SELECT id, acct, amount, transaction_amount, transferred_id
       FROM transactions WHERE tombstone = 0 ORDER BY acct, id`,
    [],
    true,
  );

async function addAccount(
  id: string,
  currency?: string,
  { offbudget = 0 }: { offbudget?: number } = {},
) {
  await db.insertAccount({
    id,
    name: id,
    offbudget,
    ...(currency && { currency }),
  });
  await db.insertPayee({ name: '', transfer_acct: id });
}

async function setUp() {
  await global.emptyDatabase()();
  await loadMappings();
  await prefs.loadPrefs();
  await db.update('preferences', { id: 'defaultCurrencyCode', value: 'USD' });
  await prefs.savePrefs({
    amountEncoding: JSON.stringify({
      version: 1,
      currencyCode: 'USD',
      precision: 2,
    }),
  });
  for (const flag of ['currency', 'multicurrency']) {
    await db.update('preferences', { id: `flags.${flag}`, value: 'true' });
  }
  await loadRules();
  await db.insertCategoryGroup({ id: 'expenses', name: 'Expenses' });
  await db.insertCategoryGroup({ id: 'income', name: 'Income', is_income: 1 });
  await addAccount('usd');
  await addAccount('A', 'JPY');
  await addAccount('B', 'JPY');
}

/** A foreign entry through the real handler, optionally a transfer. */
async function entry(
  id: string,
  account: string,
  date: string,
  native: number,
  baseAmount: number,
  transferTo?: string,
) {
  const result = await postForeign({
    transaction: {
      id,
      account,
      date,
      transaction_amount: native,
      ...(transferTo && { payee: payeeOf(transferTo) }),
    },
    baseAmount,
  });
  expect(result).toMatchObject({ status: 'ok' });
}

async function standing(quote: string, rate: string, date = '2025-12-01') {
  await exchangeRatesApp.handlers['exchange-rates/save']({
    quoteCurrency: quote,
    rate,
    kind: 'standing',
    date,
    replace: true,
  });
}

/** A fetched rate as a provider stores it; no handler writes fetched rates. */
async function fetched(quote: string, rate: string, date: string) {
  const timestamp = `${date}T00:00:00.000Z`;
  await db.insert('exchange_rates', {
    id: exchangeRateId('USD', quote, 'provider', 'fetched', timestamp),
    base_currency: 'USD',
    quote_currency: quote,
    rate,
    kind: 'fetched',
    source: 'provider',
    timestamp,
    tombstone: 0,
  });
}

type ExchangeRequest = Parameters<typeof postExchange>[0];
type ExchangeAmounts = Pick<
  ExchangeRequest,
  'sourceAmount' | 'destinationAmount' | 'sourceFee' | 'destinationFee'
>;

async function exchange(input: ExchangeRequest) {
  const result = await postExchange(input);
  if (result.status !== 'ok') throw new Error('post failed');
  return result;
}

async function build() {
  await sheet.loadSpreadsheet(db);
  sheet.get().meta().budgetType = 'envelope';
  await createAllBudgets();
  await sheet.waitOnSpreadsheet();
}

function report(request: Partial<FxImpactRequest> = {}) {
  return getFxImpact({
    startMonth: '2026-01',
    endMonth: clock.today.slice(0, 7),
    accountIds: null,
    currencies: null,
    ...request,
  });
}

const monthOf = (result: FxImpactResult, month: string) =>
  result.months.find(m => m.month === month)!;
const rowOf = (result: FxImpactResult, month: string, id: string) =>
  monthOf(result, month).accounts.find(a => a.accountId === id);

const cellOf = (month: string, name: string) =>
  sheet.getCellValue(`budget${month.replace('-', '')}`, name);

const remote = (
  dataset: string,
  row: string,
  column: string,
  value: string | number | null,
) => ({ dataset, row, column, value, timestamp: Timestamp.send()! });

/** A transaction another device added, delivered as sync messages. */
function remoteRow(
  id: string,
  account: string,
  date: number,
  pair: string,
  transfer?: string,
) {
  const parsed = parseAmountPair(pair)!;
  return [
    remote('transactions', id, 'acct', account),
    remote('transactions', id, 'date', date),
    remote('transactions', id, 'amount', parsed.amount),
    remote('transactions', id, 'transaction_amount', parsed.transaction_amount),
    remote('transactions', id, 'amount_pair', pair),
    ...(transfer
      ? [remote('transactions', id, 'transferred_id', transfer)]
      : []),
  ];
}

/** Every bridge field equals MC-8.1's walk for each created month. */
async function expectBridgeParity(request: Partial<FxImpactRequest>) {
  const result = await report(request);
  const months = [...sheet.get().meta().createdMonths].sort();
  const walk = await fxValuation(months, clock.today);
  let compared = 0;
  for (const month of result.months) {
    const entry = walk.find(w => w.month === month.month);
    if (!entry) {
      expect(month.bridge).toBeNull();
      continue;
    }
    compared++;
    expect(month.bridge).toMatchObject({
      opening: entry.opening,
      closing: entry.closing,
      flows: entry.flows,
      posted: entry.posted,
      broughtForward: entry.broughtForward,
      incomplete: entry.incomplete,
    });
    expect(month.bridge!.accounts).toEqual(
      entry.accounts.map(a => ({
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
        stale: false,
      })),
    );
  }
  expect(compared).toBeGreaterThan(0);
  return result;
}

beforeEach(async () => {
  clock.today = '2026-02-14';
  vi.spyOn(monthUtils, 'currentDay').mockImplementation(() => clock.today);
  vi.spyOn(monthUtils, 'currentMonth').mockImplementation(() =>
    clock.today.slice(0, 7),
  );
  await setUp();
});

afterEach(() => {
  stopFxDayWatch();
  vi.restoreAllMocks();
});

describe('B0 through transactions/post-foreign-entry', () => {
  it('stores a base-only same-currency transfer', async () => {
    expect(
      await postForeign({
        transaction: {
          id: 'a01',
          account: 'A',
          date: '2026-01-01',
          transaction_amount: 10000,
        },
        baseAmount: 10000,
      }),
    ).toEqual({ status: 'ok', id: 'a01' });
    expect(
      await postForeign({
        transaction: {
          id: 'b0a',
          account: 'A',
          date: '2026-01-02',
          payee: payeeOf('B'),
          transaction_amount: 0,
        },
        baseAmount: -100,
      }),
    ).toMatchObject({ status: 'ok' });
    const rows = stored();
    expect(rows.filter(r => r.transferred_id)).toEqual([
      expect.objectContaining({
        acct: 'A',
        id: 'b0a',
        amount: -100,
        transaction_amount: 0,
      }),
      expect.objectContaining({
        acct: 'B',
        amount: 100,
        transaction_amount: 0,
      }),
    ]);
  });

  it('reports cumulative carry after each base-only transfer', async () => {
    await standing('JPY', '100');
    await entry('a01', 'A', '2026-01-01', 10000, 10000);
    await entry('b0a', 'A', '2026-01-02', 0, -100, 'B');
    clock.today = '2026-01-02';
    const first = await report({ endMonth: '2026-01' });
    expect(rowOf(first, '2026-01', 'A')).toMatchObject({
      realized: 0,
      carry: 100,
      unrealized: 0,
      closing: { native: 10000, basis: 10000, booked: 9900, value: 10000 },
      reasons: [],
    });
    expect(rowOf(first, '2026-01', 'B')).toMatchObject({
      realized: 0,
      carry: -100,
      closing: { native: 0, basis: 0, booked: 100, value: 0 },
    });
    await entry('b0b', 'A', '2026-01-03', 0, -100, 'B');
    clock.today = '2026-01-03';
    const second = await report({ endMonth: '2026-01' });
    expect(rowOf(second, '2026-01', 'A')).toMatchObject({
      carry: 200,
      closing: { booked: 9800, value: 10000, unrealized: 0 },
    });
    expect(rowOf(second, '2026-01', 'B')).toMatchObject({
      carry: -200,
      closing: { booked: 200 },
    });
    const total = monthOf(second, '2026-01').total;
    expect(total.carry).toBe(0);
    expect(total.closing.value! - total.closing.booked!).toBe(0);
  });
});

describe('zero transfers through MC-7 corrections', () => {
  /** Seeds a reciprocal zero pair as the correction tests do. */
  function zeroPair(a: string, b: string, native: number | null) {
    for (const [id, account, other, otherAccount] of [
      ['z1', a, 'z2', b],
      ['z2', b, 'z1', a],
    ]) {
      db.runQuery(
        `INSERT INTO transactions (id, acct, date, amount, transaction_amount,
           isParent, isChild, transferred_id, description, tombstone,
           sort_order)
         VALUES (?, ?, 20260110, 0, ?, 0, 0, ?, ?, 0, 0)`,
        [id, account, native, other, payeeOf(otherAccount)],
      );
    }
  }

  async function correct(
    account: string,
    currency: string,
    mode: 'convert' | 'keep',
    amounts?: Record<string, number>,
  ) {
    const preview = await previewCurrencyCorrection({
      account,
      currency,
      mode,
      ...(amounts && { amounts }),
    });
    const result = await correctAccountCurrency({
      account,
      currency,
      mode,
      ...(amounts && { amounts }),
      fingerprint: preview.fingerprint,
    });
    expect(result.status).toBe('ok');
  }

  it('ZP1 leaves Convert history unchanged by a retained zero pair', async () => {
    const run = async (withZero: boolean) => {
      await setUp();
      await addAccount('usd2');
      await standing('JPY', '100');
      await batchUpdate({
        added: [
          { id: 'u1', account: 'usd', date: '2026-01-01', amount: 10000 },
          { id: 'u2', account: 'usd', date: '2026-01-03', amount: -5000 },
          { id: 'v1', account: 'usd2', date: '2026-01-02', amount: 3000 },
        ],
      });
      if (withZero) zeroPair('usd', 'usd2', null);
      await correct('usd', 'JPY', 'convert');
      return report();
    };
    const plain = await run(false);
    const withZero = await run(true);
    expect(withZero.months).toEqual(plain.months);
    expect(
      withZero.months.flatMap(m => m.accounts.flatMap(a => a.reasons)),
    ).toEqual([]);
    expect(rowOf(withZero, '2026-01', 'usd')).toBeDefined();
  });

  it('ZP2 leaves Keep history unchanged by a retained zero pair', async () => {
    const run = async (withZero: boolean) => {
      await setUp();
      await standing('JPY', '100');
      await standing('EUR', '0.9');
      await entry('a1', 'A', '2026-01-01', 10000, 10000);
      await entry('b1', 'B', '2026-01-02', 5000, 6000);
      if (withZero) zeroPair('A', 'B', 0);
      await correct('A', 'EUR', 'keep', withZero ? { z1: 0 } : undefined);
      return report();
    };
    const plain = await run(false);
    const withZero = await run(true);
    expect(withZero.months).toEqual(plain.months);
    expect(
      withZero.months.flatMap(m => m.accounts.flatMap(a => a.reasons)),
    ).toEqual([]);
  });

  it('Z1 treats a fee rounded to zero by Keep as fee-free', async () => {
    await addAccount('K', 'KWD');
    await addAccount('E', 'EUR');
    await standing('KWD', '0.3');
    await standing('EUR', '0.9');
    await standing('JPY', '100');
    await entry('k1', 'K', '2026-01-01', 5000, 16000);
    await exchange({
      date: '2026-01-05',
      sourceAccount: 'K',
      destinationAccount: 'E',
      sourceAmount: 3001,
      sourceFee: 1,
      destinationAmount: 900,
      baseAmount: 1000,
    });
    await correct('K', 'JPY', 'keep');
    const fee = db.firstSync<{ amount: number; transaction_amount: number }>(
      `SELECT amount, transaction_amount FROM transactions
         WHERE acct = 'K' AND isChild = 1 AND transferred_id IS NULL
           AND tombstone = 0`,
    );
    expect(fee).toEqual({ amount: 0, transaction_amount: 0 });
    const snapshot = readFxSnapshot(clock.today);
    const request = {
      startMonth: '2026-01',
      endMonth: '2026-02',
      accountIds: null,
      currencies: null,
    };
    const result = calculateFxImpact(snapshot, request);
    // The same principal integers as a fee-free exchange: the transfer
    // child becomes a top-level row; the parent and zero fee are dropped.
    const familyIds = new Set(
      snapshot.rows.filter(r => r.account === 'K' && r.isParent).map(r => r.id),
    );
    const feeFree = calculateFxImpact(
      {
        ...snapshot,
        rows: snapshot.rows
          .filter(
            r =>
              !familyIds.has(r.id) &&
              !(r.parentId && familyIds.has(r.parentId) && !r.transferId),
          )
          .map(r =>
            r.parentId && familyIds.has(r.parentId)
              ? { ...r, parentId: null }
              : r,
          ),
      },
      request,
    );
    const k = rowOf(result, '2026-01', 'K')!;
    expect(k).toMatchObject({ feeRealized: 0, feeExpense: 0, reasons: [] });
    expect(k).toEqual(rowOf(feeFree, '2026-01', 'K'));
    expect(rowOf(result, '2026-01', 'E')).toEqual(
      rowOf(feeFree, '2026-01', 'E'),
    );
    expect(monthOf(result, '2026-01').exchanges[0].source.fee).toBe(0);
  });
});

describe('stale encodings through the sync path', () => {
  async function staleSetUp() {
    await addAccount('K', 'KWD');
    await standing('JPY', '100');
    await standing('KWD', '0.3');
    await entry('k1', 'K', '2026-02-01', 3000, 1000);
    const preview = await previewCurrencyCorrection({
      account: 'K',
      currency: 'JPY',
      mode: 'convert',
    });
    await correctAccountCurrency({
      account: 'K',
      currency: 'JPY',
      mode: 'convert',
      fingerprint: preview.fingerprint,
    });
  }

  it('S1 marks a stale old-foreign row and keeps its booked base', async () => {
    await staleSetUp();
    await applyMessages(remoteRow('r1', 'K', 20260203, '330:1000@K~KWD.3'));
    await build();
    const result = await report({ startMonth: '2026-02' });
    const k = rowOf(result, '2026-02', 'K')!;
    expect(k.reasons).toEqual([
      { reason: 'stale-encoding', since: '2026-02-03' },
    ]);
    expect(k.closing).toMatchObject({
      native: null,
      basis: null,
      booked: 1330,
    });
    const bridge = monthOf(result, '2026-02').bridge!;
    const walk = (
      await fxValuation(
        [...sheet.get().meta().createdMonths].sort(),
        clock.today,
      )
    ).find(m => m.month === '2026-02')!;
    expect(bridge.accounts).toEqual([
      expect.objectContaining({
        accountId: 'K',
        closing: walk.accounts[0].closing,
        posted: walk.accounts[0].posted,
        stale: true,
      }),
    ]);
  });

  it('S2 marks a stale budget-currency row in a corrected account', async () => {
    await addAccount('Y');
    await standing('JPY', '100');
    await batchUpdate({
      added: [{ id: 'y1', account: 'Y', date: '2026-02-01', amount: 1000 }],
    });
    const preview = await previewCurrencyCorrection({
      account: 'Y',
      currency: 'JPY',
      mode: 'convert',
    });
    await correctAccountCurrency({
      account: 'Y',
      currency: 'JPY',
      mode: 'convert',
      fingerprint: preview.fingerprint,
    });
    await applyMessages(remoteRow('r1', 'Y', 20260203, '-500:@Y~'));
    const result = await report({ startMonth: '2026-02' });
    expect(rowOf(result, '2026-02', 'Y')).toMatchObject({
      reasons: [{ reason: 'stale-encoding', since: '2026-02-03' }],
      closing: { native: null, basis: null, booked: 500 },
    });
  });

  it('S3 propagates a stale transfer leg to its healthy counterpart', async () => {
    await staleSetUp();
    await addAccount('J', 'JPY');
    await entry('j1', 'J', '2026-02-01', 2000, 2000);
    await applyMessages([
      ...remoteRow('r1', 'K', 20260203, '-330:-1000@K~KWD.3', 'r2'),
      ...remoteRow('r2', 'J', 20260203, '330:1000@J~JPY.0', 'r1'),
    ]);
    const result = await report({ startMonth: '2026-02' });
    expect(rowOf(result, '2026-02', 'K')!.reasons).toEqual([
      { reason: 'stale-encoding', since: '2026-02-03' },
    ]);
    expect(rowOf(result, '2026-02', 'J')).toMatchObject({
      reasons: [
        { reason: 'stale-encoding', since: '2026-02-03', fromAccountId: 'K' },
      ],
      closing: { native: 3000, basis: null, booked: 2330 },
    });
  });

  it.each([
    ['S4 legacy unstamped', '1000:1000'],
    ['S5 malformed stamp', '1000:1000@J~JPY.x'],
  ])('%s pairs replay normally', async (_name, pair) => {
    await addAccount('J', 'JPY');
    await standing('JPY', '100');
    await applyMessages(remoteRow('r1', 'J', 20260203, pair));
    const result = await report({ startMonth: '2026-02' });
    expect(rowOf(result, '2026-02', 'J')).toMatchObject({
      reasons: [],
      closing: { native: 1000, basis: 1000, booked: 1000, unrealized: 0 },
    });
  });
});

describe('fee family normalization through the writers', () => {
  const jRow = (result: FxImpactResult) => rowOf(result, '2026-01', 'A');

  async function holdings() {
    await standing('JPY', '100');
    await entry('a0', 'A', '2026-01-01', 10100, 10100);
  }

  it('N1 replays a source fee as written', async () => {
    await holdings();
    await exchange({
      date: '2026-01-02',
      sourceAccount: 'A',
      destinationAccount: 'usd',
      sourceAmount: 10100,
      sourceFee: 100,
      destinationAmount: 11000,
    });
    const result = await report({ endMonth: '2026-01' });
    expect(jRow(result)).toMatchObject({
      realized: 1010,
      feeRealized: 10,
      feeExpense: -110,
      closing: { native: 0, booked: -1010, basis: 0 },
    });
    expect(monthOf(result, '2026-01').exchanges[0]).toMatchObject({
      value: 11000,
      spread: 1000,
      source: { accountId: 'A', native: -10000, fee: -100, feeBooked: -110 },
      destination: { accountId: 'usd', currency: null, native: 11000 },
    });
  });

  it('N2 replays a destination fee as written', async () => {
    await holdings();
    await exchange({
      date: '2026-01-02',
      sourceAccount: 'A',
      destinationAccount: 'usd',
      sourceAmount: 10000,
      destinationFee: 200,
      destinationAmount: 10800,
    });
    const result = await report({ endMonth: '2026-01' });
    expect(jRow(result)).toMatchObject({ realized: 1000, feeExpense: 0 });
    expect(monthOf(result, '2026-01').budgetCurrencyFeeExpense).toBe(-200);
  });

  /** The selected account rows after a fresh posting of the final values. */
  async function fresh(final: ExchangeAmounts) {
    await setUp();
    await holdings();
    await exchange({
      date: '2026-01-02',
      sourceAccount: 'A',
      destinationAccount: 'usd',
      ...final,
    });
    const result = await report({ endMonth: '2026-01' });
    return [jRow(result), monthOf(result, '2026-01').total];
  }

  const familyExpected = () =>
    Object.fromEntries(
      db
        .runQuery<{
          id: string;
          acct: string;
          amount: number;
          transaction_amount: number | null;
          date: number;
        }>(
          // The exchange family only, not the holdings entry.
          "SELECT id, acct, amount, transaction_amount, date FROM transactions WHERE tombstone = 0 AND id != 'a0'",
          [],
          true,
        )
        .map(r => [
          r.id,
          {
            account: r.acct,
            amount: r.amount,
            transaction_amount: r.transaction_amount,
            date: db.fromDateRepr(r.date),
          },
        ]),
    );

  it.each<[string, ExchangeAmounts]>([
    [
      'N3 moves the fee to the destination',
      { sourceAmount: 10000, destinationFee: 200, destinationAmount: 10800 },
    ],
    ['N4 drops the fee', { sourceAmount: 10000, destinationAmount: 11000 }],
  ])('%s and replays the final values', async (_name, final) => {
    await holdings();
    const { sourceId } = await exchange({
      date: '2026-01-02',
      sourceAccount: 'A',
      destinationAccount: 'usd',
      sourceAmount: 10100,
      sourceFee: 100,
      destinationAmount: 11000,
    });
    expect(
      await editExchange({
        id: sourceId,
        expected: familyExpected(),
        ...final,
      }),
    ).toEqual({ status: 'ok' });
    const result = await report({ endMonth: '2026-01' });
    const edited = [jRow(result), monthOf(result, '2026-01').total];
    expect(edited).toEqual(await fresh(final));
  });

  it('N5 replays a replaced scheduled total', async () => {
    await addAccount('K', 'KWD');
    await standing('KWD', '0.3');
    await holdings();
    const schedule = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'A' },
        { op: 'is', field: 'payee', value: payeeOf('K') },
        {
          op: 'isapprox',
          field: 'date',
          value: {
            start: '2026-01-02',
            frequency: 'monthly',
            patterns: [],
            skipWeekend: false,
            weekendSolveMode: 'after',
            endMode: 'never',
            endOccurrences: 1,
            endDate: '2026-01-02',
          },
        },
        { op: 'isapprox', field: 'amount', value: -10000 },
      ],
    });
    const { destinationId } = await exchange({
      date: '2026-01-02',
      sourceAccount: 'A',
      destinationAccount: 'K',
      sourceAmount: 10000,
      destinationAmount: 30000,
      baseAmount: 11000,
      initiatingAccount: 'A',
      schedule,
    });
    const replacement = await replaceExchangeTotal(destinationId, 31000);
    if (replacement?.status !== 'ok') throw new Error('not replaceable');
    await batchUpdateTransactions({
      updated: [replacement.write],
      exchangeReplacements: new Set([destinationId]),
    });
    const result = await report({ endMonth: '2026-01' });
    expect(rowOf(result, '2026-01', 'K')).toMatchObject({
      reasons: [],
      closing: { native: 31000, basis: 11000, booked: 11000 },
    });
    expect(jRow(result)).toMatchObject({ realized: 1000 });
  });
});

describe('merged sync state written as raw rows', () => {
  /** N8 to N11, V2 and a D7 dangling link, beside a healthy account. */
  function insert(
    id: string,
    account: string,
    amount: number,
    native: number | null,
    fields: { parent?: string; isParent?: boolean; transfer?: string } = {},
  ) {
    db.runQuery(
      `INSERT INTO transactions (id, acct, date, amount, transaction_amount,
         isParent, isChild, parent_id, transferred_id, tombstone, sort_order)
       VALUES (?, ?, 20260105, ?, ?, ?, ?, ?, ?, 0, 0)`,
      [
        id,
        account,
        amount,
        native,
        fields.isParent ? 1 : 0,
        fields.parent ? 1 : 0,
        fields.parent ?? null,
        fields.transfer ?? null,
      ],
    );
  }

  /** An A-to-usd exchange family on A with the given extra children. */
  function family(children: Array<[string, number, number]>, parentNative = 0) {
    const native = children.reduce((sum, [, , n]) => sum + n, -1000);
    const amount = children.reduce((sum, [, b]) => sum + b, -1000);
    insert('p', 'A', amount, parentNative || native, { isParent: true });
    insert('t', 'A', -1000, -1000, { parent: 'p', transfer: 'u' });
    for (const [id, base, n] of children) {
      insert(id, 'A', base, n, { parent: 'p' });
    }
    insert('u', 'usd', 1000, null, { transfer: 't' });
  }

  async function reasonsOf(account = 'A') {
    const result = await report({ endMonth: '2026-01' });
    return rowOf(result, '2026-01', account)?.reasons;
  }

  const ambiguous = [
    { reason: 'exchange-family-ambiguous', since: '2026-01-05' },
  ];

  beforeEach(async () => {
    await standing('JPY', '100');
    await entry('b1', 'B', '2026-01-01', 1000, 1000);
  });

  // The unrelated account B stays clean whatever the family looks like.
  async function expectNeighbourUnaffected() {
    const result = await report({ endMonth: '2026-01' });
    expect(rowOf(result, '2026-01', 'B')).toMatchObject({
      reasons: [],
      closing: { native: 1000, basis: 1000 },
    });
  }

  afterEach(expectNeighbourUnaffected);

  it('N8 a third child', async () => {
    family([
      ['f1', -10, -10],
      ['f2', -10, -10],
    ]);
    expect(await reasonsOf()).toEqual(ambiguous);
  });

  it('N9 a positive non-transfer sibling', async () => {
    family([['f1', 10, 10]]);
    expect(await reasonsOf()).toEqual(ambiguous);
  });

  it('N10 fees on both ends', async () => {
    family([['f1', -10, -10]]);
    db.runQuery(
      "UPDATE transactions SET isChild = 1, parent_id = 'up' WHERE id = 'u'",
    );
    insert('up', 'usd', 990, null, { isParent: true });
    insert('uf', 'usd', -10, null, { parent: 'up' });
    expect(await reasonsOf()).toEqual(ambiguous);
  });

  it('N11 children not summing to the parent', async () => {
    family([['f1', -10, -10]], -1500);
    expect(await reasonsOf()).toEqual(ambiguous);
  });

  it('V2 a same-currency quantity mismatch', async () => {
    insert('x', 'A', -100, -500, { transfer: 'y' });
    insert('y', 'B', 100, 1000, { transfer: 'x' });
    const result = await report({ endMonth: '2026-01' });
    expect(rowOf(result, '2026-01', 'A')!.reasons).toEqual([
      { reason: 'transfer-quantity-mismatch', since: '2026-01-05' },
    ]);
    // B's healthy history ends at the mismatched transfer.
    db.runQuery("DELETE FROM transactions WHERE id IN ('x', 'y')");
  });

  it('D7 a dangling link', async () => {
    insert('x', 'A', -100, -100, { transfer: 'gone' });
    expect(await reasonsOf()).toEqual([
      { reason: 'transfer-link-broken', since: '2026-01-05' },
    ]);
  });
});

describe('bridge parity with MC-8.1', () => {
  async function f1() {
    await standing('JPY', '80');
    await entry('a01', 'A', '2026-01-01', 10000, 10000);
    await entry('a02', 'A', '2026-01-02', 10000, 12000);
    await entry('a03', 'A', '2026-01-03', -5000, -6500);
    await entry('a04', 'A', '2026-01-04', -5000, -5000, 'B');
  }

  async function d1() {
    await standing('JPY', '100');
    await standing('JPY', '80', '2026-01-31');
    await standing('JPY', '100', '2026-02-01');
    await entry('a1', 'A', '2025-12-15', 10000, 10000);
    await entry('a2', 'A', '2026-02-01', 1000, 1000);
  }

  it('F1 matches the walk and the stored cells', async () => {
    await f1();
    await build();
    const result = await expectBridgeParity({ startMonth: '2025-10' });
    for (const month of result.months) {
      if (!month.bridge) continue;
      expect(month.bridge.pending).toBe(false);
      expect(month.bridge.cell).toEqual({
        value: cellOf(month.month, 'fx-changes'),
        incomplete: cellOf(month.month, 'fx-incomplete'),
      });
    }
    expect(rowOf(result, '2026-01', 'A')).toMatchObject({
      realized: 1000,
      carry: -500,
      closing: { basis: 11000, booked: 10500, value: 12500 },
    });
  });

  it('D1 matches the walk', async () => {
    await d1();
    await build();
    const result = await expectBridgeParity({ startMonth: '2025-10' });
    expect(monthOf(result, '2026-01').bridge?.posted).toBe(2500);
    expect(monthOf(result, '2026-02').bridge?.posted).toBe(-2500);
  });

  it('D2 matches the walk with an unresolved close', async () => {
    await fetched('JPY', '100', '2025-12-31');
    await fetched('JPY', '80', '2026-02-14');
    await entry('a1', 'A', '2025-12-15', 10000, 10000);
    await build();
    const result = await expectBridgeParity({ startMonth: '2025-10' });
    expect(monthOf(result, '2026-02').bridge).toMatchObject({
      posted: 2500,
      contribution: 2500,
      cell: { value: 2500, incomplete: false },
      accounts: [expect.objectContaining({ covers: ['2026-01-31'] })],
    });
    expect(monthOf(result, '2026-01').bridge).toMatchObject({
      posted: 0,
      contribution: 0,
      incomplete: true,
    });
  });

  it('D3 matches the walk over cropped created months', async () => {
    await d1();
    await build();
    sheet.get().meta().createdMonths = new Set(['2026-02', '2026-03']);
    const result = await expectBridgeParity({ startMonth: '2026-02' });
    expect(monthOf(result, '2026-02').bridge).toMatchObject({
      posted: -2500,
      broughtForward: 2500,
      contribution: 0,
    });
  });

  it('D2b reports a known partial contribution equal to its cell', async () => {
    await addAccount('K', 'KWD');
    await fetched('JPY', '100', '2025-12-31');
    await fetched('JPY', '80', '2026-02-14');
    await standing('KWD', '0.3');
    await standing('KWD', '0.25', '2026-01-31');
    await entry('a1', 'A', '2025-12-15', 10000, 10000);
    await entry('k1', 'K', '2025-12-15', 30000, 10000);
    await build();
    const result = await report();
    expect(cellOf('2026-01', 'fx-changes')).toBe(2000);
    expect(cellOf('2026-01', 'fx-incomplete')).toBe(true);
    expect(monthOf(result, '2026-01').bridge).toMatchObject({
      posted: 2000,
      contribution: 2000,
      contributionIncomplete: true,
      cell: { value: 2000, incomplete: true },
      pending: false,
    });
    expect(monthOf(result, '2026-02').bridge).toMatchObject({
      contribution: 2500,
      contributionIncomplete: false,
      cell: { value: 2500, incomplete: false },
    });
  });

  it('D4 reports pending until the debounced refresh runs', async () => {
    await d1();
    await build();
    await standing('JPY', '90', '2026-01-31');
    const pending = monthOf(await report(), '2026-01').bridge!;
    expect(pending.pending).toBe(true);
    expect(pending.cell).toEqual({ value: 2500, incomplete: false });
    expect(pending.contribution).toBe(1111);
    await refreshFxChanges();
    await sheet.waitOnSpreadsheet();
    const settled = monthOf(await report(), '2026-01').bridge!;
    expect(settled).toMatchObject({
      pending: false,
      contribution: 1111,
      cell: { value: 1111, incomplete: false },
    });
  });

  it('D5 walks a tracking budget without a cell', async () => {
    await d1();
    await build();
    const envelope = await report();
    sheet.get().meta().budgetType = 'tracking';
    const tracking = await report();
    const january = monthOf(tracking, '2026-01').bridge!;
    expect(january).toMatchObject({
      budgetType: 'tracking',
      cell: null,
      pending: false,
    });
    expect(january.accounts).toEqual(
      monthOf(envelope, '2026-01').bridge!.accounts,
    );
  });
});

describe('the report handler', () => {
  async function f1() {
    await standing('JPY', '80');
    await entry('a01', 'A', '2026-01-01', 10000, 10000);
    await entry('a03', 'A', '2026-01-03', -5000, -6500);
    await entry('a04', 'A', '2026-01-04', -2000, -2000, 'B');
    await build();
  }

  it('is registered as report/fx-impact', async () => {
    await f1();
    const request = {
      startMonth: '2026-01',
      endMonth: '2026-02',
      accountIds: null,
      currencies: null,
    };
    expect(await reportsApp.handlers['report/fx-impact'](request)).toEqual(
      await getFxImpact(request),
    );
  });

  it('reads one snapshot before its first await', async () => {
    await f1();
    const before = await report();
    const pending = report();
    await entry('a05', 'A', '2026-01-10', 5000, 5000);
    expect(await pending).toEqual(before);
    expect(await report()).not.toEqual(before);
  });

  it('writes no messages and no cells', async () => {
    await f1();
    setSyncingMode('enabled');
    onTestFinished(() => {
      setSyncingMode('disabled');
    });
    await entry('a05', 'A', '2026-01-10', 5000, 5000);
    await refreshFxChanges();
    await sheet.waitOnSpreadsheet();
    const count = () =>
      db.runQuery<{ n: number }>(
        'SELECT COUNT(*) AS n FROM messages_crdt',
        [],
        true,
      )[0].n;
    const cells = () =>
      ['2026-01', '2026-02'].map(m => [
        cellOf(m, 'fx-changes'),
        cellOf(m, 'fx-incomplete'),
      ]);
    const [messages, before] = [count(), cells()];
    expect(messages).toBeGreaterThan(0);
    await report();
    await report({ accountIds: ['A'] });
    expect(count()).toBe(messages);
    expect(cells()).toEqual(before);
  });

  it('keeps rows invariant under account selection', async () => {
    await f1();
    const full = await report();
    const ids = ['usd', 'A', 'B'];
    for (let mask = 1; mask < 8; mask++) {
      const selected = ids.filter((_, i) => mask & (1 << i));
      const subset = await report({ accountIds: selected });
      for (const month of subset.months) {
        expect(month.accounts).toEqual(
          monthOf(full, month.month).accounts.filter(a =>
            selected.includes(a.accountId),
          ),
        );
        expect(month.bridge).toEqual(monthOf(full, month.month).bridge);
      }
    }
  });

  it('times a 20,000-event replay without a threshold', async () => {
    await standing('JPY', '100');
    for (let i = 0; i < 20000; i++) {
      const day = String((i % 28) + 1).padStart(2, '0');
      const month = String((i % 12) + 1).padStart(2, '0');
      db.runQuery(
        `INSERT INTO transactions (id, acct, date, amount, transaction_amount,
           isParent, isChild, tombstone, sort_order)
         VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0)`,
        [
          `t${String(i).padStart(5, '0')}`,
          i % 3 === 0 ? 'B' : 'A',
          Number(`2025${month}${day}`),
          i % 4 === 3 ? -90 : 100,
          i % 4 === 3 ? -100 : 100,
        ],
      );
    }
    const started = performance.now();
    const result = await report({ startMonth: '2025-01' });
    const elapsed = performance.now() - started;
    expect(result.months).toHaveLength(14);
    if (process.env.FX_IMPACT_TIMING) {
      writeFileSync(
        process.env.FX_IMPACT_TIMING,
        `20000 events: ${elapsed.toFixed(0)} ms\n`,
      );
    }
  });
});
