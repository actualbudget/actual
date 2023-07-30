// This is a special usage of the API because this package is embedded
// into Actual itself. We only want to pull in the methods in that
// case and ignore everything else; otherwise we'd be pulling in the
// entire backend bundle from the API
import * as actual from '@actual-app/api/methods';
import { v4 as uuidv4 } from 'uuid';

import * as monthUtils from '../../shared/months';
import { sortByKey, groupBy } from '../../shared/util';

import { YNAB5 } from './ynab5-types';

function amountFromYnab(amount: number) {
  // ynabs multiplies amount by 1000 and actual by 100
  // so, this function divides by 10
  return Math.round(amount / 10);
}

function importAccounts(data: YNAB5.Budget, entityIdMap: Map<string, string>) {
  return Promise.all(
    data.accounts.map(async account => {
      if (!account.deleted) {
        let id = await actual.createAccount({
          name: account.name,
          offbudget: account.on_budget ? false : true,
          closed: account.closed,
        });
        entityIdMap.set(account.id, id);
      }
    }),
  );
}

async function importCategories(
  data: YNAB5.Budget,
  entityIdMap: Map<string, string>,
) {
  // Hidden categories are put in its own group by YNAB,
  // so it's already handled.

  const categories = await actual.getCategories();
  const incomeCatId = categories.find(cat => cat.name === 'Income').id;
  const ynabIncomeCategories = ['To be Budgeted', 'Inflow: Ready to Assign'];

  function checkSpecialCat(cat) {
    if (
      cat.category_group_id ===
      data.category_groups.find(
        group => group.name === 'Internal Master Category',
      ).id
    ) {
      if (ynabIncomeCategories.includes(cat.name)) {
        return 'income';
      } else {
        return 'internal';
      }
    } else if (
      cat.category_group_id ===
      data.category_groups.find(group => group.name === 'Credit Card Payments')
        .id
    ) {
      return 'creditCard';
    }
  }
  // Can't be done in parallel to have
  // correct sort order.

  for (let group of data.category_groups) {
    if (!group.deleted) {
      let groupId;
      // Ignores internal category and credit cards
      if (
        group.name !== 'Internal Master Category' &&
        group.name !== 'Credit Card Payments'
      ) {
        groupId = await actual.createCategoryGroup({
          name: group.name,
          is_income: false,
        });
        entityIdMap.set(group.id, groupId);
      }

      let cats = data.categories.filter(
        cat => cat.category_group_id === group.id,
      );

      for (let cat of cats.reverse()) {
        if (!cat.deleted) {
          // Handles special categories. Starting balance is a payee
          // in YNAB so it's handled in importTransactions
          switch (checkSpecialCat(cat)) {
            case 'income': {
              // doesn't create new category, only assigns id
              let id = incomeCatId;
              entityIdMap.set(cat.id, id);
              break;
            }
            case 'creditCard': // ignores it
            case 'internal': // uncategorized is ignored too, handled by actual
              break;
            default: {
              let id = await actual.createCategory({
                name: cat.name,
                group_id: groupId,
              });
              entityIdMap.set(cat.id, id);
              break;
            }
          }
        }
      }
    }
  }
}

function importPayees(data: YNAB5.Budget, entityIdMap: Map<string, string>) {
  return Promise.all(
    data.payees.map(async payee => {
      if (!payee.deleted) {
        let id = await actual.createPayee({
          name: payee.name,
        });
        entityIdMap.set(payee.id, id);
      }
    }),
  );
}

async function importTransactions(
  data: YNAB5.Budget,
  entityIdMap: Map<string, string>,
) {
  const payees = await actual.getPayees();
  const categories = await actual.getCategories();
  const incomeCatId = categories.find(cat => cat.name === 'Income').id;
  const startingBalanceCatId = categories.find(
    cat => cat.name === 'Starting Balances',
  ).id; //better way to do it?
  const startingPayeeYNAB = data.payees.find(
    payee => payee.name === 'Starting Balance',
  ).id;

  let transactionsGrouped = groupBy(data.transactions, 'account_id');
  let subtransactionsGrouped = groupBy(data.subtransactions, 'transaction_id');

  // Go ahead and generate ids for all of the transactions so we can
  // reliably resolve transfers
  for (let transaction of data.transactions) {
    entityIdMap.set(transaction.id, uuidv4());
  }
  for (let transaction of data.subtransactions) {
    entityIdMap.set(transaction.id, uuidv4());
  }

  await Promise.all(
    [...transactionsGrouped.keys()].map(async accountId => {
      let transactions = transactionsGrouped.get(accountId);

      let toImport = transactions
        .map(transaction => {
          if (transaction.deleted) {
            return null;
          }

          let subtransactions = subtransactionsGrouped.get(transaction.id);

          // Add transaction
          let newTransaction = {
            id: entityIdMap.get(transaction.id),
            account: entityIdMap.get(transaction.account_id),
            date: transaction.date,
            amount: amountFromYnab(transaction.amount),
            category: entityIdMap.get(transaction.category_id) || null,
            cleared: ['cleared', 'reconciled'].includes(transaction.cleared),
            notes: transaction.memo || null,
            imported_id: transaction.import_id || null,
            transfer_id:
              entityIdMap.get(transaction.transfer_transaction_id) || null,
            subtransactions: subtransactions
              ? subtransactions.map(subtrans => {
                  return {
                    id: entityIdMap.get(subtrans.id),
                    amount: amountFromYnab(subtrans.amount),
                    category: entityIdMap.get(subtrans.category_id) || null,
                    notes: subtrans.memo,
                  };
                })
              : null,
            payee: null,
            imported_payee: null,
          };

          // Handle transfer payee
          if (transaction.transfer_account_id) {
            newTransaction.payee = payees.find(
              p =>
                p.transfer_acct ===
                entityIdMap.get(transaction.transfer_account_id),
            ).id;
          } else {
            newTransaction.payee = entityIdMap.get(transaction.payee_id);
            newTransaction.imported_payee = data.payees.find(
              p => !p.deleted && p.id === transaction.payee_id,
            )?.name;
          }

          // Handle starting balances
          if (
            transaction.payee_id === startingPayeeYNAB &&
            entityIdMap.get(transaction.category_id) === incomeCatId
          ) {
            newTransaction.category = startingBalanceCatId;
            newTransaction.payee = null;
          }
          return newTransaction;
        })
        .filter(x => x);

      await actual.addTransactions(entityIdMap.get(accountId), toImport);
    }),
  );
}

async function importBudgets(
  data: YNAB5.Budget,
  entityIdMap: Map<string, string>,
) {
  // There should be info in the docs to deal with
  // no credit card category and how YNAB and Actual
  // handle differently the amount To be Budgeted
  // i.e. Actual considers the cc debt while YNAB doesn't
  //
  // Also, there could be a way to set rollover using
  // Deferred Income Subcat and Immediate Income Subcat

  let budgets = sortByKey(data.months, 'month');

  const internalCatIdYnab = data.category_groups.find(
    group => group.name === 'Internal Master Category',
  ).id;
  const creditcardCatIdYnab = data.category_groups.find(
    group => group.name === 'Credit Card Payments',
  ).id;

  await actual.batchBudgetUpdates(async () => {
    for (let budget of budgets) {
      let month = monthUtils.monthFromDate(budget.month);

      await Promise.all(
        budget.categories.map(async catBudget => {
          let catId = entityIdMap.get(catBudget.id);
          let amount = catBudget.budgeted / 10;

          if (
            !catId ||
            catBudget.category_group_id === internalCatIdYnab ||
            catBudget.category_group_id === creditcardCatIdYnab
          ) {
            return;
          }

          await actual.setBudgetAmount(month, catId, amount);
        }),
      );
    }
  });
}

// Utils

export async function doImport(data: YNAB5.Budget) {
  const entityIdMap = new Map<string, string>();

  console.log('Importing Accounts...');
  await importAccounts(data, entityIdMap);

  console.log('Importing Categories...');
  await importCategories(data, entityIdMap);

  console.log('Importing Payees...');
  await importPayees(data, entityIdMap);

  console.log('Importing Transactions...');
  await importTransactions(data, entityIdMap);

  console.log('Importing Budgets...');
  await importBudgets(data, entityIdMap);

  console.log('Setting up...');
}

export function parseFile(buffer: Buffer): YNAB5.Budget {
  let data = JSON.parse(buffer.toString());
  if (data.data) {
    data = data.data;
  }

  return data;
}

export function getBudgetName(_filepath: string, data: YNAB5.Budget) {
  return data.budget_name;
}
