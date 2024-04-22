// @ts-strict-ignore
// This is a special usage of the API because this package is embedded
// into Actual itself. We only want to pull in the methods in that
// case and ignore everything else; otherwise we'd be pulling in the
// entire backend bundle from the API
import * as actual from '@actual-app/api/methods';
import { v4 as uuidv4 } from 'uuid';

import * as monthUtils from '../../shared/months';
import { sortByKey, groupBy } from '../../shared/util';
import { CategoryGroupEntity } from '../../types/models';

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
        const id = await actual.createAccount({
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
  const incomeCatId = findIdByName(categories, 'Income');
  const ynabIncomeCategories = ['To be Budgeted', 'Inflow: Ready to Assign'];

  function checkSpecialCat(cat) {
    if (
      cat.category_group_id ===
      findIdByName(data.category_groups, 'Internal Master Category')
    ) {
      if (
        ynabIncomeCategories.some(ynabIncomeCategory =>
          equalsIgnoreCase(cat.name, ynabIncomeCategory),
        )
      ) {
        return 'income';
      } else {
        return 'internal';
      }
    } else if (
      cat.category_group_id ===
      findIdByName(data.category_groups, 'Credit Card Payments')
    ) {
      return 'creditCard';
    }
  }
  // Can't be done in parallel to have
  // correct sort order.

  for (const group of data.category_groups) {
    if (!group.deleted) {
      let groupId;
      // Ignores internal category and credit cards
      if (
        !equalsIgnoreCase(group.name, 'Internal Master Category') &&
        !equalsIgnoreCase(group.name, 'Credit Card Payments')
      ) {
        groupId = await actual.createCategoryGroup({
          name: group.name,
          is_income: false,
        });
        entityIdMap.set(group.id, groupId);
      }

      const cats = data.categories.filter(
        cat => cat.category_group_id === group.id,
      );

      for (const cat of cats.reverse()) {
        if (!cat.deleted) {
          // Handles special categories. Starting balance is a payee
          // in YNAB so it's handled in importTransactions
          switch (checkSpecialCat(cat)) {
            case 'income': {
              // doesn't create new category, only assigns id
              const id = incomeCatId;
              entityIdMap.set(cat.id, id);
              break;
            }
            case 'creditCard': // ignores it
            case 'internal': // uncategorized is ignored too, handled by actual
              break;
            default: {
              const id = await actual.createCategory({
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
        const id = await actual.createPayee({
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
  const incomeCatId = findIdByName(categories, 'Income');
  const startingBalanceCatId = findIdByName(categories, 'Starting Balances'); //better way to do it?

  const startingPayeeYNAB = findIdByName(data.payees, 'Starting Balance');

  const transactionsGrouped = groupBy(data.transactions, 'account_id');
  const subtransactionsGrouped = groupBy(
    data.subtransactions,
    'transaction_id',
  );

  const payeesByTransferAcct = payees
    .filter(payee => payee?.transfer_acct)
    .map(payee => [payee.transfer_acct, payee] as [string, YNAB5.Payee]);
  const payeeTransferAcctHashMap = new Map<string, YNAB5.Payee>(
    payeesByTransferAcct,
  );
  const orphanTransferMap = new Map<string, YNAB5.Transaction[]>();
  const orphanSubtransfer = [] as YNAB5.Subtransaction[];
  const orphanSubtransferTrxId = [] as string[];
  const orphanSubtransferAcctIdByTrxIdMap = new Map<string, string>();
  const orphanSubtransferDateByTrxIdMap = new Map<string, string>();

  // Go ahead and generate ids for all of the transactions so we can
  // reliably resolve transfers
  // Also identify orphan transfer transactions and subtransactions.
  for (const transaction of data.subtransactions) {
    entityIdMap.set(transaction.id, uuidv4());

    if (transaction.transfer_account_id) {
      orphanSubtransfer.push(transaction);
      orphanSubtransferTrxId.push(transaction.transaction_id);
    }
  }

  for (const transaction of data.transactions) {
    entityIdMap.set(transaction.id, uuidv4());

    if (
      transaction.transfer_account_id &&
      !transaction.transfer_transaction_id
    ) {
      const key =
        transaction.account_id + '#' + transaction.transfer_account_id;
      if (!orphanTransferMap.has(key)) {
        orphanTransferMap.set(key, [transaction]);
      } else {
        orphanTransferMap.get(key).push(transaction);
      }
    }

    if (orphanSubtransferTrxId.includes(transaction.id)) {
      orphanSubtransferAcctIdByTrxIdMap.set(
        transaction.id,
        transaction.account_id,
      );
      orphanSubtransferDateByTrxIdMap.set(transaction.id, transaction.date);
    }
  }

  // Compute link between subtransaction transfers and orphaned transaction
  // transfers. The goal is to match each transfer subtransaction to the related
  // transfer transaction according to the accounts, date, amount and memo.
  const orphanSubtransferMap = orphanSubtransfer.reduce(
    (map, subtransaction) => {
      const key =
        subtransaction.transfer_account_id +
        '#' +
        orphanSubtransferAcctIdByTrxIdMap.get(subtransaction.transaction_id);
      if (!map.has(key)) {
        map.set(key, [subtransaction]);
      } else {
        map.get(key).push(subtransaction);
      }
      return map;
    },
    new Map<string, YNAB5.Subtransaction[]>(),
  );

  // The comparator will be used to order transfer transactions and their
  // corresponding tranfer subtransaction in two aligned list. Hopefully
  // for every list index in the transactions list, the related subtransaction
  // will be at the same index.
  const orphanTransferComparator = (
    a: YNAB5.Transaction | YNAB5.Subtransaction,
    b: YNAB5.Transaction | YNAB5.Subtransaction,
  ) => {
    // a and b can be a YNAB5.Transaction (having a date attribute) or a
    // YNAB5.Subtransaction (missing that date attribute)

    const date_a =
      'date' in a
        ? a.date
        : orphanSubtransferDateByTrxIdMap.get(a.transaction_id);
    const date_b =
      'date' in b
        ? b.date
        : orphanSubtransferDateByTrxIdMap.get(b.transaction_id);
    // A transaction and the related subtransaction have inverted amounts.
    // To have those in the same order, the subtransaction has to be reversed
    // to have the same amount.
    const amount_a = 'date' in a ? a.amount : -a.amount;
    const amount_b = 'date' in b ? b.amount : -b.amount;

    // Transaction are ordered first by date, then by amount, and lastly by memo
    if (date_a > date_b) return 1;
    if (date_a < date_b) return -1;
    if (amount_a > amount_b) return 1;
    if (amount_a < amount_b) return -1;
    if (a.memo > b.memo) return 1;
    if (a.memo < b.memo) return -1;
    return 0;
  };

  const orphanTrxIdSubtrxIdMap = new Map<string, string>();
  orphanTransferMap.forEach((transactions, key) => {
    const subtransactions = orphanSubtransferMap.get(key);
    if (subtransactions) {
      transactions.sort(orphanTransferComparator);
      subtransactions.sort(orphanTransferComparator);

      // Iterate on the two sorted lists transactions and subtransactions and
      // find matching data to identify the related transaction ids.
      let transactionIdx = 0;
      let subtransactionIdx = 0;
      do {
        switch (
          orphanTransferComparator(
            transactions[transactionIdx],
            subtransactions[subtransactionIdx],
          )
        ) {
          case 0:
            // The current list indexes are matching: the transaction and
            // subtransaction are related (same date, amount and memo)
            orphanTrxIdSubtrxIdMap.set(
              transactions[transactionIdx].id,
              entityIdMap.get(subtransactions[subtransactionIdx].id),
            );
            orphanTrxIdSubtrxIdMap.set(
              subtransactions[subtransactionIdx].id,
              entityIdMap.get(transactions[transactionIdx].id),
            );
            transactionIdx++;
            subtransactionIdx++;
            break;
          case -1:
            // The current list indexes are not matching:
            // The current transaction is "smaller" than the current subtransaction
            // (earlier date, smaller amount, memo value sorted before)
            // So we advance to the next transaction and see if it match with
            // the current subtransaction
            transactionIdx++;
            break;
          case 1:
            // Inverse of the previous case:
            // The current subtransaction is "smaller" than the current transaction
            // So we advance to the next subtransaction
            subtransactionIdx++;
            break;
        }
      } while (
        transactionIdx < transactions.length &&
        subtransactionIdx < subtransactions.length
      );
    }
  });

  await Promise.all(
    [...transactionsGrouped.keys()].map(async accountId => {
      const transactions = transactionsGrouped.get(accountId);

      const toImport = transactions
        .map(transaction => {
          if (transaction.deleted) {
            return null;
          }

          const subtransactions = subtransactionsGrouped.get(transaction.id);

          // Add transaction
          const newTransaction = {
            id: entityIdMap.get(transaction.id),
            account: entityIdMap.get(transaction.account_id),
            date: transaction.date,
            amount: amountFromYnab(transaction.amount),
            category: entityIdMap.get(transaction.category_id) || null,
            cleared: ['cleared', 'reconciled'].includes(transaction.cleared),
            reconciled: transaction.cleared === 'reconciled',
            notes: transaction.memo || null,
            imported_id: transaction.import_id || null,
            transfer_id:
              entityIdMap.get(transaction.transfer_transaction_id) ||
              orphanTrxIdSubtrxIdMap.get(transaction.id) ||
              null,
            subtransactions: subtransactions
              ? subtransactions.map(subtrans => {
                  return {
                    id: entityIdMap.get(subtrans.id),
                    amount: amountFromYnab(subtrans.amount),
                    category: entityIdMap.get(subtrans.category_id) || null,
                    notes: subtrans.memo,
                    transfer_id:
                      orphanTrxIdSubtrxIdMap.get(subtrans.id) || null,
                    payee: null,
                    imported_payee: null,
                  };
                })
              : null,
            payee: null,
            imported_payee: null,
          };

          // Handle transactions and subtransactions payee
          const transactionPayeeUpdate = (
            trx: YNAB5.Transaction | YNAB5.Subtransaction,
            newTrx,
          ) => {
            if (trx.transfer_account_id) {
              const mappedTransferAccountId = entityIdMap.get(
                trx.transfer_account_id,
              );
              newTrx.payee = payeeTransferAcctHashMap.get(
                mappedTransferAccountId,
              )?.id;
            } else {
              newTrx.payee = entityIdMap.get(trx.payee_id);
              newTrx.imported_payee = data.payees.find(
                p => !p.deleted && p.id === trx.payee_id,
              )?.name;
            }
          };

          transactionPayeeUpdate(transaction, newTransaction);
          if (newTransaction.subtransactions) {
            subtransactions.forEach(subtrans => {
              const newSubtransaction = newTransaction.subtransactions.find(
                newSubtrans => newSubtrans.id === entityIdMap.get(subtrans.id),
              );
              transactionPayeeUpdate(subtrans, newSubtransaction);
            });
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

      await actual.addTransactions(entityIdMap.get(accountId), toImport, {
        learnCategories: true,
      });
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

  const budgets = sortByKey(data.months, 'month');

  const internalCatIdYnab = findIdByName(
    data.category_groups,
    'Internal Master Category',
  );
  const creditcardCatIdYnab = findIdByName(
    data.category_groups,
    'Credit Card Payments',
  );

  await actual.batchBudgetUpdates(async () => {
    for (const budget of budgets) {
      const month = monthUtils.monthFromDate(budget.month);

      await Promise.all(
        budget.categories.map(async catBudget => {
          const catId = entityIdMap.get(catBudget.id);
          const amount = Math.round(catBudget.budgeted / 10);

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
  if (data.budget) {
    data = data.budget;
  }

  return data;
}

export function getBudgetName(_filepath: string, data: YNAB5.Budget) {
  return data.budget_name || data.name;
}

function equalsIgnoreCase(stringa: string, stringb: string): boolean {
  return (
    stringa.localeCompare(stringb, undefined, {
      sensitivity: 'base',
    }) === 0
  );
}

function findByNameIgnoreCase(
  categories: (YNAB5.CategoryGroup | CategoryGroupEntity)[],
  name: string,
) {
  return categories.find(cat => equalsIgnoreCase(cat.name, name));
}

function findIdByName(
  categories: (YNAB5.CategoryGroup | CategoryGroupEntity)[],
  name: string,
) {
  return findByNameIgnoreCase(categories, name)?.id;
}
