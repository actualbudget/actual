// @ts-strict-ignore
import * as d from 'date-fns';

import { reconcileTransactions } from '#server/accounts/sync';
import * as db from '#server/db';
import * as prefs from '#server/prefs';
import { amountToInteger } from '#shared/util';

import { parseFile } from './parse-file';

beforeEach(global.emptyDatabase());

// libofx spits out errors that contain the entire
// source code of the file in the stack which makes
// it hard to test.
const old = console.warn;
beforeAll(() => {
  console.warn = vi.fn();
});
afterAll(() => {
  console.warn = old;
});

type Transaction = {
  id: string;
  amount: number;
  date: string;
  payee_name: string;
  imported_payee: string;
  notes: string | null;
  category?: string | null;
};

async function getTransactions(accountId: string): Promise<Transaction[]> {
  return db.runQuery(
    'SELECT * FROM transactions WHERE acct = ?',
    [accountId],
    true,
  );
}

async function importFileWithRealTime(
  accountId,
  filepath,
  dateFormat?: string,
  options?: { importNotes: boolean },
) {
  // Emscripten requires a real Date.now!
  global.restoreDateNow();
  const { errors, transactions: originalTransactions } = await parseFile(
    filepath,
    options,
  );
  global.restoreFakeDateNow();

  let transactions = originalTransactions;
  if (transactions) {
    // oxlint-disable-next-line typescript/no-explicit-any
    transactions = (transactions as any[]).map(trans => ({
      ...trans,
      amount: amountToInteger(trans.amount),
      date: dateFormat
        ? d.format(d.parse(trans.date, dateFormat, new Date()), 'yyyy-MM-dd')
        : trans.date,
    }));
  }
  if (errors.length > 0) {
    return { errors, added: [] };
  }

  const { added } = await reconcileTransactions(accountId, transactions);
  return { errors, added };
}

describe('File import', () => {
  test('qif import works', async () => {
    await prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });
    const { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../../mocks/files/data.qif',
      'MM/dd/yy',
      { importNotes: true },
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  });

  test('qif import preserves categories', async () => {
    const { errors, transactions } = await parseFile(
      __dirname + '/../../../mocks/files/qif-category.qif',
    );

    expect(errors.length).toBe(0);
    expect(transactions).toMatchObject([
      { payee_name: 'Outlet', category: 'Shopping' },
      { payee_name: 'GroceriesYou', category: 'Groceries' },
    ]);
  });

  test('ofx import works', async () => {
    await prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    const { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../../mocks/files/data.ofx',
      null,
      { importNotes: true },
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  }, 45000);

  test('ofx import works (credit card)', async () => {
    await prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    const { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../../mocks/files/credit-card.ofx',
      null,
      { importNotes: true },
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  }, 45000);

  test('qfx import works', async () => {
    await prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    const { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../../mocks/files/data.qfx',
      null,
      { importNotes: true },
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  }, 45000);

  test('import notes are respected when importing', async () => {
    await prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    // Test with importNotes enabled
    const { errors: errorsWithNotes } = await importFileWithRealTime(
      'one',
      __dirname + '/../../../mocks/files/data.ofx',
      null,
      { importNotes: true },
    );
    expect(errorsWithNotes.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot(
      'transactions with notes',
    );

    // Clear transactions
    db.runQuery('DELETE FROM transactions WHERE acct = ?', ['one']);

    // Test with importNotes disabled
    const { errors: errorsWithoutNotes } = await importFileWithRealTime(
      'one',
      __dirname + '/../../../mocks/files/data.ofx',
      null,
      { importNotes: false },
    );
    expect(errorsWithoutNotes.length).toBe(0);
    const transactionsWithoutNotes = await getTransactions('one');
    expect(transactionsWithoutNotes.every(t => t.notes === null)).toBe(true);
  }, 45000);

  test('matches extensions correctly (case-insensitive, etc)', async () => {
    await prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    let res = await importFileWithRealTime(
      'one',
      __dirname + '/../../../mocks/files/best.data-ever$.QFX',
    );
    expect(res.errors.length).toBe(0);

    res = await importFileWithRealTime(
      'one',
      __dirname + '/../../../mocks/files/big.data.QiF',
      'MM/dd/yy',
    );
    expect(res.errors.length).toBe(0);

    res = await importFileWithRealTime('one', 'foo.txt');
    expect(res.errors.length).toBe(1);
    expect(res.errors[0].message).toBe('Invalid file type');
  }, 45000);

  test('handles non-ASCII characters', async () => {
    await prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    const { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../../mocks/files/8859-1.qfx',
      'yyyy-MM-dd',
      { importNotes: true },
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  });

  test('handles windows-1252 charset', async () => {
    await prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    const { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../../mocks/files/1252.qfx',
      'yyyy-MM-dd',
      { importNotes: true },
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  });

  test('handles UTF-8 encoding', async () => {
    await prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    const { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../../mocks/files/utf-8.qfx',
      'yyyy-MM-dd',
      { importNotes: true },
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  });

  test('handles html escaped plaintext', async () => {
    await prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    const { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../../mocks/files/html-vals.qfx',
      'yyyy-MM-dd',
      { importNotes: true },
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  });

  test('CAMT.053 import works', async () => {
    await prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    const { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../../mocks/files/camt/camt.053.xml',
      null,
      { importNotes: true },
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  });

  test('csv import works (utf-16le bank export)', async () => {
    const { errors, transactions } = await parseFile(
      __dirname + '/../../../mocks/files/utf-16le.csv',
      { hasHeaderRow: true },
    );

    expect(errors.length).toBe(0);
    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      'Könyvelés dátuma': '2025.12.04',
      Összeg: '100',
      Devizanem: 'HUF',
    });
  });

  test('csv import works (utf-16be)', async () => {
    const { errors, transactions } = await parseFile(
      __dirname + '/../../../mocks/files/utf-16be.csv',
      { hasHeaderRow: true },
    );

    expect(errors.length).toBe(0);
    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      'Könyvelés dátuma': '2025.12.04',
      Összeg: '100',
      Devizanem: 'HUF',
    });
  });

  test('csv import works (utf-8 with bom)', async () => {
    const { errors, transactions } = await parseFile(
      __dirname + '/../../../mocks/files/utf-8-bom.csv',
      { hasHeaderRow: true },
    );

    expect(errors.length).toBe(0);
    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      'Könyvelés dátuma': '2025.12.04',
      Összeg: '100',
      Devizanem: 'HUF',
    });
  });

  test('csv import skips start lines on utf-16le files', async () => {
    const { errors, transactions } = await parseFile(
      __dirname + '/../../../mocks/files/utf-16le.csv',
      { hasHeaderRow: false, skipStartLines: 1 },
    );

    expect(errors.length).toBe(0);
    expect(transactions).toHaveLength(2);
    const rows = transactions as string[][];
    expect(rows[0][0]).toBe('tariff package name');
  });

  test('csv import respects manual encoding override', async () => {
    const { errors, transactions } = await parseFile(
      __dirname + '/../../../mocks/files/windows-1252.csv',
      { hasHeaderRow: true, encoding: 'windows-1252' },
    );

    expect(errors.length).toBe(0);
    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      Date: '2025.12.04',
      Payee: 'Café Rémy',
      Amount: '100.25',
    });
    expect(transactions[1]).toMatchObject({
      Date: '2025.12.05',
      Payee: 'Boulangerie Müller',
      Amount: '-42.10',
    });
  });

  test('csv import auto-detects utf-16le without bom', async () => {
    const { errors, transactions } = await parseFile(
      __dirname + '/../../../mocks/files/utf-16le-nobom.csv',
      { hasHeaderRow: true },
    );

    expect(errors.length).toBe(0);
    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      'Könyvelés dátuma': '2025.12.04',
      Összeg: '100',
      Devizanem: 'HUF',
    });
  });

  test('csv import auto-detects utf-16be without bom', async () => {
    const { errors, transactions } = await parseFile(
      __dirname + '/../../../mocks/files/utf-16be-nobom.csv',
      { hasHeaderRow: true },
    );

    expect(errors.length).toBe(0);
    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      'Könyvelés dátuma': '2025.12.04',
      Összeg: '100',
      Devizanem: 'HUF',
    });
  });

  test('csv import auto-detects windows-1252', async () => {
    const { errors, transactions } = await parseFile(
      __dirname + '/../../../mocks/files/windows-1252.csv',
      { hasHeaderRow: true },
    );

    expect(errors.length).toBe(0);
    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      Date: '2025.12.04',
      Payee: 'Café Rémy',
      Amount: '100.25',
    });
    expect(transactions[1]).toMatchObject({
      Date: '2025.12.05',
      Payee: 'Boulangerie Müller',
      Amount: '-42.10',
    });
  });

  test('csv import keeps utf-8 with a corrupted byte', async () => {
    const { errors, transactions } = await parseFile(
      __dirname + '/../../../mocks/files/utf-8-corrupted.csv',
      { hasHeaderRow: true },
    );

    expect(errors.length).toBe(0);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      Date: '2025.12.04',
      Payee: 'Café R\uFFFDémy',
      Amount: '100.25',
    });
  });

  test('csv import does not misdetect utf-8 with nul padding as utf-16', async () => {
    const { errors, transactions } = await parseFile(
      __dirname + '/../../../mocks/files/utf-8-nuls.csv',
      { hasHeaderRow: true, skipEndLines: 1 },
    );

    expect(errors.length).toBe(0);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      Date: '2025.12.04',
      Payee: 'Café Rémy',
      Amount: '100.25',
    });
  });

  test('csv import does not misdetect utf-8 with dense nul padding as utf-16', async () => {
    const { errors, transactions } = await parseFile(
      __dirname + '/../../../mocks/files/utf-8-nul-padding.csv',
      { hasHeaderRow: true, skipEndLines: 1 },
    );

    expect(errors.length).toBe(0);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      Date: '2025.12.04',
      Payee: 'Café Rémy',
      Amount: '100.25',
    });
  });

  test('csv import treats explicit auto encoding as detection', async () => {
    const { errors, transactions } = await parseFile(
      __dirname + '/../../../mocks/files/utf-16le.csv',
      { hasHeaderRow: true, encoding: 'auto' },
    );

    expect(errors.length).toBe(0);
    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      'Könyvelés dátuma': '2025.12.04',
      Összeg: '100',
      Devizanem: 'HUF',
    });
  });

  test('csv import rejects an invalid encoding', async () => {
    const { errors, transactions } = await parseFile(
      __dirname + '/../../../mocks/files/utf-8-bom.csv',
      { hasHeaderRow: true, encoding: 'not-an-encoding' },
    );

    expect(errors.length).toBe(1);
    expect(transactions).toHaveLength(0);
    expect(errors[0].message).toContain('Failed parsing');
  });

  test('CAMT import respects ISO-8859-1 encoding', async () => {
    const { errors, transactions } = await parseFile(
      __dirname + '/../../../mocks/files/camt/camt.latin1.xml',
      { importNotes: true },
    );
    expect(errors.length).toBe(0);
    expect(transactions).toMatchObject([
      { notes: 'M-Überschusssparen' },
      {
        payee_name: 'Grüße aus München',
        notes: 'Restaurant Schrödingers Katze und Café Ünique',
      },
    ]);
  });
});
