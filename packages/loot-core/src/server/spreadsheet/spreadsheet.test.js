import { generateTransaction } from '../../mocks';
import * as db from '../db';

import Spreadsheet from './spreadsheet';

beforeEach(global.emptyDatabase());

function wait(n) {
  return new Promise(resolve => setTimeout(resolve, n));
}

async function insertTransactions(payeeId = null) {
  await db.insertAccount({ id: '1', name: 'checking', offbudget: 0 });
  await db.insertAccount({ id: '2', name: 'checking', offbudget: 1 });
  await db.insertCategoryGroup({ id: 'group1', name: 'group1' });
  await db.insertCategory({ id: 'cat1', name: 'cat1', cat_group: 'group1' });
  await db.insertCategory({ id: 'cat2', name: 'cat2', cat_group: 'group1' });

  await db.insertTransaction(
    generateTransaction({
      amount: -3200,
      account: '1',
      category: 'cat1',
      date: '2017-01-08',
      description: payeeId
    })[0]
  );
  await db.insertTransaction(
    generateTransaction({
      amount: -2800,
      account: '1',
      category: 'cat2',
      date: '2017-01-10',
      description: payeeId
    })[0]
  );
  await db.insertTransaction(
    generateTransaction({
      amount: -9832,
      account: '1',
      category: 'cat2',
      date: '2017-01-15',
      description: payeeId
    })[0]
  );
}

describe('Spreadsheet', () => {
  // test('min bug', () => {
  //   const spreadsheet = new Spreadsheet(db);

  //   spreadsheet.set('g!minTest', '=min(0, number(-20000))');
  //   expect(spreadsheet.getValue('g!minTest')).toBe(-20000);
  // });

  // test('cycles are detected', () => {
  //   const spreadsheet = new Spreadsheet(db);

  //   spreadsheet.startTransaction();
  //   spreadsheet.set('g!foo', '=baz');
  //   spreadsheet.set('g!bar', '=2');
  //   spreadsheet.set('g!baz', '=foo + bar');
  //   spreadsheet.endTransaction();

  //   expect(spreadsheet.getValue('g!baz')).toBe(1);
  // });

  // test('querying transactions based on date works', async () => {
  //   const spreadsheet = new Spreadsheet(db);

  //   await insertTransactions();

  //   spreadsheet.startTransaction();
  //   spreadsheet.set(
  //     'g!foo',
  //     `=from transactions
  //      where
  //        date >= 20170101 and
  //        date <= 20170131
  //      calculate { sum(amount) }`
  //   );
  //   spreadsheet.set(
  //     'g!foo1',
  //     `=from transactions
  //      where
  //        date >= 20170101 and
  //        date <= 20170131
  //      calculate { sum(amount) } + g!foo`
  //   );
  //   spreadsheet.set(
  //     'g!foo2',
  //     `=from transactions
  //      where
  //        date >= 20170101 and
  //        date <= 20170131
  //      calculate { sum(amount) } + g!foo1`
  //   );
  //   spreadsheet.set('g!foo3', '=g!foo2 / 100');
  //   spreadsheet.set('g!foo4', '=g!foo2');
  //   spreadsheet.endTransaction();

  //   return new Promise(resolve => {
  //     spreadsheet.onFinish(() => {
  //       expect(spreadsheet.getValue('g!foo3')).toBe(-474.96);
  //       expect(spreadsheet.getValue('g!foo4')).toBe(-47496);
  //       resolve();
  //     });
  //   });
  // });

  test('querying transactions works', async () => {
    const spreadsheet = new Spreadsheet(db);
    await insertTransactions();

    spreadsheet.startTransaction();
    spreadsheet.set('g!foo', `=from transactions select { amount, category }`);
    spreadsheet.endTransaction();

    return new Promise(resolve => {
      spreadsheet.onFinish(() => {
        expect(spreadsheet.getValue('g!foo')).toMatchSnapshot();
        resolve();
      });
    });
  });

  test('querying deep join works', async () => {
    const spreadsheet = new Spreadsheet(db);
    await db.insertPayee({ name: '', transfer_acct: '1' });
    let payeeId2 = await db.insertPayee({ name: '', transfer_acct: '2' });
    await insertTransactions(payeeId2);

    spreadsheet.set(
      'g!foo',
      '=from transactions where acct.offbudget = 0 and (description.transfer_acct.offbudget = null or description.transfer_acct.offbudget = 1) select { acct.offbudget, description.transfer_acct.offbudget as foo, amount }'
    );

    return new Promise(resolve => {
      spreadsheet.onFinish(() => {
        expect(spreadsheet.getValue('g!foo')).toMatchSnapshot();
        resolve();
      });
    });
  });

  test('async cells work', done => {
    const spreadsheet = new Spreadsheet();

    spreadsheet.createDynamic('foo', 'x', {
      initialValue: 1,
      run: async () => {
        await wait(100);
        return 5;
      }
    });

    spreadsheet.onFinish(() => {
      expect(spreadsheet.getValue('foo!x')).toBe(5);
      done();
    });

    expect(spreadsheet.getValue('foo!x')).toBe(1);
  });

  test('async cells work2', done => {
    const spreadsheet = new Spreadsheet();

    spreadsheet.transaction(() => {
      spreadsheet.createDynamic('foo', 'x', {
        initialValue: 1,
        run: async () => {
          await wait(100);
          return 5;
        }
      });

      spreadsheet.createDynamic('foo', 'y', {
        initialValue: 2,
        dependencies: ['x'],
        run: x => {
          return x * 3;
        }
      });
    });

    spreadsheet.onFinish(() => {
      expect(spreadsheet.getValue('foo!x')).toBe(5);
      expect(spreadsheet.getValue('foo!y')).toBe(15);
      done();
    });

    expect(spreadsheet.getValue('foo!x')).toBe(1);
    expect(spreadsheet.getValue('foo!y')).toBe(2);
  });
});
