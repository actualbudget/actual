import * as d from 'date-fns';

import { amountToInteger } from '../../shared/util';
import * as db from '../db';
import * as prefs from '../prefs';

import { parseFile } from './parse-file';
import { reconcileTransactions } from './sync';

beforeEach(global.emptyDatabase());

async function getTransactions(accountId) {
  return db.runQuery(
    'SELECT * FROM transactions WHERE acct = ?',
    [accountId],
    true
  );
}

async function importFileWithRealTime(accountId, filepath, dateFormat) {
  // Emscripten requires a real Date.now!
  global.restoreDateNow();
  let { errors, transactions } = await parseFile(filepath);
  global.restoreFakeDateNow();

  if (transactions) {
    transactions = transactions.map(trans => ({
      ...trans,
      amount: amountToInteger(trans.amount),
      date: dateFormat
        ? d.format(d.parse(trans.date, dateFormat, new Date()), 'yyyy-MM-dd')
        : trans.date
    }));
  }

  if (errors.length > 0) {
    return { errors, added: [] };
  }

  let { added } = await reconcileTransactions(accountId, transactions);
  return { errors, added };
}

describe('File import', () => {
  test('qif import works', async () => {
    prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });
    let { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../mocks/files/data.qif',
      'MM/dd/yy'
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  });

  test('ofx import works', async () => {
    prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    let { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../mocks/files/data.ofx'
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  }, 45000);

  test('qfx import works', async () => {
    prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    let { errors } = await importFileWithRealTime(
      'one',
      __dirname + '/../../mocks/files/data.qfx'
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  }, 45000);

  test('matches extensions correctly (case-insensitive, etc)', async () => {
    prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    let res = await importFileWithRealTime(
      'one',
      __dirname + '/../../mocks/files/best.data-ever$.QFX'
    );
    expect(res.errors.length).toBe(0);

    res = await importFileWithRealTime(
      'one',
      __dirname + '/../../mocks/files/big.data.QiF',
      'MM/dd/yy'
    );
    expect(res.errors.length).toBe(0);

    res = await importFileWithRealTime('one', 'foo.txt');
    expect(res.errors.length).toBe(1);
    expect(res.errors[0].message).toBe('Invalid file type');
  }, 45000);
});
