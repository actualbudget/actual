import { parseFile } from './parse-file';
import { reconcileTransactions } from './sync';
import * as prefs from '../prefs';
import * as db from '../db';
import { amountToInteger } from '../../shared/util';
import * as d from 'date-fns';

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
    let { errors, added } = await importFileWithRealTime(
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

    let { errors, added } = await importFileWithRealTime(
      'one',
      __dirname + '/../../mocks/files/data.ofx'
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  }, 45000);

  test('qfx import works', async () => {
    prefs.loadPrefs();
    await db.insertAccount({ id: 'one', name: 'one' });

    let { errors, added } = await importFileWithRealTime(
      'one',
      __dirname + '/../../mocks/files/data.qfx'
    );
    expect(errors.length).toBe(0);
    expect(await getTransactions('one')).toMatchSnapshot();
  }, 45000);
});
