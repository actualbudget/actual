// @ts-strict-ignore
import * as d from 'date-fns';

import { amountToInteger } from '../../shared/util';
import * as db from '../db';
import * as prefs from '../prefs';

import { parseFile } from './parse-file';
import { reconcileTransactions } from './sync';

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

async function getTransactions(accountId) {
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
) {
  // Emscripten requires a real Date.now!
  global.restoreDateNow();
  const { errors, transactions: originalTransactions } =
    await parseFile(filepath);
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
      __dirname + '/../../mocks/files/data.qif',
      'MM/dd/yy',
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  });

  test('ofx import works', async () => {
    prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    const { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../mocks/files/data.ofx',
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  }, 45000);

  test('ofx import works with multiple decimals in amount', async () => {
    const ofxFile = __dirname + '/../../mocks/files/data-multi-decimal.ofx';

    const { transactions } = (await parseFile(ofxFile)) as {
      transactions: { amount: number }[];
    };

    expect(transactions).toHaveLength(2);
    expect(transactions[0].amount).toBe(-30.0);
    expect(transactions[1].amount).toBe(-3.77);
  }, 45000);

  test('ofx import works (credit card)', async () => {
    prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    const { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../mocks/files/credit-card.ofx',
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  }, 45000);

  test('qfx import works', async () => {
    prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    const { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../mocks/files/data.qfx',
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  }, 45000);

  test('matches extensions correctly (case-insensitive, etc)', async () => {
    prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    let res = await importFileWithRealTime(
      'one',
      __dirname + '/../../mocks/files/best.data-ever$.QFX',
    );
    expect(res.errors.length).toBe(0);

    res = await importFileWithRealTime(
      'one',
      __dirname + '/../../mocks/files/big.data.QiF',
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
      __dirname + '/../../mocks/files/8859-1.qfx',
      'yyyy-MM-dd',
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  });

  test('handles html escaped plaintext', async () => {
    prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    const { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../mocks/files/html-vals.qfx',
      'yyyy-MM-dd',
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  });

  test('CAMT.053 import works', async () => {
    prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    const { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../mocks/files/camt/camt.053.xml',
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  });
});
