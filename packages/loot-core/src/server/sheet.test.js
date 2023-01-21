import { generateTransaction } from '../mocks';

import * as db from './db';
import * as sheet from './sheet';

beforeEach(global.emptyDatabase());

async function insertTransactions() {
  await db.insertCategoryGroup({ id: 'group1', name: 'group1' });
  await db.insertCategory({ id: 'cat1', name: 'cat1', cat_group: 'group1' });
  await db.insertCategory({ id: 'cat2', name: 'cat2', cat_group: 'group1' });

  await db.insertTransaction(
    generateTransaction({
      id: 'trans1',
      amount: -3200,
      account: '1',
      category: 'cat1',
      date: '2017-01-08'
    })[0]
  );
  await db.insertTransaction(
    generateTransaction({
      id: 'trans2',
      amount: -2800,
      account: '1',
      category: 'cat2',
      date: '2017-01-10'
    })[0]
  );
  await db.insertTransaction(
    generateTransaction({
      id: 'trans3',
      amount: -9832,
      account: '1',
      category: 'cat2',
      date: '2017-01-15'
    })[0]
  );
}

describe('Spreadsheet', () => {
  test('transferring a category triggers an update', async () => {
    let spreadsheet = await sheet.loadSpreadsheet(db);
    await insertTransactions();

    spreadsheet.startTransaction();
    spreadsheet.set(
      'g!foo',
      `=from transactions where category = "cat2" calculate { sum(amount) }`
    );
    spreadsheet.endTransaction();

    await new Promise(resolve => {
      spreadsheet.onFinish(() => {
        expect(spreadsheet.getValue('g!foo')).toMatchSnapshot();
        resolve();
      });
    });

    await db.deleteCategory({ id: 'cat1' }, 'cat2');

    return new Promise(resolve => {
      spreadsheet.onFinish(() => {
        expect(spreadsheet.getValue('g!foo')).toMatchSnapshot();
        resolve();
      });
    });
  });

  test('updating still works after transferring categories', async () => {
    let spreadsheet = await sheet.loadSpreadsheet(db);
    await insertTransactions();

    await db.deleteCategory({ id: 'cat1' }, 'cat2');

    spreadsheet.startTransaction();
    spreadsheet.set(
      'g!foo',
      `=from transactions where category = "cat2" calculate { sum(amount) }`
    );
    spreadsheet.endTransaction();

    await new Promise(resolve => {
      spreadsheet.onFinish(() => {
        expect(spreadsheet.getValue('g!foo')).toMatchSnapshot();
        resolve();
      });
    });

    await db.updateTransaction({ id: 'trans1', amount: 50000 });

    await new Promise(resolve => {
      spreadsheet.onFinish(() => {
        expect(spreadsheet.getValue('g!foo')).toMatchSnapshot();
        resolve();
      });
    });
  });
});
