import { app as accountsApp } from '#server/accounts/app';
import { createAllBudgets } from '#server/budget/base';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app as exchangeRatesApp } from '#server/exchange-rates/app';
import * as prefs from '#server/prefs';
import { createSchedule } from '#server/schedules/app';
import * as sheet from '#server/sheet';
import { clearUndo, redo, undo } from '#server/undo';
import * as monthUtils from '#shared/months';

import { app } from './app';
import { insertRule, loadRules } from './transaction-rules';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

const post = app.handlers['transactions/post-exchange-transfer'];
const batch = app.handlers['transactions-batch-update'];
const postEntry = app.handlers['transactions/post-foreign-entry'];

type StoredRow = {
  id: string;
  acct: string;
  amount: number;
  transaction_amount: number | null;
  description: string | null;
  transferred_id: string | null;
  isParent: number;
  isChild: number;
  parent_id: string | null;
  category: string | null;
  notes: string | null;
  cleared: number;
};

function rows(account?: string): StoredRow[] {
  return db.runQuery<StoredRow>(
    `SELECT id, acct, amount, transaction_amount, description, transferred_id,
       isParent, isChild, parent_id, category, notes, cleared
       FROM transactions WHERE tombstone = 0
       ${account ? 'AND acct = ?' : ''}
       ORDER BY isParent DESC, transferred_id IS NULL, amount`,
    account ? [account] : [],
    true,
  );
}

function row(id: string) {
  return rows().find(r => r.id === id);
}

function transferPayee(account: string): string {
  const payee = db.firstSync<{ id: string }>(
    'SELECT id FROM payees WHERE transfer_acct = ?',
    [account],
  );
  if (!payee) throw new Error('missing transfer payee');
  return payee.id;
}

function snapshot() {
  return {
    transactions: db.runQuery('SELECT id FROM transactions', [], true).length,
    payees: db.runQuery('SELECT id FROM payees', [], true).length,
    rates: db.runQuery('SELECT id FROM exchange_rates', [], true).length,
  };
}

async function saveRate(quoteCurrency: string, rate: string) {
  await exchangeRatesApp.handlers['exchange-rates/save']({
    quoteCurrency,
    rate,
    kind: 'standing',
    date: '2026-01-01',
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
    { id: 'jpyOff', name: 'Yen savings', currency: 'JPY', offbudget: 1 },
    { id: 'kwd', name: 'Dinar', currency: 'KWD' },
  ]) {
    await db.insertAccount(account);
    await db.insertPayee({ name: '', transfer_acct: account.id });
  }
  await db.insertCategoryGroup({ id: 'group', name: 'Group' });
  await db.insertCategory({ id: 'fees', name: 'Fees', cat_group: 'group' });
  await db.insertCategory({ id: 'saving', name: 'Saving', cat_group: 'group' });
});

const date = '2026-03-10';

describe('posting exchange transfers', () => {
  it('stores opposite base legs and native amounts without a fee', async () => {
    const result = await post({
      date,
      sourceAccount: 'usd',
      destinationAccount: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    if (result.status !== 'ok') throw new Error(result.status);
    const source = row(result.sourceId);
    const destination = row(result.destinationId);
    expect(source).toMatchObject({
      acct: 'usd',
      amount: -10000,
      transaction_amount: null,
      description: transferPayee('jpy'),
      transferred_id: result.destinationId,
      category: null,
    });
    expect(destination).toMatchObject({
      acct: 'jpy',
      amount: 10000,
      transaction_amount: 15000,
      description: transferPayee('usd'),
      transferred_id: result.sourceId,
    });
  });

  it('values a foreign source at the destination base amount', async () => {
    // ¥15,000 at 0.0068 USD per yen: $102.00 received.
    const result = await post({
      date,
      sourceAccount: 'jpy',
      destinationAccount: 'usd',
      sourceAmount: 15000,
      rate: '0.0068',
    });
    if (result.status !== 'ok') throw new Error(result.status);
    expect(row(result.sourceId)).toMatchObject({
      amount: -10200,
      transaction_amount: -15000,
    });
    expect(row(result.destinationId)).toMatchObject({ amount: 10200 });
  });

  it('values two foreign accounts with one rate and falls back', async () => {
    await saveRate('KWD', '0.3');
    // No JPY rate: the destination's KWD rate values the 3dp gross.
    const viaDestination = await post({
      date,
      sourceAccount: 'jpy',
      destinationAccount: 'kwd',
      sourceAmount: 15000,
      destinationAmount: 30750,
    });
    if (viaDestination.status !== 'ok') throw new Error('failed');
    // 30.750 KWD / 0.3 = $102.50.
    expect(row(viaDestination.sourceId)?.amount).toBe(-10250);
    expect(row(viaDestination.destinationId)).toMatchObject({
      amount: 10250,
      transaction_amount: 30750,
    });

    await saveRate('JPY', '150');
    const viaSource = await post({
      date,
      sourceAccount: 'jpy',
      destinationAccount: 'kwd',
      sourceAmount: 15000,
      destinationAmount: 30750,
    });
    if (viaSource.status !== 'ok') throw new Error('failed');
    expect(row(viaSource.destinationId)?.amount).toBe(10000);

    const supplied = await post({
      date,
      sourceAccount: 'jpy',
      destinationAccount: 'kwd',
      sourceAmount: 15000,
      destinationAmount: 30750,
      baseAmount: 9999,
    });
    if (supplied.status !== 'ok') throw new Error('failed');
    expect(row(supplied.sourceId)?.amount).toBe(-9999);
  });

  it('writes nothing without a rate for two foreign accounts', async () => {
    const before = snapshot();
    expect(
      await post({
        date,
        sourceAccount: 'jpy',
        destinationAccount: 'kwd',
        sourceAmount: 15000,
        destinationAmount: 30750,
      }),
    ).toEqual({ status: 'rate-unavailable', currencies: ['JPY', 'KWD'], date });
    expect(snapshot()).toEqual(before);
  });

  it('stores a zero valuation when the principal rounds to zero', async () => {
    await saveRate('JPY', '200');
    const result = await post({
      date,
      sourceAccount: 'jpy',
      destinationAccount: 'kwd',
      sourceAmount: 1,
      destinationAmount: 2,
    });
    if (result.status !== 'ok') throw new Error('failed');
    expect(row(result.sourceId)).toMatchObject({
      amount: 0,
      transaction_amount: -1,
    });
    expect(row(result.destinationId)).toMatchObject({
      amount: 0,
      transaction_amount: 2,
    });
  });

  it('splits a source fee with the transfer leg and conserves totals', async () => {
    const result = await post({
      date,
      sourceAccount: 'jpy',
      destinationAccount: 'usd',
      sourceAmount: 15300,
      sourceFee: 300,
      destinationAmount: 10000,
      feeCategory: 'fees',
    });
    if (result.status !== 'ok') throw new Error('failed');
    const family = rows('jpy');
    const parent = family.find(r => r.isParent);
    const leg = family.find(r => r.transferred_id);
    const fee = family.find(r => r.isChild && !r.transferred_id);
    // The ¥300 fee at the transfer's ¥15,000 = $100.00 is $2.00.
    expect(parent).toMatchObject({
      id: result.sourceId,
      amount: -10200,
      transaction_amount: -15300,
      category: null,
    });
    expect(leg).toMatchObject({
      amount: -10000,
      transaction_amount: -15000,
      parent_id: parent?.id,
    });
    expect(fee).toMatchObject({
      amount: -200,
      transaction_amount: -300,
      category: 'fees',
      parent_id: parent?.id,
    });
    expect(row(result.destinationId)).toMatchObject({
      amount: 10000,
      transferred_id: leg?.id,
    });
  });

  it('splits a destination fee after the gross credit', async () => {
    const result = await post({
      date,
      sourceAccount: 'usd',
      destinationAccount: 'kwd',
      sourceAmount: 10000,
      destinationFee: 250,
      rate: '0.3075',
    });
    if (result.status !== 'ok') throw new Error('failed');
    const family = rows('kwd');
    const parent = family.find(r => r.isParent);
    const leg = family.find(r => r.transferred_id);
    const fee = family.find(r => r.isChild && !r.transferred_id);
    // Gross 30.750 KWD; the 0.250 fee is worth bankersRound(250 × 10000 /
    // 30750) = 81 cents.
    expect(leg).toMatchObject({ amount: 10000, transaction_amount: 30750 });
    expect(fee).toMatchObject({ amount: -81, transaction_amount: -250 });
    expect(parent).toMatchObject({
      id: result.destinationId,
      amount: 9919,
      transaction_amount: 30500,
    });
    expect(row(result.sourceId)).toMatchObject({
      amount: -10000,
      transferred_id: leg?.id,
    });
  });

  it('keeps the category on the on-budget leg in both directions', async () => {
    const toOff = await post({
      date,
      sourceAccount: 'usd',
      destinationAccount: 'jpyOff',
      sourceAmount: 10000,
      destinationAmount: 15000,
      category: 'saving',
    });
    const fromOff = await post({
      date,
      sourceAccount: 'jpyOff',
      destinationAccount: 'usd',
      sourceAmount: 15000,
      destinationAmount: 10000,
      category: 'saving',
    });
    if (toOff.status !== 'ok' || fromOff.status !== 'ok') {
      throw new Error('failed');
    }
    expect(row(toOff.sourceId)?.category).toBe('saving');
    expect(row(toOff.destinationId)?.category).toBeNull();
    expect(row(fromOff.sourceId)?.category).toBeNull();
    expect(row(fromOff.destinationId)?.category).toBe('saving');

    // Between two on-budget accounts no leg has a category.
    const internal = await post({
      date,
      sourceAccount: 'usd',
      destinationAccount: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
      category: 'saving',
    });
    if (internal.status !== 'ok') throw new Error('failed');
    expect(row(internal.sourceId)?.category).toBeNull();
    expect(row(internal.destinationId)?.category).toBeNull();
  });

  it('affects envelopes through on-budget legs and fees only', async () => {
    await sheet.loadSpreadsheet(db);
    await db.insertCategoryGroup({
      id: 'income',
      name: 'Income',
      is_income: 1,
    });
    await createAllBudgets();
    const january = '2017-01-15';
    await post({
      date: january,
      sourceAccount: 'usd',
      destinationAccount: 'jpyOff',
      sourceAmount: 10000,
      destinationAmount: 15000,
      category: 'saving',
    });
    await post({
      date: january,
      sourceAccount: 'jpy',
      destinationAccount: 'usd',
      sourceAmount: 15300,
      sourceFee: 300,
      destinationAmount: 10000,
      feeCategory: 'fees',
    });
    await sheet.waitOnSpreadsheet();
    const spent = (category: string) =>
      sheet.getCellValue(
        monthUtils.sheetForMonth('2017-01'),
        `sum-amount-${category}`,
      );
    expect(spent('saving')).toBe(-10000);
    expect(spent('fees')).toBe(-200);
  });

  it('rejects invalid requests before writing', async () => {
    const before = snapshot();
    const base = {
      date,
      sourceAccount: 'usd',
      destinationAccount: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    };
    await expect(post({ ...base, destinationAccount: 'usd' })).rejects.toThrow(
      'exchange-same-account',
    );
    await expect(
      post({ ...base, destinationAccount: 'usdOff' }),
    ).rejects.toThrow('exchange-not-required');
    await expect(
      post({ ...base, sourceAccount: 'jpy2', destinationAccount: 'jpy' }),
    ).rejects.toThrow('exchange-not-required');
    await expect(
      post({ ...base, sourceFee: 100, destinationFee: 100 }),
    ).rejects.toThrow('exchange-fee-invalid');
    await expect(post({ ...base, baseAmount: 5 })).rejects.toThrow(
      'exchange-amount-invalid',
    );
    await expect(
      post({
        ...base,
        sourceAccount: 'jpy',
        destinationAccount: 'kwd',
        baseAmount: -100,
      }),
    ).rejects.toThrow('exchange-amount-invalid');
    await expect(post({ ...base, rate: '150' })).rejects.toThrow(
      'exchange-amount-invalid',
    );
    await expect(post({ ...base, date: '2026-02-30' })).rejects.toThrow(
      'date-invalid',
    );
    expect(snapshot()).toEqual(before);
  });

  it('keeps only rule notes and cleared on the destination leg', async () => {
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'account', value: 'jpy' }],
      actions: [
        { op: 'set', field: 'notes', value: 'arrived' },
        { op: 'set', field: 'cleared', value: true },
        { op: 'set', field: 'payee_name', value: 'Brand new payee' },
      ],
    });
    const payees = snapshot().payees;
    const result = await post({
      date,
      sourceAccount: 'usd',
      destinationAccount: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    if (result.status !== 'ok') throw new Error('failed');
    expect(row(result.destinationId)).toMatchObject({
      notes: 'arrived',
      cleared: 1,
      description: transferPayee('usd'),
    });
    expect(snapshot().payees).toBe(payees);
  });

  it('keeps entered metadata on the initiating leg', async () => {
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'account', value: 'jpy' }],
      actions: [{ op: 'set', field: 'notes', value: 'from rule' }],
    });
    for (const destinationFee of [undefined, 300]) {
      const result = await post({
        date,
        sourceAccount: 'usd',
        destinationAccount: 'jpy',
        sourceAmount: 10000,
        destinationAmount: 15000,
        destinationFee,
        notes: 'entered',
        cleared: true,
        initiatingAccount: 'jpy',
      });
      if (result.status !== 'ok') throw new Error('failed');
      for (const r of rows('jpy').filter(r => r.notes !== null)) {
        expect(r).toMatchObject({ notes: 'entered', cleared: 1 });
      }
      expect(row(result.destinationId)).toMatchObject({
        notes: 'entered',
        cleared: 1,
      });
      expect(row(result.sourceId)).toMatchObject({ cleared: 0 });
      await batch({
        deleted: [{ id: result.sourceId }, { id: result.destinationId }],
      });
    }
    await expect(
      post({
        date,
        sourceAccount: 'usd',
        destinationAccount: 'jpy',
        sourceAmount: 10000,
        destinationAmount: 15000,
        initiatingAccount: 'kwd',
      }),
    ).rejects.toThrow('account-not-found');
  });

  it('records one undo step and keeps redo after a rejected post', async () => {
    const result = await post({
      date,
      sourceAccount: 'usd',
      destinationAccount: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    if (result.status !== 'ok') throw new Error('failed');
    await undo();
    expect(rows()).toEqual([]);
    await expect(
      post({
        date,
        sourceAccount: 'usd',
        destinationAccount: 'jpy',
        sourceAmount: 10000,
        destinationAmount: -1,
      }),
    ).rejects.toThrow('exchange-amount-invalid');
    await redo();
    expect(rows()).toHaveLength(2);
  });
});

describe('existing exchange legs', () => {
  async function exchange(extra = {}) {
    const result = await post({
      date,
      sourceAccount: 'usd',
      destinationAccount: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
      ...extra,
    });
    if (result.status !== 'ok') throw new Error('failed');
    return result;
  }

  it('rejects generic creation of cross-currency transfers', async () => {
    await expect(
      batch({
        added: [
          {
            id: 'generic',
            account: 'usd',
            date,
            amount: -100,
            payee: transferPayee('jpy'),
          },
        ],
      }),
    ).rejects.toThrow('multicurrency-transfer-unavailable');
    const { sourceId } = await exchange();
    await db.insertTransaction({
      id: 'loose',
      account: 'kwd',
      date,
      amount: 100,
      transaction_amount: 300,
    });
    await expect(
      batch({
        updated: [{ id: 'loose', transfer_id: sourceId }],
        runTransfers: false,
      }),
    ).rejects.toThrow();
  });

  it('accepts metadata edits and syncs notes only', async () => {
    const { sourceId, destinationId } = await exchange();
    await batch({ updated: [{ id: sourceId, notes: 'rent', cleared: true }] });
    expect(row(sourceId)).toMatchObject({ notes: 'rent', cleared: 1 });
    expect(row(destinationId)).toMatchObject({
      notes: 'rent',
      amount: 10000,
      transaction_amount: 15000,
    });
    await batch({ updated: [{ id: destinationId, cleared: true }] });
    expect(row(destinationId)?.cleared).toBe(1);
  });

  it('rejects amount, date and account edits on any leg', async () => {
    const { sourceId, destinationId } = await exchange();
    await expect(
      batch({ updated: [{ id: sourceId, amount: -9000 }] }),
    ).rejects.toThrow('exchange-transfer-edit-unavailable');
    await expect(
      batch({ updated: [{ id: destinationId, date: '2026-03-11' }] }),
    ).rejects.toThrow('exchange-transfer-edit-unavailable');
    await expect(
      batch({ updated: [{ id: sourceId, account: 'usdOff' }] }),
    ).rejects.toThrow('exchange-transfer-edit-unavailable');
  });

  it('unlinks by a payee change and rejects clearing payee and link together', async () => {
    const { sourceId, destinationId } = await exchange();
    await expect(
      // The API sends null to clear both fields.
      batch({
        updated: [{ id: sourceId, payee: null, transfer_id: null } as never],
      }),
    ).rejects.toThrow('exchange-transfer-edit-unavailable');
    expect(row(destinationId)).toBeDefined();

    const ordinary = await db.insertPayee({ name: 'Shop' });
    await batch({ updated: [{ id: sourceId, payee: ordinary }] });
    expect(row(sourceId)).toMatchObject({
      description: ordinary,
      transferred_id: null,
    });
    expect(row(destinationId)).toBeUndefined();
  });

  it('unlinks a fee-family counterpart child when the other leg goes', async () => {
    const { sourceId, destinationId } = await exchange({
      destinationAmount: 14700,
      destinationFee: 300,
    });
    const leg = rows('jpy').find(r => r.transferred_id);
    await batch({ deleted: [{ id: sourceId }] });
    expect(row(leg?.id ?? '')).toMatchObject({
      description: null,
      transferred_id: null,
      transaction_amount: 15000,
    });
    expect(row(destinationId)).toMatchObject({ transaction_amount: 14700 });
  });

  it('deletes a fee family only through its parent', async () => {
    const { sourceId, destinationId } = await exchange({
      sourceAmount: 10300,
      sourceFee: 300,
    });
    const leg = rows('usd').find(r => r.transferred_id);
    await expect(batch({ deleted: [{ id: leg?.id ?? '' }] })).rejects.toThrow(
      'foreign-split-unavailable',
    );
    await batch({ deleted: [{ id: sourceId }] });
    expect(rows('usd')).toEqual([]);
    expect(row(destinationId)).toBeUndefined();
  });

  it('deletes the counterpart of a standalone leg from either end', async () => {
    const first = await exchange();
    await batch({ deleted: [{ id: first.destinationId }] });
    expect(rows()).toEqual([]);
    const second = await exchange();
    await batch({ deleted: [{ id: second.sourceId }] });
    expect(rows()).toEqual([]);
  });

  it('rejects merges with an exchange leg', async () => {
    const { sourceId } = await exchange();
    await db.insertTransaction({
      id: 'other',
      account: 'usd',
      date,
      amount: -10000,
    });
    await expect(
      app.handlers['transactions-merge']([{ id: sourceId }, { id: 'other' }]),
    ).rejects.toThrow('multicurrency-merge-unavailable');
    expect(rows('usd')).toHaveLength(2);
  });

  it('deletes an account with exchange legs from either endpoint', async () => {
    await exchange({ sourceAmount: 10300, sourceFee: 300 });
    await exchange({ destinationAmount: 14700, destinationFee: 300 });
    await accountsApp.handlers['account-close']({ id: 'jpy', forced: true });
    expect(rows('jpy')).toEqual([]);
    for (const r of rows('usd')) {
      expect(r.transferred_id).toBeNull();
    }

    await exchange({ destinationAccount: 'kwd', destinationAmount: 30000 });
    await accountsApp.handlers['account-close']({ id: 'usd', forced: true });
    expect(rows('kwd').every(r => r.transferred_id === null)).toBe(true);
  });
});

describe('exchange guard regressions (inspection round 1)', () => {
  async function exchange(extra = {}) {
    const result = await post({
      date,
      sourceAccount: 'usd',
      destinationAccount: 'jpy',
      sourceAmount: 10300,
      sourceFee: 300,
      destinationAmount: 15000,
      ...extra,
    });
    if (result.status !== 'ok') throw new Error('failed');
    return result;
  }

  it('freezes amounts of base-account fee rows', async () => {
    await exchange();
    const fee = rows('usd').find(r => r.isChild && !r.transferred_id);
    await expect(
      batch({ updated: [{ id: fee?.id ?? '', amount: -500 }] }),
    ).rejects.toThrow('exchange-transfer-edit-unavailable');
    expect(rows('usd').find(r => r.id === fee?.id)?.amount).toBe(-300);
  });

  it('never relinks a leg to another transfer payee', async () => {
    const { destinationId } = await exchange({
      sourceAmount: 10000,
      sourceFee: undefined,
    });
    const source = rows('usd').find(r => r.transferred_id);
    await expect(
      batch({
        updated: [{ id: source?.id ?? '', payee: transferPayee('usdOff') }],
      }),
    ).rejects.toThrow('exchange-transfer-edit-unavailable');
    expect(row(destinationId)?.transferred_id).toBe(source?.id);
  });

  it('allows categories only where envelopes should see them', async () => {
    const internal = await exchange({
      sourceAmount: 10000,
      sourceFee: undefined,
    });
    await expect(
      batch({ updated: [{ id: internal.sourceId, category: 'saving' }] }),
    ).rejects.toThrow('exchange-transfer-edit-unavailable');

    const withFee = await exchange();
    await expect(
      batch({ updated: [{ id: withFee.sourceId, category: 'saving' }] }),
    ).rejects.toThrow('exchange-transfer-edit-unavailable');
    const fee = rows('usd').find(
      r => r.parent_id === withFee.sourceId && !r.transferred_id,
    );
    await batch({ updated: [{ id: fee?.id ?? '', category: 'fees' }] });
    expect(row(fee?.id ?? '')?.category).toBe('fees');

    const toOff = await post({
      date,
      sourceAccount: 'usd',
      destinationAccount: 'jpyOff',
      sourceAmount: 10000,
      destinationAmount: 15000,
    });
    if (toOff.status !== 'ok') throw new Error('failed');
    await batch({ updated: [{ id: toOff.sourceId, category: 'saving' }] });
    expect(row(toOff.sourceId)?.category).toBe('saving');
    await expect(
      batch({ updated: [{ id: toOff.destinationId, category: 'saving' }] }),
    ).rejects.toThrow('exchange-transfer-edit-unavailable');
  });

  it('rejects links to a counterpart deleted in the same request', async () => {
    await db.insertTransaction({
      id: 'a',
      account: 'jpy',
      date,
      amount: -1000,
      transaction_amount: -1500,
    });
    await db.insertTransaction({
      id: 'b',
      account: 'jpy2',
      date,
      amount: 1000,
      transaction_amount: 1500,
    });
    await expect(
      batch({
        updated: [
          { id: 'a', payee: transferPayee('jpy2'), transfer_id: 'b' },
          {
            id: 'b',
            payee: transferPayee('jpy'),
            transfer_id: 'a',
            tombstone: true,
          },
        ],
        runTransfers: false,
      }),
    ).rejects.toThrow('transfer-counterpart-invalid');
    await expect(
      batch({
        updated: [
          { id: 'a', payee: transferPayee('jpy2'), transfer_id: 'b' },
          { id: 'b', payee: transferPayee('jpy'), transfer_id: 'a' },
        ],
        deleted: [{ id: 'b' }],
        runTransfers: false,
      }),
    ).rejects.toThrow('transfer-counterpart-invalid');
  });

  it('checks payees against an unchanged link without the hooks', async () => {
    await db.insertTransaction({
      id: 'a',
      account: 'jpy',
      date,
      amount: -1000,
      transaction_amount: -1500,
    });
    await db.insertTransaction({
      id: 'b',
      account: 'jpy2',
      date,
      amount: 1000,
      transaction_amount: 1500,
    });
    await batch({
      updated: [
        { id: 'a', payee: transferPayee('jpy2'), transfer_id: 'b' },
        { id: 'b', payee: transferPayee('jpy'), transfer_id: 'a' },
      ],
      runTransfers: false,
    });
    await expect(
      batch({
        updated: [{ id: 'a', payee: transferPayee('kwd'), transfer_id: 'b' }],
        runTransfers: false,
      }),
    ).rejects.toThrow();
    expect(row('a')?.description).toBe(transferPayee('jpy2'));
  });

  it('posts scheduled same-encoding transfers from foreign entry', async () => {
    await saveRate('JPY', '150');
    await expect(
      postEntry({
        transaction: {
          id: 'scheduled',
          account: 'jpy',
          date,
          payee: transferPayee('jpy2'),
          schedule: 'some-schedule',
          transaction_amount: -1500,
        },
      }),
    ).resolves.toEqual({ status: 'ok', id: 'scheduled' });
    expect(rows('jpy2')).toMatchObject([{ transaction_amount: 1500 }]);
  });

  it('reports overflowing conversions as invalid amounts', async () => {
    await expect(
      post({
        date,
        sourceAccount: 'usd',
        destinationAccount: 'jpy',
        sourceAmount: Number.MAX_SAFE_INTEGER,
        rate: '150',
      }),
    ).rejects.toThrow('exchange-amount-invalid');
  });
});

describe('same-encoding transfers', () => {
  it('posts both legs from foreign entry and syncs notes', async () => {
    await saveRate('JPY', '150');
    const result = await postEntry({
      transaction: {
        id: 'sent',
        account: 'jpy',
        date,
        payee: transferPayee('jpy2'),
        transaction_amount: -1500,
      },
    });
    expect(result).toEqual({ status: 'ok', id: 'sent' });
    const counterpart = rows('jpy2')[0];
    expect(counterpart).toMatchObject({
      amount: 1000,
      transaction_amount: 1500,
      transferred_id: 'sent',
    });
    expect(row('sent')?.transferred_id).toBe(counterpart.id);

    await batch({ updated: [{ id: 'sent', notes: 'moved' }] });
    expect(row(counterpart.id)?.notes).toBe('moved');
    await batch({ deleted: [{ id: 'sent' }] });
    expect(rows()).toEqual([]);
  });

  it('creates the counterpart through batch updates', async () => {
    await batch({
      added: [
        {
          id: 'sent',
          account: 'jpy',
          date,
          amount: -1000,
          transaction_amount: -1500,
          payee: transferPayee('jpy2'),
        },
      ],
    });
    expect(rows('jpy2')[0]).toMatchObject({
      amount: 1000,
      transaction_amount: 1500,
      transferred_id: 'sent',
    });
  });

  it('checks manual pairs for amounts, reciprocity and ownership', async () => {
    const add = async (
      id: string,
      account: string,
      amount: number,
      native: number,
    ) =>
      db.insertTransaction({
        id,
        account,
        date,
        amount,
        transaction_amount: native,
      });
    await add('a', 'jpy', -1000, -1500);
    await add('b', 'jpy2', 1000, 1600);
    await add('c', 'jpy2', 1000, 1500);
    const pairing = (to: string) => [
      { id: 'a', payee: transferPayee('jpy2'), transfer_id: to },
      { id: to, payee: transferPayee('jpy'), transfer_id: 'a' },
    ];
    await expect(
      batch({ updated: pairing('b'), runTransfers: false }),
    ).rejects.toThrow('transfer-amount-mismatch');
    await expect(
      batch({ updated: [pairing('c')[0]], runTransfers: false }),
    ).rejects.toThrow('transfer-counterpart-invalid');
    await batch({ updated: pairing('c'), runTransfers: false });
    expect(row('a')?.transferred_id).toBe('c');

    // 'c' already belongs to 'a'.
    await add('d', 'jpy', -1000, -1500);
    await expect(
      batch({
        updated: [{ id: 'd', payee: transferPayee('jpy2'), transfer_id: 'c' }],
        runTransfers: false,
      }),
    ).rejects.toThrow('transfer-counterpart-invalid');
  });
});

describe('exchange guard regressions (inspection round 2)', () => {
  async function exchange(extra = {}) {
    const result = await post({
      date,
      sourceAccount: 'usd',
      destinationAccount: 'jpy',
      sourceAmount: 10000,
      destinationAmount: 15000,
      ...extra,
    });
    if (result.status !== 'ok') throw new Error('failed');
    return result;
  }

  it('cleans up after tombstoning updates like deletions', async () => {
    const standalone = await exchange();
    await batch({ updated: [{ id: standalone.sourceId, tombstone: true }] });
    expect(rows()).toEqual([]);

    const withFee = await exchange({ sourceAmount: 10300, sourceFee: 300 });
    await batch({ updated: [{ id: withFee.sourceId, tombstone: true }] });
    expect(rows()).toEqual([]);
  });

  it('accepts metadata patches that repeat an unchanged link', async () => {
    const { sourceId, destinationId } = await exchange();
    await batch({
      updated: [{ id: sourceId, transfer_id: destinationId, notes: 'rent' }],
    });
    expect(row(sourceId)).toMatchObject({
      notes: 'rent',
      transferred_id: destinationId,
    });
  });

  it('writes new scheduled same-encoding transfers with both legs', async () => {
    const schedule = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'jpy' },
        { op: 'isapprox', field: 'date', value: date },
        { op: 'isapprox', field: 'amount', value: -1500 },
      ],
    });
    await expect(
      batch({
        added: [
          {
            id: 'scheduled',
            account: 'jpy',
            date,
            amount: -1000,
            transaction_amount: -1500,
            payee: transferPayee('jpy2'),
            schedule,
          },
        ],
      }),
    ).resolves.toBeTruthy();
    expect(rows('jpy2')).toMatchObject([
      { amount: 1000, transaction_amount: 1500 },
    ]);
  });

  it('validates counterparts of rows an update inserts', async () => {
    const schedule = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'kwd' },
        { op: 'isapprox', field: 'date', value: date },
        { op: 'isapprox', field: 'amount', value: -1500 },
      ],
    });
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'account', value: 'jpy2' }],
      actions: [{ op: 'link-schedule', value: schedule }],
    });
    await expect(
      batch({
        updated: [
          {
            id: 'inserted',
            account: 'jpy',
            date,
            amount: -1000,
            transaction_amount: -1500,
            payee: transferPayee('jpy2'),
          },
        ],
      }),
    ).rejects.toThrow();
    expect(rows()).toEqual([]);
  });

  it('validates added rows with their same-batch updates applied', async () => {
    const schedule = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'kwd' },
        { op: 'isapprox', field: 'date', value: date },
        { op: 'isapprox', field: 'amount', value: -1500 },
      ],
    });
    // The rule matches only the final date.
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [
        { op: 'is', field: 'account', value: 'jpy2' },
        { op: 'is', field: 'date', value: date },
      ],
      actions: [{ op: 'link-schedule', value: schedule }],
    });
    await expect(
      batch({
        added: [
          {
            id: 'sent',
            account: 'jpy',
            date: '2026-03-09',
            amount: -1000,
            transaction_amount: -1500,
            payee: transferPayee('jpy2'),
          },
        ],
        updated: [{ id: 'sent', date }],
      }),
    ).rejects.toThrow();
    expect(rows()).toEqual([]);
  });

  it('gives an added row updated in the same batch one counterpart', async () => {
    await batch({
      added: [
        {
          id: 'sent',
          account: 'jpy',
          date: '2026-03-09',
          amount: -1000,
          transaction_amount: -1500,
          payee: transferPayee('jpy2'),
        },
      ],
      updated: [{ id: 'sent', date }],
    });
    const [counterpart] = rows('jpy2');
    expect(rows('jpy2')).toHaveLength(1);
    expect(counterpart).toMatchObject({ transaction_amount: 1500 });
    expect(rows('jpy')).toMatchObject([
      { id: 'sent', transferred_id: counterpart.id },
    ]);
  });

  it('validates counterparts before writing their source', async () => {
    // A rule on the destination links a schedule in another currency.
    const schedule = await createSchedule({
      conditions: [
        { op: 'is', field: 'account', value: 'kwd' },
        { op: 'isapprox', field: 'date', value: date },
        { op: 'isapprox', field: 'amount', value: -1500 },
      ],
    });
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'account', value: 'jpy2' }],
      actions: [{ op: 'link-schedule', value: schedule }],
    });
    await expect(
      batch({
        added: [
          {
            id: 'sent',
            account: 'jpy',
            date,
            amount: -1000,
            transaction_amount: -1500,
            payee: transferPayee('jpy2'),
          },
        ],
      }),
    ).rejects.toThrow();
    expect(rows()).toEqual([]);
  });
});
