import { app as accountsApp } from '#server/accounts/app';
import { reconcileTransactions } from '#server/accounts/sync';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import * as prefs from '#server/prefs';
import { createSchedule } from '#server/schedules/app';
import { clearUndo, undo } from '#server/undo';

import { app } from './app';
import { preflightTransactionWrites } from './foreign-guard';
import { loadRules } from './transaction-rules';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

const post = app.handlers['transactions/post-exchange-transfer'];
const editExchange = app.handlers['transactions/update-exchange-transfer'];
const getFamily = app.handlers['transactions/get-exchange-family'];
const date = '2026-03-10';

type Row = {
  id: string;
  acct: string;
  amount: number;
  transaction_amount: number | null;
  isParent: number;
  isChild: number;
  parent_id: string | null;
  transferred_id: string | null;
  schedule: string | null;
  cleared: number;
  reconciled: number;
  financial_id: string | null;
  date: number;
};

function rows(account?: string): Row[] {
  return db.runQuery<Row>(
    `SELECT id, acct, amount, transaction_amount, isParent, isChild,
       parent_id, transferred_id, schedule, cleared, reconciled,
       financial_id, date
       FROM transactions WHERE tombstone = 0
       ${account ? 'AND acct = ?' : ''}
       ORDER BY acct, isParent DESC, transferred_id IS NULL, id`,
    account ? [account] : [],
    true,
  );
}

const row = (id: string) => rows().find(r => r.id === id)!;

function familyExpected() {
  return Object.fromEntries(
    rows().map(r => [
      r.id,
      {
        account: r.acct,
        amount: r.amount,
        transaction_amount: r.transaction_amount,
        date: db.fromDateRepr(r.date),
      },
    ]),
  );
}

/** Transfer legs' bases cancel. */
function legBaseTotal() {
  return rows()
    .filter(r => r.transferred_id)
    .reduce((sum, r) => sum + r.amount, 0);
}

async function exchange(input: Record<string, unknown> = {}) {
  const result = await post({
    date,
    sourceAccount: 'usd',
    destinationAccount: 'jpy',
    sourceAmount: 10000,
    destinationAmount: 15000,
    ...input,
  } as never);
  if (result.status !== 'ok') throw new Error('post failed');
  return result;
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
    { id: 'jpy', name: 'Yen', currency: 'JPY' },
    { id: 'kwd', name: 'Dinar', currency: 'KWD' },
    { id: 'jpyOff', name: 'Yen savings', currency: 'JPY', offbudget: 1 },
  ]) {
    await db.insertAccount(account);
    await db.insertPayee({ name: '', transfer_acct: account.id });
  }
});

describe('editing exchange transfers', () => {
  it('edits the received amount, keeping the valuation of the budget side', async () => {
    const { sourceId, destinationId } = await exchange();
    expect(
      await editExchange({
        id: destinationId,
        expected: familyExpected(),
        sourceAmount: 10000,
        destinationAmount: 14000,
      }),
    ).toEqual({ status: 'ok' });
    expect(row(sourceId)).toMatchObject({ amount: -10000 });
    expect(row(destinationId)).toMatchObject({
      amount: 10000,
      transaction_amount: 14000,
    });
    expect(legBaseTotal()).toBe(0);
  });

  it('edits a valuation between two foreign accounts', async () => {
    const result = await post({
      date,
      sourceAccount: 'jpy',
      destinationAccount: 'kwd',
      sourceAmount: 15000,
      destinationAmount: 30750,
      baseAmount: 10000,
    });
    if (result.status !== 'ok') throw new Error('post failed');
    await editExchange({
      id: result.sourceId,
      expected: familyExpected(),
      sourceAmount: 15000,
      destinationAmount: 30750,
      baseAmount: 10200,
    });
    expect(row(result.sourceId)).toMatchObject({
      amount: -10200,
      transaction_amount: -15000,
    });
    expect(row(result.destinationId)).toMatchObject({
      amount: 10200,
      transaction_amount: 30750,
    });
  });

  it('adds a source fee as a new family, moving the schedule link to its parent', async () => {
    const schedule = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'usd' },
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
        { op: 'isapprox', field: 'amount', value: -10000 },
      ] as never,
    });
    const { sourceId } = await exchange({
      schedule,
      initiatingAccount: 'usd',
    });
    await db.updateTransaction({ id: sourceId, cleared: true });
    await db.updateTransaction({ id: sourceId, reconciled: true });
    await editExchange({
      id: sourceId,
      expected: familyExpected(),
      sourceAmount: 10300,
      destinationAmount: 15000,
      sourceFee: 300,
      feeCategory: null,
    });
    const usd = rows('usd');
    expect(usd).toHaveLength(3);
    const [parent, leg, fee] = usd;
    expect(parent).toMatchObject({
      isParent: 1,
      amount: -10300,
      schedule,
      cleared: 1,
      reconciled: 1,
    });
    expect(leg).toMatchObject({
      id: sourceId,
      isChild: 1,
      parent_id: parent.id,
      amount: -10000,
      schedule: null,
    });
    expect(fee).toMatchObject({
      isChild: 1,
      amount: -300,
      cleared: 1,
      reconciled: 1,
    });
    expect(legBaseTotal()).toBe(0);

    await undo();
    expect(rows('usd')).toEqual([
      expect.objectContaining({ id: sourceId, isChild: 0, schedule }),
    ]);
  });

  it('removes a fee, moving the parent identity and state to the leg', async () => {
    const { destinationId } = await exchange({
      sourceAmount: 10300,
      sourceFee: 300,
    });
    const parent = rows('usd').find(r => r.isParent)!;
    // With a fee, the posted source id is the parent; the leg is its child.
    const sourceId = rows('usd').find(r => r.transferred_id)!.id;
    await db.updateTransaction({ id: parent.id, imported_id: 'bank-total' });
    await db.updateTransaction({ id: parent.id, cleared: true });
    await editExchange({
      id: destinationId,
      expected: familyExpected(),
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    expect(rows('usd')).toEqual([
      expect.objectContaining({
        id: sourceId,
        isChild: 0,
        parent_id: null,
        amount: -10000,
        financial_id: 'bank-total',
        cleared: 1,
      }),
    ]);

    // Later file imports and a bank sync of that record match the leg, not
    // the deleted parent, under both reimport-deleted settings.
    for (const reimportDeleted of [false, true]) {
      await accountsApp.handlers['transactions-import']({
        accountId: 'usd',
        isPreview: false,
        transactions: [
          {
            account: 'usd',
            date,
            imported_id: 'bank-total',
            amount: -10000,
            payee_name: `Bank ${reimportDeleted}`,
          },
        ],
        opts: { reimportDeleted },
      });
      expect(
        db.firstSync<{ imported_description: string }>(
          'SELECT imported_description FROM transactions WHERE id = ?',
          [sourceId],
        )!.imported_description,
      ).toMatch(new RegExp(`bank ${reimportDeleted}`, 'i'));
    }
    await reconcileTransactions(
      'usd',
      [
        {
          transactionId: 'bank-total',
          booked: true,
          date,
          payeeName: 'Bank',
          transactionAmount: { amount: '-100.00', currency: 'USD' },
        },
      ],
      { isBankSyncAccount: true },
    );
    expect(rows('usd')).toEqual([expect.objectContaining({ id: sourceId })]);
  });

  it("matches an import to the live row sharing a deleted row's id", async () => {
    await db.insertTransaction({
      id: 'live',
      account: 'usd',
      date,
      amount: -100,
      imported_id: 'shared',
    });
    await db.insertTransaction({
      id: 'deleted',
      account: 'usd',
      date,
      amount: -100,
      imported_id: 'shared',
    });
    await db.deleteTransaction({ id: 'deleted' });
    await accountsApp.handlers['transactions-import']({
      accountId: 'usd',
      isPreview: false,
      transactions: [
        {
          account: 'usd',
          date,
          imported_id: 'shared',
          amount: -100,
          payee_name: 'Bank',
        },
      ],
      opts: { reimportDeleted: false },
    });
    expect(
      db.firstSync<{ imported_description: string | null }>(
        "SELECT imported_description FROM transactions WHERE id = 'live'",
      )!.imported_description,
    ).toBe('Bank');
  });

  it("moves the removed fee parent's notes to the promoted leg", async () => {
    const { destinationId } = await exchange({
      sourceAmount: 10300,
      sourceFee: 300,
      notes: 'trip',
    });
    const parent = rows('usd').find(r => r.isParent)!;
    const leg = rows('usd').find(r => r.transferred_id)!;
    await db.updateTransaction({ id: parent.id, notes: 'holiday' });
    await editExchange({
      id: destinationId,
      expected: familyExpected(),
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    expect(
      db.firstSync<{ notes: string }>(
        'SELECT notes FROM transactions WHERE id = ?',
        [leg.id],
      )!.notes,
    ).toBe('holiday');
  });

  it('keeps a cleared fee parent note cleared when the fee is removed', async () => {
    const { destinationId } = await exchange({
      sourceAmount: 10300,
      sourceFee: 300,
      notes: 'trip',
    });
    const parent = rows('usd').find(r => r.isParent)!;
    const leg = rows('usd').find(r => r.transferred_id)!;
    await db.updateTransaction({ id: parent.id, notes: null });
    await editExchange({
      id: destinationId,
      expected: familyExpected(),
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    expect(
      db.firstSync<{ notes: string | null }>(
        'SELECT notes FROM transactions WHERE id = ?',
        [leg.id],
      )!.notes,
    ).toBeNull();
  });

  it('rejects removing a fee whose child holds an imported fee', async () => {
    const { destinationId } = await exchange({
      sourceAmount: 10300,
      sourceFee: 300,
    });
    const fee = rows('usd').find(r => r.isChild && !r.transferred_id)!;
    await db.updateTransaction({ id: fee.id, imported_id: 'bank-fee' });
    const before = rows();
    await expect(
      editExchange({
        id: destinationId,
        expected: familyExpected(),
        sourceAmount: 10000,
        destinationAmount: 15000,
      }),
    ).rejects.toThrow('foreign-import-identity-conflict');
    expect(rows()).toEqual(before);
  });

  it('adds and removes a destination fee in the foreign account', async () => {
    const { destinationId } = await exchange();
    await editExchange({
      id: destinationId,
      expected: familyExpected(),
      sourceAmount: 10000,
      destinationAmount: 14700,
      destinationFee: 300,
    });
    const jpy = rows('jpy');
    expect(jpy.find(r => r.isParent)).toMatchObject({
      amount: 9800,
      transaction_amount: 14700,
    });
    expect(jpy.find(r => r.id === destinationId)).toMatchObject({
      amount: 10000,
      transaction_amount: 15000,
    });
    expect(jpy.find(r => r.isChild && !r.transferred_id)).toMatchObject({
      amount: -200,
      transaction_amount: -300,
    });
    await editExchange({
      id: destinationId,
      expected: familyExpected(),
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    expect(rows('jpy')).toEqual([
      expect.objectContaining({
        id: destinationId,
        isChild: 0,
        transaction_amount: 15000,
      }),
    ]);
  });

  it('edits by rate between 3dp and 0dp accounts, and undoes', async () => {
    const result = await post({
      date,
      sourceAccount: 'kwd',
      destinationAccount: 'jpy',
      sourceAmount: 30750,
      destinationAmount: 15000,
      baseAmount: 10000,
    });
    if (result.status !== 'ok') throw new Error('post failed');
    const before = rows();
    await editExchange({
      id: result.destinationId,
      expected: familyExpected(),
      sourceAmount: 30750,
      rate: '500',
      baseAmount: 10000,
    });
    expect(row(result.destinationId)).toMatchObject({
      amount: 10000,
      transaction_amount: 15375,
    });
    expect(legBaseTotal()).toBe(0);
    await undo();
    expect(rows()).toEqual(before);
  });

  it('moves every row to a new date and rejects stale views', async () => {
    const { sourceId, destinationId } = await exchange();
    expect(
      await editExchange({
        id: sourceId,
        expected: {
          ...familyExpected(),
          [sourceId]: { ...familyExpected()[sourceId], amount: 1 },
        },
        sourceAmount: 10000,
        destinationAmount: 15000,
      }),
    ).toEqual({ status: 'stale' });
    await editExchange({
      id: sourceId,
      expected: familyExpected(),
      sourceAmount: 10000,
      destinationAmount: 15000,
      date: '2026-03-12',
    });
    expect([row(sourceId).date, row(destinationId).date]).toEqual([
      20260312, 20260312,
    ]);
  });
});

describe('reading an exchange family for editing', () => {
  it('returns the stored values from either side, round-tripping unchanged', async () => {
    const { sourceId, destinationId } = await exchange({
      sourceAmount: 10300,
      sourceFee: 300,
      notes: 'trip',
    });
    const parent = rows('usd').find(r => r.isParent)!;
    for (const id of [sourceId, destinationId, parent.id]) {
      const family = await getFamily({ id });
      expect(family).toMatchObject({
        status: 'ok',
        sourceAccount: 'usd',
        destinationAccount: 'jpy',
        date,
        sourceAmount: 10300,
        destinationAmount: 15000,
        sourceFee: 300,
        destinationFee: 0,
        baseAmount: 10000,
        reconciled: false,
      });
      expect(
        family.status === 'ok' && Object.keys(family.expected),
      ).toHaveLength(4);
    }
    const fromYen = await getFamily({ id: destinationId });
    expect(fromYen).toMatchObject({ selectedSide: 'destination' });
    const before = rows();
    if (fromYen.status !== 'ok') throw new Error('unavailable');
    await editExchange({
      id: destinationId,
      expected: fromYen.expected,
      sourceAmount: fromYen.sourceAmount,
      destinationAmount: fromYen.destinationAmount,
      sourceFee: fromYen.sourceFee,
      destinationFee: fromYen.destinationFee,
    });
    expect(rows()).toEqual(before);
  });

  it('reads a destination fee, a two-foreign valuation and reconciled rows', async () => {
    const result = await post({
      date,
      sourceAccount: 'jpy',
      destinationAccount: 'kwd',
      sourceAmount: 15000,
      destinationAmount: 30000,
      destinationFee: 750,
      baseAmount: 10000,
    });
    if (result.status !== 'ok') throw new Error('post failed');
    const fee = rows('kwd').find(r => r.isChild && !r.transferred_id)!;
    await db.updateTransaction({ id: fee.id, reconciled: true });
    expect(await getFamily({ id: fee.id })).toMatchObject({
      status: 'ok',
      selectedSide: 'destination',
      sourceAmount: 15000,
      destinationAmount: 30000,
      destinationFee: 750,
      baseAmount: 10000,
      reconciled: true,
    });
  });

  it('returns postings and makes a later category change stale', async () => {
    const { sourceId, destinationId } = await exchange();
    const family = await getFamily({ id: destinationId });
    if (family.status !== 'ok') throw new Error('unavailable');
    expect(family.postings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: sourceId,
          account: 'usd',
          amount: -10000,
          isParent: false,
          transferAccount: 'jpy',
        }),
      ]),
    );
    await db.updateTransaction({ id: destinationId, reconciled: true });
    expect(
      await editExchange({
        id: destinationId,
        expected: family.expected,
        sourceAmount: 10000,
        destinationAmount: 14000,
      }),
    ).toEqual({ status: 'stale' });
  });

  it('previews a fee being added without writing', async () => {
    const { sourceId, destinationId } = await exchange();
    const before = rows();
    const preview = await editExchange({
      id: destinationId,
      expected: familyExpected(),
      sourceAmount: 10000,
      destinationAmount: 14700,
      destinationFee: 300,
      preview: true,
    });
    expect(rows()).toEqual(before);
    if (preview.status !== 'preview') throw new Error('no preview');
    expect(preview.postings).toHaveLength(4);
    expect(preview.postings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: sourceId, transferAccount: 'jpy' }),
        expect.objectContaining({ account: 'jpy', isParent: true }),
      ]),
    );
  });

  it('reports broken families and other rows as unavailable', async () => {
    const { destinationId } = await exchange();
    db.runQuery('UPDATE transactions SET transferred_id = NULL WHERE id = ?', [
      destinationId,
    ]);
    expect(await getFamily({ id: destinationId })).toEqual({
      status: 'unavailable',
    });
    expect(await getFamily({ id: 'missing' })).toEqual({
      status: 'unavailable',
    });
  });
});

describe('exchange edit checks (inspection round 1)', () => {
  it('applies a category only to the selected on-budget leg', async () => {
    await db.insertCategoryGroup({ id: 'group', name: 'Group' });
    await db.insertCategory({ id: 'food', name: 'Food', cat_group: 'group' });
    const { sourceId, destinationId } = await exchange({
      destinationAccount: 'jpyOff',
    });
    await editExchange({
      id: destinationId,
      expected: familyExpected(),
      sourceAmount: 10000,
      destinationAmount: 15000,
      category: 'food',
    });
    expect(
      db.firstSync<{ category: string | null }>(
        'SELECT category FROM transactions WHERE id = ?',
        [sourceId],
      )!.category,
    ).toBeNull();
    await editExchange({
      id: sourceId,
      expected: familyExpected(),
      sourceAmount: 10000,
      destinationAmount: 15000,
      category: 'food',
    });
    expect(
      db.firstSync<{ category: string | null }>(
        'SELECT category FROM transactions WHERE id = ?',
        [sourceId],
      )!.category,
    ).toBe('food');
  });

  it.each(['leg', 'fee'])(
    'reports a broken family seen as it is, selected by its %s',
    async which => {
      const { destinationId } = await exchange({
        sourceAmount: 10300,
        sourceFee: 300,
      });
      db.runQuery(
        'UPDATE transactions SET transferred_id = NULL WHERE id = ?',
        [destinationId],
      );
      const usd = rows('usd');
      const selected = usd.find(r =>
        which === 'leg' ? r.transferred_id : r.isChild && !r.transferred_id,
      )!;
      const seen = Object.fromEntries(
        Object.entries(familyExpected()).filter(([id]) =>
          usd.some(r => r.id === id),
        ),
      );
      await expect(
        editExchange({
          id: selected.id,
          expected: seen,
          sourceAmount: 10000,
          destinationAmount: 15000,
        }),
      ).rejects.toThrow('exchange-transfer-edit-unavailable');
    },
  );

  it('rejects an impossible date before writing', async () => {
    const { sourceId } = await exchange();
    const before = rows();
    await expect(
      editExchange({
        id: sourceId,
        expected: familyExpected(),
        sourceAmount: 10000,
        destinationAmount: 15000,
        date: '2026-02-30',
      }),
    ).rejects.toThrow('date-invalid');
    expect(rows()).toEqual(before);
  });

  it('returns stale for a family whose link has gone', async () => {
    const { sourceId, destinationId } = await exchange();
    const seen = familyExpected();
    db.runQuery('UPDATE transactions SET transferred_id = NULL WHERE id = ?', [
      destinationId,
    ]);
    expect(
      await editExchange({
        id: sourceId,
        expected: seen,
        sourceAmount: 10000,
        destinationAmount: 15000,
      }),
    ).toEqual({ status: 'stale' });
  });
});

describe('scoped linked authorizations', () => {
  it('rejects a scoped create for an existing row, whatever it changes', async () => {
    const { destinationId } = await exchange();
    await expect(
      db.insertTransaction(
        { id: destinationId, account: 'jpy', date, notes: 'changed' },
        {
          foreignEdits: new Map([
            [
              destinationId,
              {
                action: 'create',
                final: {
                  account: 'jpy',
                  amount: 10000,
                  transaction_amount: 15000,
                },
              },
            ],
          ]),
        },
      ),
    ).rejects.toThrow('foreign-edit-unavailable');
  });

  it('rejects a budget-currency row written with other values than authorized', async () => {
    await expect(
      db.insertTransaction(
        { id: 'new', account: 'usd', date, amount: -500 },
        {
          foreignEdits: new Map([
            [
              'new',
              {
                action: 'create',
                final: {
                  account: 'usd',
                  amount: -300,
                  transaction_amount: null,
                },
              },
            ],
          ]),
        },
      ),
    ).rejects.toThrow('foreign-edit-unavailable');
  });

  it('rejects a scoped create naming a missing account', async () => {
    await expect(
      db.insertTransaction(
        { id: 'new', account: 'missing-account', date, amount: -500 },
        {
          foreignEdits: new Map([
            [
              'new',
              {
                action: 'create',
                final: {
                  account: 'usd',
                  amount: -300,
                  transaction_amount: null,
                },
              },
            ],
          ]),
        },
      ),
    ).rejects.toThrow('foreign-edit-unavailable');
    expect(db.firstSync("SELECT 1 FROM transactions WHERE id = 'new'")).toBe(
      null,
    );
  });

  it('rejects deleting a row under an update authorization', async () => {
    await exchange({ sourceAmount: 10300, sourceFee: 300 });
    const parent = rows('usd').find(r => r.isParent)!;
    const seen = familyExpected()[parent.id];
    const update = new Map([
      [
        parent.id,
        {
          action: 'update' as const,
          expected: seen,
          final: {
            account: 'usd',
            amount: seen.amount,
            transaction_amount: null,
          },
        },
      ],
    ]);
    await expect(
      preflightTransactionWrites(
        { deleted: [{ id: parent.id }] },
        { foreignEdits: update },
      ),
    ).rejects.toThrow('foreign-split-unavailable');
    await expect(
      db.updateTransaction(
        { id: parent.id, tombstone: true },
        { foreignEdits: update },
      ),
    ).rejects.toThrow('foreign-edit-unavailable');
    expect(row(parent.id)).toBeDefined();
  });

  it('rejects a scoped leg update that unlinks the transfer', async () => {
    const { destinationId } = await exchange();
    const seen = familyExpected()[destinationId];
    await expect(
      db.updateTransaction(
        { id: destinationId, transfer_id: null },
        {
          foreignEdits: new Map([
            [
              destinationId,
              {
                action: 'update',
                expected: seen,
                final: {
                  account: 'jpy',
                  amount: seen.amount,
                  transaction_amount: seen.transaction_amount,
                },
              },
            ],
          ]),
        },
      ),
    ).rejects.toThrow('foreign-edit-unavailable');
    expect(row(destinationId).transferred_id).not.toBeNull();
  });

  it('rejects deleting a family row that changed since it was read', async () => {
    await exchange({ sourceAmount: 10300, sourceFee: 300 });
    const fee = rows('usd').find(r => r.isChild && !r.transferred_id)!;
    await expect(
      preflightTransactionWrites(
        { deleted: [{ id: fee.id }] },
        {
          foreignEdits: new Map([
            [
              fee.id,
              {
                action: 'delete',
                expected: {
                  account: 'usd',
                  amount: -1,
                  transaction_amount: null,
                  date,
                },
              },
            ],
          ]),
        },
      ),
    ).rejects.toThrow('foreign-split-unavailable');
  });

  it('rejects deleting a changed fee parent with its family', async () => {
    await exchange({ sourceAmount: 10300, sourceFee: 300 });
    const parent = rows('usd').find(r => r.isParent)!;
    const fee = rows('usd').find(r => r.isChild && !r.transferred_id)!;
    const stale = {
      account: 'usd',
      amount: parent.amount + 1,
      transaction_amount: null,
      date,
    };
    await expect(
      preflightTransactionWrites(
        { deleted: [{ id: parent.id }, { id: fee.id }] },
        {
          foreignEdits: new Map([
            [parent.id, { action: 'delete', expected: stale }],
            [
              fee.id,
              {
                action: 'delete',
                expected: { ...stale, amount: fee.amount },
              },
            ],
          ]),
        },
      ),
    ).rejects.toThrow('foreign-split-unavailable');
  });

  it('rejects creating a row whose id already exists', async () => {
    const { destinationId } = await exchange();
    await expect(
      db.insertTransaction(
        {
          id: destinationId,
          account: 'jpy',
          date,
          amount: 1,
          transaction_amount: 1,
        },
        {
          foreignEdits: new Map([
            [
              destinationId,
              {
                action: 'create',
                final: { account: 'jpy', amount: 1, transaction_amount: 1 },
              },
            ],
          ]),
        },
      ),
    ).rejects.toThrow();
    expect(row(destinationId)).toMatchObject({ transaction_amount: 15000 });
  });
});
