import { Timestamp } from '@actual-app/crdt';

import { app as accountsApp } from '#server/accounts/app';
import { createAllBudgets } from '#server/budget/base';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app as exchangeRatesApp } from '#server/exchange-rates/app';
import * as prefs from '#server/prefs';
import { createSchedule } from '#server/schedules/app';
import * as sheet from '#server/sheet';
import { applyMessages } from '#server/sync';
import { deriveAllCoupledCells } from '#server/sync/coupled-cells';
import { batchUpdateTransactions } from '#server/transactions';
import { app as transactionsApp } from '#server/transactions/app';
import { insertRule, loadRules } from '#server/transactions/transaction-rules';
import { clearUndo, undo } from '#server/undo';
import * as monthUtils from '#shared/months';

import { reconcileTransactions } from './sync';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

const post = transactionsApp.handlers['transactions/post-exchange-transfer'];
const batch = transactionsApp.handlers['transactions-batch-update'];
const merge = transactionsApp.handlers['transactions-merge'];
const date = '2026-03-10';

type Leg = {
  id: string;
  acct: string;
  amount: number;
  transaction_amount: number | null;
  amount_pair: string | null;
  financial_id: string | null;
  date: number;
};

function rows(account?: string): Leg[] {
  return db.runQuery<Leg>(
    `SELECT id, acct, amount, transaction_amount, amount_pair, financial_id,
       date FROM transactions WHERE tombstone = 0
       ${account ? 'AND acct = ?' : ''} ORDER BY acct, amount`,
    account ? [account] : [],
    true,
  );
}

const row = (id: string) => rows().find(r => r.id === id);

function transferPayee(account: string): string {
  const payee = db.firstSync<{ id: string }>(
    'SELECT id FROM payees WHERE transfer_acct = ?',
    [account],
  );
  if (!payee) throw new Error('missing transfer payee');
  return payee.id;
}

const FOREIGN = new Set(['jpy', 'jpy2', 'kwd']);

/** Posts an occurrence of a schedule on `scheduleAccount` as the handler does. */
async function scheduled({
  from,
  to,
  sourceAmount,
  destinationAmount,
  scheduleAccount = from,
  amount = {
    op: 'isapprox',
    value: scheduleAccount === from ? -sourceAmount : destinationAmount,
  },
  destinationFee,
  category,
  on = date,
}: {
  from: string;
  to: string;
  sourceAmount: number;
  destinationAmount: number;
  scheduleAccount?: string;
  amount?: { op: string; value: unknown };
  destinationFee?: number;
  category?: string;
  on?: string;
}) {
  const other = scheduleAccount === from ? to : from;
  const schedule = await createSchedule({
    conditions: [
      { op: 'is', field: 'account', value: scheduleAccount },
      { op: 'is', field: 'payee', value: transferPayee(other) },
      {
        op: 'isapprox',
        field: 'date',
        value: {
          start: on,
          frequency: 'monthly',
          patterns: [],
          skipWeekend: false,
          weekendSolveMode: 'after',
          endMode: 'never',
          endOccurrences: 1,
          endDate: on,
        },
      },
      { field: 'amount', ...amount },
    ] as never,
  });
  const result = await post({
    date: on,
    sourceAccount: from,
    destinationAccount: to,
    sourceAmount,
    destinationAmount,
    destinationFee,
    category,
    initiatingAccount: scheduleAccount,
    schedule,
  });
  if (result.status !== 'ok') throw new Error('post failed');
  return { schedule, ...result };
}

function importInto(
  account: string,
  imports: Array<{ id: string; amount: number; on?: string }>,
) {
  return accountsApp.handlers['transactions-import']({
    accountId: account,
    isPreview: false,
    transactions: imports.map(({ id, amount, on = '2026-03-12' }) => ({
      account,
      date: on,
      imported_id: id,
      payee_name: 'Bank',
      ...(FOREIGN.has(account) ? { transaction_amount: amount } : { amount }),
    })),
  });
}

beforeEach(async () => {
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
  clearUndo();
  for (const account of [
    { id: 'usd', name: 'Checking' },
    { id: 'usdOff', name: 'Brokerage', offbudget: 1 },
    { id: 'jpy', name: 'Yen', currency: 'JPY' },
    { id: 'jpy2', name: 'Yen 2', currency: 'JPY' },
    { id: 'kwd', name: 'Dinar', currency: 'KWD' },
  ]) {
    await db.insertAccount(account);
    await db.insertPayee({ name: '', transfer_acct: account.id });
  }
  await db.insertCategoryGroup({ id: 'group', name: 'Group' });
  await db.insertCategory({ id: 'saving', name: 'Saving', cat_group: 'group' });
  // New rows in foreign accounts take their base from a saved rate.
  for (const [quoteCurrency, rate] of [
    ['JPY', '150'],
    ['KWD', '0.3075'],
  ]) {
    await exchangeRatesApp.handlers['exchange-rates/save']({
      quoteCurrency,
      rate,
      kind: 'standing',
      date: '2016-01-01',
    });
  }
});

describe('replacing scheduled exchange estimates', () => {
  it('replaces the other account estimate from a file import', async () => {
    const { destinationId } = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    await importInto('jpy', [{ id: 'b1', amount: 14870 }]);
    expect(rows('jpy')).toEqual([
      expect.objectContaining({
        id: destinationId,
        amount: 10000,
        transaction_amount: 14870,
        financial_id: 'b1',
        date: 20260310,
      }),
    ]);
    expect(rows('usd')).toMatchObject([{ amount: -10000 }]);
  });

  it('derives the foreign base when the budget leg is replaced', async () => {
    const { sourceId, destinationId } = await scheduled({
      from: 'jpy',
      to: 'usd',
      sourceAmount: 15000,
      destinationAmount: 10000,
    });
    await importInto('usd', [{ id: 'b1', amount: 9950 }]);
    expect(row(destinationId)).toMatchObject({ amount: 9950 });
    expect(row(sourceId)).toMatchObject({
      amount: -9950,
      transaction_amount: -15000,
    });
  });

  it('matches a bank sync row', async () => {
    const { destinationId } = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    await reconcileTransactions(
      'jpy',
      [
        {
          transactionId: 's1',
          booked: true,
          date: '2026-03-12',
          payeeName: 'Bank',
          transactionAmount: { amount: '14870', currency: 'JPY' },
        },
      ],
      { isBankSyncAccount: true },
    );
    expect(rows('jpy')).toEqual([
      expect.objectContaining({
        id: destinationId,
        transaction_amount: 14870,
        financial_id: 's1',
      }),
    ]);
  });

  it.each([
    // [destination, estimate, imported, replaced]: 7.5% of the estimate.
    ['jpy', 15000, 13875, true],
    ['jpy', 15000, 13874, false],
    ['kwd', 30750, 28444, true],
    ['kwd', 30750, 28443, false],
  ])(
    'compares %s imports within 7.5%% (%i, %i)',
    async (to, estimate, imported, replaced) => {
      const { destinationId } = await scheduled({
        from: 'usd',
        to,
        sourceAmount: 10000,
        destinationAmount: estimate,
      });
      await importInto(to, [{ id: 'b1', amount: imported }]);
      expect(row(destinationId)?.transaction_amount).toBe(
        replaced ? imported : estimate,
      );
      expect(rows(to)).toHaveLength(replaced ? 1 : 2);
    },
  );

  it.each([
    ['usd', 9250, true],
    ['usd', 9249, false],
  ])(
    'compares 2dp imports within 7.5%% (%s %i)',
    async (to, imported, replaced) => {
      const { destinationId } = await scheduled({
        from: 'jpy',
        to,
        sourceAmount: 15000,
        destinationAmount: 10000,
      });
      await importInto(to, [{ id: 'b1', amount: imported }]);
      expect(row(destinationId)?.amount).toBe(replaced ? imported : 10000);
    },
  );

  it('uses the schedule amount on the schedule account leg', async () => {
    const range = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
      amount: { op: 'isbetween', value: { num1: -11000, num2: -9000 } },
    });
    await importInto('usd', [{ id: 'b1', amount: -10900 }]);
    expect(row(range.sourceId)).toMatchObject({ amount: -10900 });
    expect(row(range.destinationId)).toMatchObject({
      amount: 10900,
      transaction_amount: 15000,
    });

    const exact = await scheduled({
      from: 'usd',
      to: 'jpy2',
      sourceAmount: 20000,
      destinationAmount: 30000,
      amount: { op: 'is', value: -20000 },
    });
    await importInto('usd', [{ id: 'b2', amount: -20100 }]);
    expect(row(exact.sourceId)).toMatchObject({ amount: -20000 });
  });

  it('leaves ambiguous, mismatched and imported estimates alone', async () => {
    for (let i = 0; i < 2; i++) {
      await scheduled({
        from: 'usd',
        to: 'jpy',
        sourceAmount: 10000,
        destinationAmount: 15000,
      });
    }
    await importInto('jpy', [
      { id: 'b1', amount: 14870 },
      // Wrong sign, and outside the window.
      { id: 'b2', amount: -14870 },
      { id: 'b3', amount: 14870, on: '2026-03-20' },
    ]);
    expect(rows('jpy').map(r => r.transaction_amount)).toEqual([
      -14870, 14870, 14870, 15000, 15000,
    ]);
  });

  it('ignores the import when the exchange has a reconciled leg', async () => {
    const { sourceId, destinationId } = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    await db.updateTransaction({ id: sourceId, reconciled: true });
    await importInto('jpy', [{ id: 'b1', amount: 14870 }]);
    expect(rows('jpy')).toEqual([
      expect.objectContaining({
        id: destinationId,
        transaction_amount: 15000,
        financial_id: null,
      }),
    ]);
  });

  it('replaces a pending amount when the booked row arrives', async () => {
    const { destinationId } = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    await importInto('jpy', [{ id: 'p1', amount: 14870 }]);
    await importInto('jpy', [{ id: 'p1', amount: 14910 }]);
    expect(rows('jpy')).toEqual([
      expect.objectContaining({ id: destinationId, transaction_amount: 14910 }),
    ]);
  });

  it('keeps exchange dates when imports update dates', async () => {
    const { destinationId } = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    await reconcileTransactions(
      'jpy',
      [
        {
          account: 'jpy',
          date: '2026-03-12',
          imported_id: 'b1',
          payee_name: 'Bank',
          transaction_amount: 15000,
        },
      ],
      { updateDates: true },
    );
    await reconcileTransactions(
      'jpy',
      [
        {
          account: 'jpy',
          date: '2026-03-13',
          imported_id: 'b1',
          payee_name: 'Bank',
          transaction_amount: 14900,
        },
      ],
      { updateDates: true },
    );
    expect(row(destinationId)).toMatchObject({
      date: 20260310,
      transaction_amount: 14900,
      financial_id: 'b1',
    });
  });

  it.each([[['fee', 'principal']], [['principal', 'fee']]])(
    'matches fee family rows without replacing them (%j)',
    async order => {
      await scheduled({
        from: 'usd',
        to: 'jpy',
        sourceAmount: 10000,
        destinationAmount: 15000,
        destinationFee: 300,
      });
      const before = rows('jpy').map(r => r.transaction_amount);
      const amounts: Record<string, number> = { principal: 15300, fee: -300 };
      await importInto(
        'jpy',
        order.map(kind => ({ id: kind, amount: amounts[kind] })),
      );
      expect(rows('jpy').map(r => r.transaction_amount)).toEqual(before);
    },
  );

  it('previews the replacement and can import the row as new', async () => {
    const { destinationId } = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    const incoming = {
      account: 'jpy',
      date: '2026-03-12',
      imported_id: 'b1',
      payee_name: 'Bank',
      transaction_amount: 14870,
    };
    const preview = await reconcileTransactions('jpy', [incoming], {
      isPreview: true,
    });
    expect(preview.updatedPreview).toEqual([
      expect.objectContaining({
        existing: expect.objectContaining({ id: destinationId, amount: 15000 }),
      }),
    ]);
    expect(row(destinationId)?.transaction_amount).toBe(15000);

    await reconcileTransactions('jpy', [
      { ...incoming, forceAddTransaction: true },
    ]);
    expect(rows('jpy').map(r => r.transaction_amount)).toEqual([14870, 15000]);
  });

  it('keeps exchange amounts frozen outside a replacement', async () => {
    const { destinationId } = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    await expect(
      batch({
        updated: [
          { id: destinationId, amount: 10000, transaction_amount: 14870 },
        ],
      }),
    ).rejects.toThrow();
    expect(row(destinationId)?.transaction_amount).toBe(15000);
  });
});

describe('scheduled exchange replacement guards (inspection round 1)', () => {
  it('ignores any match while a family row is reconciled', async () => {
    const { sourceId, destinationId } = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    await db.updateTransaction({ id: sourceId, reconciled: true });
    // An exact amount matches through the ordinary passes.
    await importInto('jpy', [{ id: 'b1', amount: 15000 }]);
    expect(row(destinationId)).toMatchObject({ financial_id: null });
    expect(rows('jpy')).toHaveLength(1);
  });

  it('adds a booked row the replacement cannot take', async () => {
    const { destinationId } = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    await importInto('jpy', [{ id: 'p1', amount: 14870 }]);
    await importInto('jpy', [{ id: 'p1', amount: -14870 }]);
    expect(row(destinationId)?.transaction_amount).toBe(14870);
    expect(rows('jpy').map(r => r.transaction_amount)).toEqual([-14870, 14870]);
  });

  it('ignores a rejected replacement while a family row is reconciled', async () => {
    const { sourceId, destinationId } = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    await importInto('jpy', [{ id: 'p1', amount: 14870 }]);
    await db.updateTransaction({ id: sourceId, reconciled: true });
    await importInto('jpy', [{ id: 'p1', amount: -14870 }]);
    expect(rows('jpy')).toEqual([
      expect.objectContaining({ id: destinationId, transaction_amount: 14870 }),
    ]);
  });

  it('keeps the leg category, notes and payee', async () => {
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'account', value: 'jpy' }],
      actions: [
        { op: 'set', field: 'category', value: 'saving' },
        { op: 'set', field: 'notes', value: 'from the bank' },
      ],
    });
    const { destinationId } = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    const before = db.firstSync<{
      category: string | null;
      notes: string | null;
      description: string | null;
    }>('SELECT category, notes, description FROM transactions WHERE id = ?', [
      destinationId,
    ]);
    await importInto('jpy', [{ id: 'b1', amount: 14870 }]);
    expect(row(destinationId)?.transaction_amount).toBe(14870);
    expect(
      db.firstSync(
        'SELECT category, notes, description FROM transactions WHERE id = ?',
        [destinationId],
      ),
    ).toEqual(before);
  });

  it('keeps the merged row identity on the leg', async () => {
    const { destinationId } = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    await importInto('jpy', [{ id: 'p1', amount: 14870 }]);
    await importInto('jpy', [{ id: 'b2', amount: 14950, on: '2026-04-01' }]);
    const imported = rows('jpy').find(r => r.financial_id === 'b2');
    await merge([{ id: imported!.id }, { id: destinationId }]);
    expect(row(destinationId)).toMatchObject({
      transaction_amount: 14950,
      financial_id: 'b2',
    });
  });

  it('rejects scoped writes outside an eligible replacement', async () => {
    const unscheduled = await post({
      date,
      sourceAccount: 'jpy',
      destinationAccount: 'kwd',
      sourceAmount: 15000,
      destinationAmount: 30750,
      baseAmount: 10000,
    });
    if (unscheduled.status !== 'ok') throw new Error('post failed');
    await expect(
      batchUpdateTransactions({
        updated: [
          {
            id: unscheduled.destinationId,
            amount: 10000,
            transaction_amount: 30000,
          },
        ],
        exchangeReplacements: new Set([unscheduled.destinationId]),
      }),
    ).rejects.toThrow();

    // A scheduled leg may not change its base between foreign accounts.
    const { destinationId } = await scheduled({
      from: 'jpy',
      to: 'kwd',
      sourceAmount: 15000,
      destinationAmount: 30750,
    });
    const base = row(destinationId)!.amount;
    await expect(
      batchUpdateTransactions({
        updated: [
          { id: destinationId, amount: base + 1, transaction_amount: 30000 },
        ],
        exchangeReplacements: new Set([destinationId]),
      }),
    ).rejects.toThrow();
    expect(row(destinationId)).toMatchObject({
      amount: base,
      transaction_amount: 30750,
    });
  });
});

describe('scheduled exchange replacements under sync', () => {
  const pairMessage = (id: string, pair: string) => {
    const timestamp = Timestamp.send();
    if (!timestamp) throw new Error('clock unavailable');
    return {
      dataset: 'transactions',
      row: id,
      column: 'amount_pair',
      value: pair,
      timestamp,
    };
  };

  it.each(['local first', 'remote first'])(
    'keeps replacements of opposite legs (%s)',
    async order => {
      const { sourceId, destinationId } = await scheduled({
        from: 'usd',
        to: 'jpy',
        sourceAmount: 10000,
        destinationAmount: 15000,
      });
      // Another device replaced the yen leg from its own stale state.
      const remote = () =>
        applyMessages([pairMessage(destinationId, '10000:14870')]);
      if (order === 'remote first') await remote();
      await importInto('usd', [{ id: 'b1', amount: -10100 }]);
      if (order === 'local first') await remote();
      expect(row(sourceId)).toMatchObject({ amount: -10100 });
      expect(row(destinationId)).toMatchObject({
        amount: 10100,
        transaction_amount: 14870,
      });
    },
  );

  it('derives bases again on load', async () => {
    const { destinationId } = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    await importInto('usd', [{ id: 'b1', amount: -10100 }]);
    // A device replaying the messages holds the leg's own stale pair.
    db.runQuery('UPDATE transactions SET amount = 10000 WHERE id = ?', [
      destinationId,
    ]);
    deriveAllCoupledCells();
    expect(row(destinationId)).toMatchObject({ amount: 10100 });
  });

  it('keeps the derived valuation when the foreign leg is unlinked', async () => {
    const { destinationId } = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    await importInto('usd', [{ id: 'b1', amount: -10100 }]);
    await db.updateTransaction(
      { id: destinationId, transfer_id: null, payee: null },
      { transferCleanup: true },
    );
    deriveAllCoupledCells();
    expect(row(destinationId)).toMatchObject({
      amount: 10100,
      amount_pair: '10100:15000',
    });
  });

  it('restores the derived base on undo', async () => {
    const { destinationId } = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    await importInto('usd', [{ id: 'b1', amount: -10100 }]);
    await undo();
    expect(row(destinationId)).toMatchObject({ amount: 10000 });
  });

  it('updates category sums through the derived leg', async () => {
    await sheet.loadSpreadsheet(db);
    await db.insertCategoryGroup({
      id: 'income',
      name: 'Income',
      is_income: 1,
    });
    await createAllBudgets();
    await scheduled({
      from: 'usdOff',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
      category: 'saving',
      on: '2017-01-15',
    });
    await importInto('usdOff', [
      { id: 'b1', amount: -10100, on: '2017-01-16' },
    ]);
    await sheet.waitOnSpreadsheet();
    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth('2017-01'),
        'sum-amount-saving',
      ),
    ).toBe(10100);
  });
});

describe('merging an import into a scheduled exchange', () => {
  it('confirms the estimate and keeps undo', async () => {
    const { destinationId } = await scheduled({
      from: 'usd',
      to: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    // Too late for automatic matching.
    await importInto('jpy', [{ id: 'late', amount: 14870, on: '2026-04-01' }]);
    const imported = rows('jpy').find(r => r.financial_id === 'late');
    await merge([{ id: imported!.id }, { id: destinationId }]);
    expect(rows('jpy')).toEqual([
      expect.objectContaining({
        id: destinationId,
        transaction_amount: 14870,
        financial_id: 'late',
      }),
    ]);
    await undo();
    expect(rows('jpy')).toHaveLength(2);
    expect(row(destinationId)?.transaction_amount).toBe(15000);
  });

  it('keeps a zero valuation between foreign accounts', async () => {
    const schedule = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'jpy' },
        { op: 'is', field: 'payee', value: transferPayee('kwd') },
        {
          op: 'isapprox',
          field: 'date',
          value: {
            start: date,
            frequency: 'monthly',
            patterns: [],
            skipWeekend: false,
            weekendSolveMode: 'after',
            endMode: 'never',
            endOccurrences: 1,
            endDate: date,
          },
        },
        { op: 'isapprox', field: 'amount', value: -1 },
      ] as never,
    });
    const posted = await post({
      date,
      sourceAccount: 'jpy',
      destinationAccount: 'kwd',
      sourceAmount: 1,
      destinationAmount: 2,
      baseAmount: 0,
      initiatingAccount: 'jpy',
      schedule,
    });
    if (posted.status !== 'ok') throw new Error('post failed');
    await importInto('kwd', [{ id: 'late', amount: 3, on: '2026-04-01' }]);
    const imported = rows('kwd').find(r => r.financial_id === 'late');
    await merge([{ id: imported!.id }, { id: posted.destinationId }]);
    expect(row(posted.destinationId)).toMatchObject({
      amount: 0,
      transaction_amount: 3,
    });
    expect(row(posted.sourceId)).toMatchObject({ amount: 0 });
  });

  it('keeps rejecting other exchange merges', async () => {
    const unscheduled = await post({
      date,
      sourceAccount: 'usd',
      destinationAccount: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    if (unscheduled.status !== 'ok') throw new Error('post failed');
    await importInto('jpy', [{ id: 'late', amount: 14870, on: '2026-04-01' }]);
    const imported = rows('jpy').find(r => r.financial_id === 'late');
    await expect(
      merge([{ id: imported!.id }, { id: unscheduled.destinationId }]),
    ).rejects.toThrow('multicurrency-merge-unavailable');
  });
});
