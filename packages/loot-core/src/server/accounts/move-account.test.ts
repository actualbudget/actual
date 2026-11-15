import { createBudget } from '#server/budget/base';
import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';
import * as sheet from '#server/sheet';
import { clearUndo, undo } from '#server/undo';

import { app } from './app';

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
  clearUndo();
});

afterEach(() => sheet.unloadSpreadsheet());

it.each([false, true])(
  'moves an account and its history in one undoable operation (off budget: %s)',
  async offBudget => {
    await db.insertCategoryGroup({
      id: 'income',
      name: 'Income',
      is_income: 1,
    });
    await db.insertCategoryGroup({ id: 'expenses', name: 'Expenses' });
    const startingBalances = await db.insertCategory({
      name: 'Starting Balances',
      cat_group: 'income',
      is_income: 1,
    });
    for (const [id, name] of [
      ['food', 'Food'],
      ['groceries', 'Groceries'],
      ['utilities', 'Utilities'],
    ]) {
      await db.insertCategory({ id, name, cat_group: 'expenses' });
    }
    const destination = await db.insertAccount({
      name: 'Destination peer',
      offbudget: offBudget ? 1 : 0,
    });
    const oldPeer = await db.insertAccount({
      name: 'Original peer',
      offbudget: offBudget ? 0 : 1,
    });
    const group = await db.insertAccountGroup({ name: 'Savings' });
    const id = await app.handlers['account-create']({
      name: 'Checking',
      offBudget: !offBudget,
      balance: 100,
    });
    const bankLink = {
      account_id: 'bank-link',
      account_sync_source: 'simpleFin',
    };
    await db.updateAccount({ id, ...bankLink });

    const date = '2025-01-01';
    await db.insertTransaction({
      account: id,
      amount: -2000,
      category: 'groceries',
      date,
    });
    await db.deleteCategory({ id: 'groceries' }, 'food');

    async function linkTo(otherAccount: string, category?: string) {
      const transfer = `out-${otherAccount}`;
      const otherLeg = `in-${otherAccount}`;
      await db.insertTransaction({
        id: transfer,
        account: id,
        amount: -1000,
        date,
        transfer_id: otherLeg,
        category: offBudget ? category : undefined,
      });
      await db.insertTransaction({
        id: otherLeg,
        account: otherAccount,
        amount: 1000,
        date,
        transfer_id: transfer,
        category: offBudget ? undefined : category,
      });
      return [transfer, otherLeg];
    }

    const internalTransferIds = await linkTo(destination, 'utilities');
    await linkTo(oldPeer);
    await sheet.loadSpreadsheet(db);
    await createBudget(['2025-01']);
    await sheet.waitOnSpreadsheet();

    async function readState() {
      return {
        accounts: await app.handlers['accounts-get'](),
        ledger: await db.all<db.DbViewTransaction>(
          'SELECT * FROM v_transactions ORDER BY id',
        ),
        spending: ['food', 'utilities'].map(category =>
          sheet.getCellValue('budget202501', `sum-amount-${category}`),
        ),
      };
    }

    const before = await readState();
    expect(before.spending).toEqual(offBudget ? [-2000, -1000] : [0, 1000]);
    const opening = before.ledger.find(
      transaction => transaction.starting_balance_flag,
    );
    expect(opening?.amount).toBe(10000);
    expect(opening?.category).toBe(offBudget ? startingBalances : null);

    await app.handlers['account-move']({
      id,
      targetId: destination,
      accountGroupId: group,
      offBudget,
    });
    await sheet.waitOnSpreadsheet();

    const after = await readState();
    expect(after.spending).toEqual(offBudget ? [0, 0] : [-2000, 0]);
    const destinationAccounts = after.accounts.filter(
      account => account.offbudget === Number(offBudget),
    );
    expect(destinationAccounts.map(account => account.id)).toEqual([
      id,
      destination,
    ]);
    expect(destinationAccounts[0]).toMatchObject({
      ...bankLink,
      account_group_id: group,
    });
    expect(after.ledger).toEqual(
      before.ledger.map(transaction => {
        if (transaction.starting_balance_flag) {
          return { ...transaction, category: startingBalances };
        }
        if (internalTransferIds.includes(transaction.id)) {
          return { ...transaction, category: null };
        }
        return transaction;
      }),
    );

    await undo();
    await sheet.waitOnSpreadsheet();
    expect(await readState()).toEqual(before);
  },
);
