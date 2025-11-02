// @ts-strict-ignore
import * as d from 'date-fns';

import { amountToInteger } from '../../../shared/util';
import { reconcileTransactions } from '../../accounts/sync';
import * as db from '../../db';
import * as prefs from '../../prefs';

import { parseFile } from './parse-file';

beforeEach(global.emptyDatabase());

// libofx spits out errors that contain the entire
// source code of the file in the stack which makes
// it hard to test.
const old = console.warn;
beforeAll(() => {
  console.warn = () => {};
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
};

async function getTransactions(accountId: string): Promise<Transaction[]> {
  return await db.runQuery(
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    prefs.loadPrefs();
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

  test('ofx import works', async () => {
    prefs.loadPrefs();
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
    prefs.loadPrefs();
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
    prefs.loadPrefs();
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
    prefs.loadPrefs();
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
    await db.runQuery('DELETE FROM transactions WHERE acct = ?', ['one']);

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
    prefs.loadPrefs();
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
    prefs.loadPrefs();
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

  test('handles html escaped plaintext', async () => {
    prefs.loadPrefs();
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
    prefs.loadPrefs();
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
});

describe('CSV file encoding', () => {
  const encodingTests = [
    {
      encoding: 'utf-8',
      file: 'data_utf8.csv',
      expected: [
        { Date: '2024-01-01', Payee: 'Café René', Amount: '42.50' },
        { Date: '2024-01-02', Payee: 'Müller GmbH', Amount: '-15.75' },
        { Date: '2024-01-03', Payee: 'Søren Ågård', Amount: '100.00' },
      ],
    },
    {
      encoding: 'windows-1252',
      file: 'data_windows1252.csv',
      expected: [
        { Date: '2024-02-01', Payee: 'Café de Paris', Amount: '50.25' },
        { Date: '2024-02-02', Payee: 'François Dubois', Amount: '-20.00' },
        { Date: '2024-02-03', Payee: 'Maître Jean', Amount: '75.50' },
      ],
    },
    {
      encoding: 'euc-jp',
      file: 'data_euc-jp.csv',
      expected: [
        { Date: '2024-03-01', Payee: '山田下社', Amount: '-30.00' },
        { Date: '2024-03-02', Payee: '東京スーパー', Amount: '45.75' },
        { Date: '2024-03-03', Payee: '山中純一', Amount: '120.00' },
      ],
    },
    {
      encoding: 'euc-kr',
      file: 'data_euc-kr.csv',
      expected: [
        { Date: '2024-04-01', Payee: '서울식품', Amount: '-25.50' },
        { Date: '2024-04-02', Payee: '김지후', Amount: '60.00' },
        { Date: '2024-04-03', Payee: '부산마트', Amount: '88.25' },
      ],
    },
    {
      encoding: 'gb18030',
      file: 'data_gb18030.csv',
      expected: [
        { Date: '2024-05-01', Payee: '北京餐厅', Amount: '-35.00' },
        { Date: '2024-05-02', Payee: '上海超市', Amount: '55.50' },
        { Date: '2024-05-03', Payee: '张伟', Amount: '95.75' },
      ],
    },
  ] as const;

  encodingTests.forEach(({ encoding, file, expected }) => {
    test(`decodes ${encoding} correctly`, async () => {
      const { errors, transactions } = await parseFile(
        __dirname + `/../../../mocks/files/${file}`,
        { encoding, hasHeaderRow: true },
      );

      expect(errors).toEqual([]);
      expect(transactions).toEqual(expected);
    });
  });
});
