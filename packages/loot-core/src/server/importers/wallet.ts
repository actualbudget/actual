import * as actual from '@actual-app/api/methods';
import { amountToInteger } from '@actual-app/api/utils';
import parse from 'csv-parse/lib/sync';
import { v4 as uuidv4 } from 'uuid';

import { groupBy } from '../../shared/util';

import { Wallet } from './wallet-types';

function buildTransfers(
  data: Wallet.Transactions,
  entityIdMap: Map<string, string>,
  payees: { transfer_acct: string; id: string }[],
) {
  const transfers = data.filter(t => t.category === 'TRANSFER');

  let result = [];
  const getAbs = (val?: number) => (val ? Math.abs(val) : null);

  for (let i = 0; i < transfers.length; i++) {
    const transaction = transfers[i];

    if (transaction.amount < 0) {
      const nextVal = transfers[i - 1];
      const prevVal = transfers[i + 1];
      const current = getAbs(transaction?.amount);

      const transferTarget =
        getAbs(nextVal?.amount) === current
          ? nextVal
          : getAbs(prevVal?.amount) === current
          ? prevVal
          : null;

      result.push({
        _account: transaction.account,
        id: entityIdMap.get(transaction.id),
        amount: amountToInteger(transaction.amount),
        category: entityIdMap.get(transaction.category),
        date: new Date(transaction.date),
        cleared: true,
        notes: transaction.note || null,
        payee: transferTarget
          ? payees.find(
              payee =>
                payee.transfer_acct === entityIdMap.get(transferTarget.account),
            )?.id
          : null,
      });
    }
  }

  return result;
}

function importAccounts(
  data: Wallet.Transactions,
  entityIdMap: Map<string, string>,
) {
  const accounts = new Set<string>();

  data.forEach(transaction => {
    accounts.add(transaction.account);
  });

  return Promise.all(
    [...accounts].map(async value => {
      const id = await actual.createAccount({
        name: value,
      });

      entityIdMap.set(value, id);
    }),
  );
}

async function importCategories(
  data: Wallet.Transactions,
  entityIdMap: Map<string, string>,
) {
  const categories = new Set<string>();
  const incomeCategories = new Set<string>();
  const actualCategories = await actual.getCategories();

  const incomeCatId = actualCategories.find(
    cat => cat.name === 'Income',
  ).group_id;

  data.forEach(transaction => {
    if (transaction.category === 'TRANSFER') {
      return;
    }

    if (transaction.transfer === 'false' && transaction.amount > 0) {
      incomeCategories.add(transaction.category);
      return;
    }

    categories.add(transaction.category);
  });

  const id = await actual.createCategoryGroup({
    name: 'Main',
    is_income: false,
  });

  return Promise.all([
    ...[...categories].map(async value => {
      const catId = await actual.createCategory({
        name: value,
        group_id: id,
      });

      entityIdMap.set(value, catId);
    }),
    ...[...incomeCategories].map(async value => {
      const catId = await actual.createCategory({
        name: value,
        group_id: incomeCatId,
        is_income: true,
      });
      entityIdMap.set(value, catId);
    }),
  ]);
}

async function importPayees(
  data: Wallet.Transactions,
  entityIdMap: Map<string, string>,
) {
  const payees = new Set<string>();

  data.forEach(transaction => {
    payees.add(transaction.payee);
  });

  for (let payee of payees) {
    const id = await actual.createPayee({
      name: payee,
    });
    entityIdMap.set(payee, id);
  }
}

async function importTransactions(
  data: Wallet.Transactions,
  entityIdMap: Map<string, string>,
) {
  const payees = await actual.getPayees();
  let transactionsGrouped = groupBy(data, 'account');

  for (let transaction of data) {
    if (transaction.category === 'TRANSFER') continue;
    entityIdMap.set(transaction.id, uuidv4());
  }

  await Promise.all(
    [...transactionsGrouped.keys()].map(async accountName => {
      let transactions = transactionsGrouped.get(accountName);
      const accountId = entityIdMap.get(accountName);

      const all = transactions
        .filter(t => t.category !== 'TRANSFER')
        .map((transaction, i) => {
          return {
            id: entityIdMap.get(transaction.id),
            amount: amountToInteger(transaction.amount),
            category: entityIdMap.get(transaction.category),
            cleared: true,
            date: new Date(transaction.date),
            notes: transaction.note || null,
          };
        })
        .filter(Boolean);

      await actual.addTransactions(accountId, all);
    }),
  );

  let transfersGrouped = groupBy(
    buildTransfers(data, entityIdMap, payees),
    '_account',
  );

  await Promise.all(
    [...transfersGrouped.keys()].map(async accountName => {
      let transactions = transfersGrouped
        .get(accountName)
        .map(({ account, ...rest }) => rest);

      const accountId = entityIdMap.get(accountName);

      await actual.addTransactions(accountId, [...transactions]);
    }),
  );
}

export async function doImport(data: Wallet.Transactions) {
  const entityIdMap = new Map<string, string>();

  await importAccounts(data, entityIdMap);

  console.log('Importing Accounts...');

  console.log('Importing Categories...');
  await importCategories(data, entityIdMap);

  console.log('Importing Payees...');
  await importPayees(data, entityIdMap);

  console.log('Importing Transactions...');
  await importTransactions(data, entityIdMap);

  console.log('Setting up...');
}

export function parseFile(buffer: Buffer): Wallet.Transactions {
  let data;

  try {
    data = parse(buffer, {
      columns: true,
      bom: true,
      delimiter: ';',
      // eslint-disable-next-line rulesdir/typography
      quote: '"',
      trim: true,
      relax_column_count: true,
      skip_empty_lines: true,
    }).map(row => ({
      ...row,
      amount: Number(row.amount.replace(',', '.')),
      id: uuidv4(),
    }));
  } catch (err) {
    console.log(err);
  }

  return data;
}

export function getBudgetName(_filepath: string, data: any) {
  return 'MY WALLET BDGT';
}
