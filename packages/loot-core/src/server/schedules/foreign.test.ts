// @ts-strict-ignore
import MockDate from 'mockdate';

import * as connection from '#platform/server/connection';
import { app as accountsApp } from '#server/accounts/app';
import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app as exchangeRatesApp } from '#server/exchange-rates/app';
import { getNormalizedSchedules } from '#server/forecast/forecast-schedules';
import * as prefs from '#server/prefs';
import { app as rulesApp } from '#server/rules/app';
import { app as transactionsApp } from '#server/transactions/app';
import {
  insertRule,
  loadRules,
  updateRule,
} from '#server/transactions/transaction-rules';
import { q } from '#shared/query';

import { advanceSchedulesService, app, createSchedule } from './app';
import { findSchedules } from './find-schedules';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

const monthly = (start: string) => ({
  op: 'isapprox',
  field: 'date',
  value: {
    start,
    frequency: 'monthly',
    patterns: [],
    skipWeekend: false,
    weekendSolveMode: 'after',
    endMode: 'never',
    endOccurrences: 1,
    endDate: start,
  },
});

function scheduleFor(
  account: string | null,
  amount: number,
  { start = '2026-03-05', postsTransaction = false } = {},
) {
  return createSchedule({
    schedule: { posts_transaction: postsTransaction },
    conditions: [
      ...(account ? [{ op: 'is', field: 'account', value: account }] : []),
      monthly(start),
      { op: 'isapprox', field: 'amount', value: amount },
    ] as never,
  });
}

async function saveRate(quoteCurrency: string, rate: string, date: string) {
  await exchangeRatesApp.handlers['exchange-rates/save']({
    quoteCurrency,
    rate,
    kind: 'standing',
    date,
  });
}

const importRows = (
  accountId: string,
  rows: Array<{ date: string; transaction_amount: number; id: string }>,
) =>
  accountsApp.handlers['transactions-import']({
    accountId,
    isPreview: false,
    transactions: rows.map(({ id, ...row }) => ({
      ...row,
      account: accountId,
      imported_id: id,
    })),
  });

const scheduleOf = (importedId: string) =>
  db.firstSync<{ schedule: string | null }>(
    'SELECT schedule FROM v_transactions WHERE imported_id = ?',
    [importedId],
  )?.schedule ?? null;

beforeEach(async () => {
  MockDate.set(new Date(2026, 2, 10));
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
  await db.insertAccount({ id: 'base', name: 'Checking' });
  await db.insertAccount({ id: 'jpy', name: 'Yen', currency: 'JPY' });
  await db.insertAccount({ id: 'kwd', name: 'Dinar', currency: 'KWD' });
  // Tracks schedule condition paths (`_account`, `_amount`).
  app.startServices();
});

afterEach(async () => {
  await app.stopServices();
  MockDate.reset();
  vi.restoreAllMocks();
});

describe('matching foreign schedules', () => {
  it.each([
    ['jpy', 'JPY', '150', -1075, -1076],
    ['kwd', 'KWD', '0.3', -1075, -1076],
  ])(
    'matches %s rows natively within 7.5%%',
    async (account, currency, rate, inside, outside) => {
      await saveRate(currency, rate, '2026-01-01');
      const id = await scheduleFor(account, -1000);
      await importRows(account, [
        { id: 'in', date: '2026-03-05', transaction_amount: inside },
        { id: 'out', date: '2026-03-06', transaction_amount: outside },
      ]);
      expect(scheduleOf('in')).toBe(id);
      expect(scheduleOf('out')).toBeNull();
    },
  );

  it('compares base amounts for schedules without an account', async () => {
    await saveRate('JPY', '1', '2026-01-01');
    await scheduleFor(null, -1000);
    // The row's base is only known after rules, so a base schedule does not
    // match it, even when the native integer is equal.
    await importRows('jpy', [
      { id: 'a', date: '2026-03-05', transaction_amount: -1000 },
    ]);
    expect(scheduleOf('a')).toBeNull();
  });
});

// Tests pin currentDay() to 2017-01-01.
describe('posting foreign schedules', () => {
  async function dueYenSchedule() {
    const id = await scheduleFor('jpy', -1500, {
      start: '2016-12-30',
      postsTransaction: true,
    });
    // Make the 2016-12-30 occurrence due (missed).
    const row = await db.first<{ id: string }>(
      'SELECT id FROM schedules_next_date WHERE schedule_id = ?',
      [id],
    );
    await db.update('schedules_next_date', {
      id: row.id,
      local_next_date: 20161230,
      local_next_date_ts: Date.now(),
      base_next_date: 20161230,
      base_next_date_ts: Date.now(),
    });
    return id;
  }

  const posted = async (id: string) =>
    (
      await aqlQuery(
        q('transactions')
          .filter({ schedule: id })
          .select(['date', 'amount', 'transaction_amount']),
      )
    ).data;

  it('posts a complete pair from the saved rate', async () => {
    await saveRate('JPY', '150', '2016-01-01');
    const id = await dueYenSchedule();
    await advanceSchedulesService(true);
    expect(await posted(id)).toMatchObject([
      { date: '2016-12-30', amount: -1000, transaction_amount: -1500 },
    ]);
  });

  it('converts at the rate for a date set by a rule', async () => {
    await saveRate('JPY', '150', '2016-01-01');
    await saveRate('JPY', '300', '2016-12-31');
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'account', value: 'jpy' }],
      actions: [{ op: 'set', field: 'date', value: '2016-12-31' }],
    });
    const id = await dueYenSchedule();
    await advanceSchedulesService(true);
    expect(await posted(id)).toMatchObject([
      { date: '2016-12-31', amount: -500, transaction_amount: -1500 },
    ]);
  });

  it('keeps every rule action and needs only the final date rate', async () => {
    await saveRate('JPY', '300', '2016-12-31');
    await insertRule({
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'date', value: '2016-12-30' }],
      actions: [
        { op: 'set', field: 'date', value: '2016-12-31' },
        { op: 'set', field: 'notes', value: 'moved' },
      ],
    });
    const id = await dueYenSchedule();
    await advanceSchedulesService(true);
    const { data } = await aqlQuery(
      q('transactions')
        .filter({ schedule: id })
        .select(['date', 'amount', 'transaction_amount', 'notes']),
    );
    expect(data).toMatchObject([
      {
        date: '2016-12-31',
        amount: -500,
        transaction_amount: -1500,
        notes: 'moved',
      },
    ]);
  });

  it('leaves an occurrence unposted and reports it without a rate', async () => {
    const send = vi.spyOn(connection, 'send');
    const id = await dueYenSchedule();
    await advanceSchedulesService(true);
    expect(await posted(id)).toEqual([]);
    expect(send).toHaveBeenCalledWith('schedules-rate-unavailable', {
      schedules: [{ name: null, date: '2016-12-30', currency: 'JPY' }],
    });
    const { data } = await aqlQuery(
      q('schedules').filter({ id }).select(['next_date']),
    );
    expect(data[0].next_date).toBe('2016-12-30');
  });

  it('hands back the ruled draft when the final date has no rate', async () => {
    await insertRule({
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'date', value: '2016-12-30' }],
      actions: [
        { op: 'set', field: 'date', value: '2016-12-31' },
        { op: 'set', field: 'notes', value: 'moved' },
      ],
    });
    const send = vi.spyOn(connection, 'send');
    const id = await dueYenSchedule();
    await advanceSchedulesService(true);
    // The notification names the date that needs a rate.
    expect(send).toHaveBeenCalledWith('schedules-rate-unavailable', {
      schedules: [{ name: null, date: '2016-12-31', currency: 'JPY' }],
    });

    const result = await app.handlers['schedule/post-transaction']({ id });
    if (result?.type !== 'rate-unavailable') throw new Error('posted');
    expect(result.transaction).toMatchObject({
      date: '2016-12-31',
      notes: 'moved',
      transaction_amount: -1500,
      schedule: id,
    });
    // Completing it keeps the rule results without running rules again.
    await expect(
      transactionsApp.handlers['transactions/post-foreign-entry']({
        transaction: result.transaction,
        baseAmount: -1000,
        rulesApplied: true,
      }),
    ).resolves.toMatchObject({ status: 'ok' });
    const { data } = await aqlQuery(
      q('transactions')
        .filter({ schedule: id })
        .select(['date', 'amount', 'notes']),
    );
    expect(data).toMatchObject([
      { date: '2016-12-31', amount: -1000, notes: 'moved' },
    ]);
  });

  it('returns the draft for manual posting without a rate', async () => {
    const id = await dueYenSchedule();
    await expect(
      app.handlers['schedule/post-transaction']({ id, today: true }),
    ).resolves.toEqual({
      type: 'rate-unavailable',
      transaction: expect.objectContaining({
        account: 'jpy',
        transaction_amount: -1500,
        date: '2017-01-01',
        schedule: id,
      }),
      currency: 'JPY',
      precision: 0,
    });
    expect(await posted(id)).toEqual([]);
  });
});

describe('discovering foreign schedules', () => {
  it('finds native schedules per account for a shared payee', async () => {
    const payee = await db.insertPayee({ name: 'Landlord' });
    for (const month of ['2025-12', '2026-01', '2026-02', '2026-03']) {
      await db.insertTransaction({
        account: 'jpy',
        payee,
        date: `${month}-05`,
        amount: -1000,
        transaction_amount: -1500,
      });
      await db.insertTransaction({
        account: 'base',
        payee,
        date: `${month}-05`,
        amount: -2000,
      });
    }

    const found = await findSchedules();
    const monthlyFound = found.filter(
      ({ date }) => date.frequency === 'monthly',
    );
    expect(
      monthlyFound.map(({ account, amount }) => ({ account, amount })),
    ).toEqual(
      expect.arrayContaining([
        { account: 'jpy', amount: -1500 },
        { account: 'base', amount: -2000 },
      ]),
    );
  });
});

describe('foreign schedules in base-only consumers', () => {
  it('leaves foreign schedules out of the forecast', async () => {
    const yen = await scheduleFor('jpy', -1500);
    const base = await scheduleFor('base', -2000);
    const ids = (await getNormalizedSchedules()).map(schedule => schedule.id);
    expect(ids).toContain(base);
    expect(ids).not.toContain(yen);
  });
});

describe('schedule condition paths', () => {
  it('come from the owning rule, not an auxiliary linking rule', async () => {
    const id = await scheduleFor('jpy', -1500);
    // An auxiliary rule linking the same schedule, with conditions in
    // another order and no account.
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [
        { op: 'is', field: 'notes', value: 'rent' },
        { op: 'isapprox', field: 'amount', value: -1500 },
      ],
      actions: [{ op: 'link-schedule', value: id }],
    });
    const { data } = await aqlQuery(
      q('schedules').filter({ id }).select(['_account', '_amount']),
    );
    expect(data[0]).toMatchObject({ _account: 'jpy', _amount: -1500 });
  });
});

describe('foreign schedules (inspection round 1)', () => {
  const owningRule = (scheduleId: string) =>
    db.firstSync<{ rule: string }>('SELECT rule FROM schedules WHERE id = ?', [
      scheduleId,
    ]).rule;

  it('never links a row in another encoding, even through or', async () => {
    await saveRate('JPY', '150', '2026-01-01');
    const id = await scheduleFor('jpy', -1000);
    await updateRule({ id: owningRule(id), conditionsOp: 'or' });
    const result = await accountsApp.handlers['transactions-import']({
      accountId: 'base',
      isPreview: false,
      transactions: [
        {
          account: 'base',
          date: '2026-03-05',
          amount: -500,
          imported_id: 'usd',
        },
      ],
    });
    expect(result.errors).toEqual([]);
    expect(scheduleOf('usd')).toBeNull();
  });

  it('keeps linked transactions compatible when a schedule gains an account', async () => {
    await saveRate('JPY', '150', '2026-01-01');
    const id = await scheduleFor(null, -1000);
    await db.insertTransaction({
      id: 'f',
      account: 'jpy',
      date: '2026-03-05',
      amount: -1000,
      transaction_amount: -1500,
      schedule: id,
    });
    await expect(
      updateRule({
        id: owningRule(id),
        conditions: [
          { op: 'is', field: 'account', value: 'base' },
          monthly('2026-03-05'),
          { op: 'isapprox', field: 'amount', value: -1000 },
        ],
      }),
    ).rejects.toThrow('schedule-currency-mismatch');
  });

  it('rejects amount conditions in the wrong shape', async () => {
    await expect(
      createSchedule({
        conditions: [
          { op: 'is', field: 'account', value: 'jpy' },
          monthly('2026-03-05'),
          { op: 'isbetween', field: 'amount', value: 0 },
        ] as never,
      }),
    ).rejects.toThrow('schedule-amount-invalid');
  });

  it('keeps paths from the owning rule when its link action is removed', async () => {
    const id = await scheduleFor('jpy', -1500);
    await updateRule({
      id: owningRule(id),
      conditions: [
        { op: 'isapprox', field: 'amount', value: -1500 },
        monthly('2026-03-05'),
        { op: 'is', field: 'account', value: 'jpy' },
      ],
      actions: [],
    });
    const { data } = await aqlQuery(
      q('schedules').filter({ id }).select(['_account', '_amount']),
    );
    expect(data[0]).toMatchObject({ _account: 'jpy', _amount: -1500 });
  });

  it('runs preview rules on a native amount without matching base conditions', async () => {
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'amount', value: -1500 }],
      actions: [{ op: 'set', field: 'notes', value: 'base rule' }],
    });
    const ruled = await rulesApp.handlers['rules-run']({
      transaction: {
        id: 'preview/x',
        account: 'jpy',
        date: '2026-03-05',
        amount: -1500,
      } as never,
      amountIsNative: true,
    });
    expect(ruled).toMatchObject({ amount: -1500, transaction_amount: -1500 });
    expect(ruled.notes ?? null).toBeNull();
  });
});

// Tests pin currentDay() to 2017-01-01.
describe('scheduled exchange transfers', () => {
  const payeeFor = async (account: string) =>
    (
      await db.first<{ id: string }>(
        'SELECT id FROM payees WHERE transfer_acct = ?',
        [account],
      )
    )?.id ?? db.insertPayee({ name: '', transfer_acct: account });

  beforeEach(async () => {
    for (const account of ['base', 'jpy', 'kwd']) {
      await payeeFor(account);
    }
  });

  async function dueTransfer(account: string, to: string, amount: number) {
    const id = await createSchedule({
      schedule: { posts_transaction: true },
      conditions: [
        { op: 'is', field: 'account', value: account },
        { op: 'is', field: 'payee', value: await payeeFor(to) },
        monthly('2016-12-30'),
        { op: 'isapprox', field: 'amount', value: amount },
      ] as never,
    });
    const row = await db.first<{ id: string }>(
      'SELECT id FROM schedules_next_date WHERE schedule_id = ?',
      [id],
    );
    await db.update('schedules_next_date', {
      id: row.id,
      local_next_date: 20161230,
      local_next_date_ts: Date.now(),
      base_next_date: 20161230,
      base_next_date_ts: Date.now(),
    });
    return id;
  }

  const legs = async () =>
    (
      await aqlQuery(
        q('transactions')
          .select([
            'account',
            'date',
            'amount',
            'transaction_amount',
            'schedule',
            'notes',
            'cleared',
          ])
          .options({ splits: 'all' }),
      )
    ).data
      .map(row => ({ ...row, schedule: row.schedule ?? null }))
      .sort((a, b) => a.account.localeCompare(b.account));

  const nextDate = async (id: string) =>
    (await aqlQuery(q('schedules').filter({ id }).select(['next_date'])))
      .data[0].next_date;

  it('posts a pair from the saved rate, linked from the schedule account', async () => {
    await saveRate('JPY', '150', '2016-01-01');
    const id = await dueTransfer('base', 'jpy', -10000);
    await advanceSchedulesService(true);
    expect(await legs()).toMatchObject([
      { account: 'base', date: '2016-12-30', amount: -10000, schedule: id },
      {
        account: 'jpy',
        date: '2016-12-30',
        amount: 10000,
        transaction_amount: 15000,
        schedule: null,
      },
    ]);
    expect(await nextDate(id)).toBe('2017-01-30');
  });

  it.each([
    [-15000, -30000, 'jpy'],
    [15000, 30000, 'kwd'],
  ])(
    'values both foreign legs through the budget currency (%i yen)',
    async (yen, dinar, source) => {
      await saveRate('JPY', '150', '2016-01-01');
      await saveRate('KWD', '0.3', '2016-01-01');
      const id = await dueTransfer('jpy', 'kwd', yen);
      await advanceSchedulesService(true);
      const value = Math.sign(yen) * 10000;
      expect(await legs()).toMatchObject([
        {
          account: 'jpy',
          amount: value,
          transaction_amount: yen,
          schedule: id,
        },
        {
          account: 'kwd',
          amount: -value,
          transaction_amount: -dinar,
          schedule: null,
        },
      ]);
      expect(source).toBe(yen < 0 ? 'jpy' : 'kwd');
    },
  );

  it('rounds the estimate to the other account precision', async () => {
    await saveRate('KWD', '0.30751', '2016-01-01');
    await dueTransfer('base', 'kwd', 1001);
    await advanceSchedulesService(true);
    // $10.01 at 0.30751 = 3.0781751 dinar, 3.078 at 3dp.
    expect(await legs()).toMatchObject([
      { account: 'base', amount: 1001 },
      { account: 'kwd', amount: -1001, transaction_amount: -3078 },
    ]);
  });

  it('keeps the occurrence date and stages rule payees', async () => {
    await saveRate('JPY', '150', '2016-01-01');
    await insertRule({
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'account', value: 'base' }],
      actions: [
        { op: 'set', field: 'date', value: '2016-12-29' },
        { op: 'set', field: 'notes', value: 'rent' },
        { op: 'set', field: 'cleared', value: true },
        { op: 'set', field: 'payee_name', value: 'Brand new payee' },
      ],
    });
    const id = await dueTransfer('base', 'jpy', -10000);
    await advanceSchedulesService(true);
    await advanceSchedulesService(true);
    expect(await legs()).toMatchObject([
      {
        account: 'base',
        date: '2016-12-30',
        notes: 'rent',
        cleared: true,
        schedule: id,
      },
      { account: 'jpy', date: '2016-12-30' },
    ]);
    expect(await nextDate(id)).toBe('2017-01-30');
    expect(
      await db.first("SELECT id FROM payees WHERE name = 'Brand new payee'"),
    ).toBeNull();
  });

  it('previews an exchange occurrence as it posts', async () => {
    await insertRule({
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'account', value: 'base' }],
      actions: [
        { op: 'set', field: 'date', value: '2016-12-29' },
        { op: 'set', field: 'notes', value: 'rent' },
        { op: 'set', field: 'payee_name', value: 'Brand new payee' },
      ],
    });
    const payee = await payeeFor('jpy');
    const occurrence = {
      id: 'preview/x',
      account: 'base',
      payee,
      date: '2016-12-30',
      amount: -10000,
      schedule: 'sched',
    };
    const ruled = await rulesApp.handlers['rules-run']({
      transaction: occurrence,
      preview: true,
    } as never);
    expect(ruled).toMatchObject({ ...occurrence, notes: 'rent' });
    expect(
      await db.first("SELECT id FROM payees WHERE name = 'Brand new payee'"),
    ).toBeNull();
  });

  it('runs every rule result on a posted scheduled exchange', async () => {
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'account', value: 'base' }],
      actions: [{ op: 'delete-transaction', value: '' }],
    });
    const ruled = await rulesApp.handlers['rules-run']({
      transaction: {
        id: 'posted',
        account: 'base',
        payee: await payeeFor('jpy'),
        date: '2016-12-30',
        amount: -10000,
        schedule: 'sched',
      },
    } as never);
    expect(ruled).toMatchObject({ tombstone: 1 });
  });

  it('applies a ruled category on the on-budget leg', async () => {
    await saveRate('JPY', '150', '2016-01-01');
    await db.update('accounts', { id: 'jpy', offbudget: 1 });
    const category = await db.insertCategory({
      name: 'Savings',
      cat_group: await db.insertCategoryGroup({ name: 'Group' }),
    });
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'account', value: 'base' }],
      actions: [{ op: 'set', field: 'category', value: category }],
    });
    await dueTransfer('base', 'jpy', -10000);
    await advanceSchedulesService(true);
    const { data } = await aqlQuery(
      q('transactions').select(['account', 'category']),
    );
    expect(
      Object.fromEntries(data.map(row => [row.account, row.category])),
    ).toEqual({ base: category, jpy: null });
  });

  it('leaves the occurrence due and reports missing rates', async () => {
    await saveRate('JPY', '150', '2016-01-01');
    const send = vi.spyOn(connection, 'send');
    const id = await dueTransfer('jpy', 'kwd', -15000);
    await advanceSchedulesService(true);
    expect(await legs()).toEqual([]);
    expect(await nextDate(id)).toBe('2016-12-30');
    expect(send).toHaveBeenCalledWith('schedules-rate-unavailable', {
      schedules: [{ name: null, date: '2016-12-30', currency: 'KWD' }],
    });
    await expect(
      app.handlers['schedule/post-transaction']({ id }),
    ).resolves.toEqual({
      type: 'exchange-unavailable',
      reason: 'rate-unavailable',
      currencies: ['KWD'],
      date: '2016-12-30',
      account: 'jpy',
      other: 'kwd',
      amount: -15000,
      notes: null,
      cleared: false,
      category: null,
      schedule: id,
    });
    expect(await legs()).toEqual([]);
  });

  it('asks for amounts when the estimate rounds to zero', async () => {
    await saveRate('JPY', '10', '2016-01-01');
    const send = vi.spyOn(connection, 'send');
    const id = await dueTransfer('base', 'jpy', -1);
    await advanceSchedulesService(true);
    expect(await legs()).toEqual([]);
    expect(send).toHaveBeenCalledWith('schedules-rate-unavailable', {
      schedules: [
        {
          name: null,
          date: '2016-12-30',
          currency: '',
          estimateUnusable: true,
        },
      ],
    });
    await expect(
      app.handlers['schedule/post-transaction']({ id, today: true }),
    ).resolves.toMatchObject({
      type: 'exchange-unavailable',
      reason: 'estimate-unusable',
      date: '2017-01-01',
    });
  });

  it('completes an occurrence through the exchange handler', async () => {
    const id = await dueTransfer('base', 'jpy', -10000);
    await expect(
      transactionsApp.handlers['transactions/post-exchange-transfer']({
        date: '2016-12-30',
        sourceAccount: 'base',
        destinationAccount: 'jpy',
        sourceAmount: 10300,
        destinationAmount: 15000,
        sourceFee: 300,
        initiatingAccount: 'base',
        schedule: id,
      }),
    ).resolves.toMatchObject({ status: 'ok' });
    // The fee parent is the base account's top-level row.
    const { data } = await aqlQuery(
      q('transactions')
        .filter({ schedule: id })
        .select(['account', 'amount', 'is_parent'])
        .options({ splits: 'all' }),
    );
    expect(data).toEqual([
      expect.objectContaining({
        account: 'base',
        amount: -10300,
        is_parent: true,
      }),
    ]);
    await advanceSchedulesService(true);
    expect(await nextDate(id)).toBe('2017-01-30');
  });

  it('writes nothing when another rule splits the draft', async () => {
    await saveRate('JPY', '150', '2016-01-01');
    const id = await dueTransfer('base', 'jpy', -10000);
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'account', value: 'base' }],
      actions: [
        {
          op: 'set-split-amount',
          value: null,
          options: { splitIndex: 1, method: 'remainder' },
        },
      ],
    });
    await expect(
      app.handlers['schedule/post-transaction']({ id }),
    ).rejects.toThrow('exchange-split-unavailable');
    expect(await legs()).toEqual([]);
  });

  it('posts same-encoding transfers natively with both legs', async () => {
    await db.insertAccount({ id: 'jpy2', name: 'Yen 2', currency: 'JPY' });
    await payeeFor('jpy2');
    await saveRate('JPY', '150', '2016-01-01');
    const id = await dueTransfer('jpy', 'jpy2', -1500);
    await advanceSchedulesService(true);
    expect(await legs()).toMatchObject([
      {
        account: 'jpy',
        amount: -1000,
        transaction_amount: -1500,
        schedule: id,
      },
      { account: 'jpy2', amount: 1000, transaction_amount: 1500 },
    ]);
  });

  it('accepts exchange schedules and rejects what they cannot post', async () => {
    const toJpy = await payeeFor('jpy');
    const conditions = [
      { op: 'is', field: 'account', value: 'base' },
      { op: 'is', field: 'payee', value: toJpy },
      monthly('2026-03-05'),
      { op: 'isapprox', field: 'amount', value: -1000 },
    ];
    const id = await createSchedule({ conditions } as never);
    const rule = db.firstSync<{ rule: string }>(
      'SELECT rule FROM schedules WHERE id = ?',
      [id],
    ).rule;
    const withActions = (actions: Array<Record<string, unknown>>) =>
      updateRule({
        id: rule,
        conditions,
        actions: [{ op: 'link-schedule', value: id }, ...actions],
      } as never);
    await expect(
      withActions([
        {
          op: 'set-split-amount',
          value: 500,
          options: { splitIndex: 1, method: 'fixed-amount' },
        },
      ]),
    ).rejects.toThrow('foreign-split-unavailable');
    const shop = await db.insertPayee({ name: 'Shop' });
    await expect(
      withActions([{ op: 'set', field: 'payee', value: shop }]),
    ).rejects.toThrow('multicurrency-transfer-unavailable');

    // A cross-encoding transfer cannot come from an action.
    const plain = await scheduleFor('base', -1000);
    await expect(
      updateRule({
        id: db.firstSync<{ rule: string }>(
          'SELECT rule FROM schedules WHERE id = ?',
          [plain],
        ).rule,
        actions: [
          { op: 'link-schedule', value: plain },
          { op: 'set', field: 'payee', value: toJpy },
        ],
      } as never),
    ).rejects.toThrow('multicurrency-transfer-unavailable');
    await expect(
      createSchedule({
        conditions: [
          { op: 'is', field: 'account', value: 'base' },
          { op: 'is', field: 'payee', value: toJpy },
          monthly('2026-03-05'),
          {
            op: 'isbetween',
            field: 'amount',
            value: { num1: -500, num2: 500 },
          },
        ],
      } as never),
    ).rejects.toThrow('schedule-amount-invalid');
    // A midpoint of -0.5 posts as zero, as does a missing amount or one
    // given only by a comparison, which posting does not read.
    for (const amount of [
      [{ op: 'isbetween', field: 'amount', value: { num1: -1, num2: 0 } }],
      [],
      [{ op: 'gt', field: 'amount', value: 100 }],
      [
        { op: 'gt', field: 'amount', value: 100 },
        { op: 'is', field: 'amount', value: 0 },
      ],
    ]) {
      await expect(
        createSchedule({
          conditions: [
            { op: 'is', field: 'account', value: 'base' },
            { op: 'is', field: 'payee', value: toJpy },
            monthly('2026-03-05'),
            ...amount,
          ],
        } as never),
      ).rejects.toThrow('schedule-amount-invalid');
    }
  });

  it('accepts a rule linking an exchange schedule without an amount', async () => {
    const id = await scheduleFor('base', -1000);
    const toJpy = await payeeFor('jpy');
    const conditions = [
      { op: 'is', field: 'account', value: 'base' },
      { op: 'is', field: 'payee', value: toJpy },
    ];
    const ruleId = await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions,
      actions: [{ op: 'link-schedule', value: id }],
    } as never);
    await expect(
      updateRule({
        id: ruleId,
        conditions,
        actions: [
          { op: 'link-schedule', value: id },
          { op: 'set', field: 'notes', value: 'transfer' },
        ],
      } as never),
    ).resolves.toBeUndefined();
  });

  it('rejects split actions when an existing exchange schedule is edited', async () => {
    const id = await scheduleFor('base', -1000);
    const toJpy = await payeeFor('jpy');
    const rule = db.firstSync<{ rule: string }>(
      'SELECT rule FROM schedules WHERE id = ?',
      [id],
    ).rule;
    await expect(
      updateRule({
        id: rule,
        conditions: [
          { op: 'is', field: 'account', value: 'base' },
          { op: 'is', field: 'payee', value: toJpy },
          monthly('2026-03-05'),
          { op: 'isapprox', field: 'amount', value: -1000 },
        ],
        actions: [
          { op: 'link-schedule', value: id },
          {
            op: 'set',
            field: 'category',
            value: null,
            options: { splitIndex: 1 },
          },
        ],
      } as never),
    ).rejects.toThrow('foreign-split-unavailable');
  });
});
