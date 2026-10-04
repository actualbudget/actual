import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import { app as exchangeRatesApp } from '#server/exchange-rates/app';
import * as prefs from '#server/prefs';
import { app as transactionsApp } from '#server/transactions/app';
import { insertRule, loadRules } from '#server/transactions/transaction-rules';
import type { ImportTransactionEntity } from '#types/models';

import { app } from './app';

vi.mock('#server/main', () => ({ getDefaultDocumentDir: vi.fn() }));

// Rows omit `account`; the import account is applied to each.
const importTransactions = ({
  transactions,
  ...args
}: Omit<
  Parameters<(typeof app.handlers)['transactions-import']>[0],
  'transactions'
> & {
  transactions: Array<Omit<ImportTransactionEntity, 'account'>>;
}) =>
  app.handlers['transactions-import']({
    ...args,
    transactions: transactions.map(t => ({ ...t, account: args.accountId })),
  });

async function saveRate(quoteCurrency: string, rate: string) {
  await exchangeRatesApp.handlers['exchange-rates/save']({
    quoteCurrency,
    rate,
    kind: 'standing',
    date: '2000-01-01',
  });
}

const rows = () =>
  db.runQuery<{
    acct: string;
    amount: number;
    transaction_amount: number | null;
    imported_id: string | null;
  }>(
    'SELECT acct, amount, transaction_amount, financial_id AS imported_id FROM transactions WHERE tombstone = 0 ORDER BY date, amount',
    [],
    true,
  );

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
  await db.insertAccount({ id: 'jpy', name: 'Yen', currency: 'JPY' });
  await db.insertAccount({ id: 'jpy2', name: 'Yen 2', currency: 'JPY' });
  await db.insertAccount({ id: 'kwd', name: 'Dinar', currency: 'KWD' });
});

describe('importing into foreign accounts', () => {
  it('completes native rows at the saved rate', async () => {
    await saveRate('JPY', '150');
    const result = await importTransactions({
      accountId: 'jpy',
      isPreview: false,
      transactions: [
        { date: '2026-03-01', transaction_amount: -1500, imported_id: 'a' },
      ],
    });
    expect(result.errors).toEqual([]);
    expect(rows()).toEqual([
      {
        acct: 'jpy',
        amount: -1000,
        transaction_amount: -1500,
        imported_id: 'a',
      },
    ]);
  });

  it('keeps a supplied pair without needing a rate', async () => {
    await importTransactions({
      accountId: 'kwd',
      isPreview: false,
      transactions: [
        { date: '2026-03-01', amount: -500, transaction_amount: -1234 },
      ],
    });
    expect(rows()).toMatchObject([{ amount: -500, transaction_amount: -1234 }]);
  });

  it('lists the dates that need a rate and writes nothing', async () => {
    const result = await importTransactions({
      accountId: 'jpy',
      isPreview: false,
      transactions: [
        { date: '2026-03-02', transaction_amount: -1500 },
        { date: '2026-03-01', transaction_amount: -3000 },
      ],
    });
    expect(result.errors).toEqual([
      { message: 'rate-unavailable: 2026-03-01, 2026-03-02' },
    ]);
    expect(rows()).toEqual([]);
  });

  it('rejects base-only rows and splits for foreign accounts', async () => {
    for (const transactions of [
      [{ date: '2026-03-01', amount: -1000 }],
      [
        {
          date: '2026-03-01',
          transaction_amount: -1500,
          subtransactions: [{ amount: -1000, transaction_amount: -1500 }],
        },
      ],
    ]) {
      const result = await importTransactions({
        accountId: 'jpy',
        isPreview: false,
        transactions: transactions as never,
      });
      expect(result.errors).toHaveLength(1);
    }
    expect(rows()).toEqual([]);
  });

  it('shows resolved bases in the preview', async () => {
    await saveRate('JPY', '150');
    const result = await importTransactions({
      accountId: 'jpy',
      isPreview: true,
      transactions: [{ date: '2026-03-01', transaction_amount: -1500 }],
    });
    expect(result.previewBases?.map(p => p.baseAmount)).toEqual([-1000]);
    expect(rows()).toEqual([]);
  });

  it('previews a matched foreign row in native units', async () => {
    await saveRate('JPY', '150');
    const row = {
      date: '2026-03-01',
      transaction_amount: -1500,
      imported_id: 'm',
      cleared: false,
    };
    await importTransactions({
      accountId: 'jpy',
      isPreview: false,
      transactions: [row],
    });
    const preview = await importTransactions({
      accountId: 'jpy',
      isPreview: true,
      transactions: [{ ...row, cleared: true, notes: 'changed' }],
    });
    expect(preview.updatedPreview[0]?.existing?.amount).toBe(-1500);
    // At 3dp the preview keeps the stored integer, not major units.
    await saveRate('KWD', '0.3');
    const kwdRow = { ...row, transaction_amount: -1234, imported_id: 'k' };
    await importTransactions({
      accountId: 'kwd',
      isPreview: false,
      transactions: [kwdRow],
    });
    const kwdPreview = await importTransactions({
      accountId: 'kwd',
      isPreview: true,
      transactions: [{ ...kwdRow, cleared: true, notes: 'changed' }],
    });
    expect(kwdPreview.updatedPreview[0]?.existing?.amount).toBe(-1234);
  });

  it('matches repeated imports on native amounts in the final account', async () => {
    await saveRate('JPY', '150');
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'imported_payee', value: 'Move' }],
      actions: [{ op: 'set', field: 'account', value: 'jpy2' }],
    });
    const batch = [
      {
        date: '2026-03-01',
        transaction_amount: -1500,
        imported_id: 'x',
        payee_name: 'Move',
      },
      { date: '2026-03-01', transaction_amount: -3000, payee_name: 'Move' },
    ];
    for (let i = 0; i < 2; i++) {
      await importTransactions({
        accountId: 'jpy',
        isPreview: false,
        transactions: batch.map(t => ({ ...t })),
      });
    }
    expect(rows().map(r => [r.acct, r.transaction_amount])).toEqual([
      ['jpy2', -3000],
      ['jpy2', -1500],
    ]);
  });

  it('rejects a rule move to an account with another encoding', async () => {
    await saveRate('JPY', '150');
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'imported_payee', value: 'Move' }],
      actions: [{ op: 'set', field: 'account', value: 'kwd' }],
    });
    const result = await importTransactions({
      accountId: 'jpy',
      isPreview: false,
      transactions: [
        { date: '2026-03-01', transaction_amount: -1500, payee_name: 'Move' },
      ],
    });
    expect(result.errors).toEqual([{ message: 'rule-account-incompatible' }]);
    expect(rows()).toEqual([]);
  });

  it('does not match a base amount condition against a guessed base', async () => {
    await saveRate('JPY', '150');
    await insertRule({
      stage: null,
      conditionsOp: 'and',
      conditions: [{ op: 'is', field: 'amount', value: -1000 }],
      actions: [{ op: 'set', field: 'notes', value: 'matched' }],
    });
    await importTransactions({
      accountId: 'jpy',
      isPreview: false,
      transactions: [
        { date: '2026-03-01', transaction_amount: -1500 },
        { date: '2026-03-02', amount: -1000, transaction_amount: -1500 },
      ],
    });
    expect(
      db.runQuery('SELECT notes FROM transactions ORDER BY date', [], true),
    ).toEqual([{ notes: null }, { notes: 'matched' }]);
  });
});

describe('parsing files for foreign accounts', () => {
  it('parses QIF amounts at the target account precision', async () => {
    const { mkdtempSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const filepath = join(mkdtempSync(join(tmpdir(), 'mc-qif-')), 'kwd.qif');
    writeFileSync(filepath, '!Type:Bank\nD03/01/2026\nT-1.234\nPShop\n^\n');
    const parse = transactionsApp.handlers['transactions-parse-file'];
    const parsed = await parse({
      filepath,
      options: { dateFormat: 'MM/dd/yyyy' } as never,
      accountId: 'kwd',
    });
    expect(parsed.transactions?.[0]).toMatchObject({ amount: -1.234 });
    const budgetParsed = await parse({
      filepath,
      options: { dateFormat: 'MM/dd/yyyy' } as never,
    });
    expect(budgetParsed.transactions?.[0]).toMatchObject({ amount: -1234 });
  });
});
