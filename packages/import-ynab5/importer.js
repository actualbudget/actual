// This is a special usage of the API because this package is embedded
// into Actual itself. We only want to pull in the methods in that
// case and ignore everything else; otherwise we'd be pulling in the
// entire backend bundle from the API
const actual = require('@actual-app/api/methods');
const d = require('date-fns');
const uuid = require('uuid');

function amountFromYnab(amount) {
  // ynabs multiplies amount by 1000 and actual by 100
  // so, this function divides by 10
  return Math.round(amount / 10);
}

function monthFromDate(date) {
  let parts = date.split('-');
  return parts[0] + '-' + parts[1];
}

function mapAccountType(type) {
  switch (type) {
    case 'cash':
    case 'checking':
      return 'checking';
    case 'creditCard':
    case 'lineOfCredit':
      return 'credit';
    case 'savings':
      return 'savings';
    case 'investmentAccount':
      return 'investment';
    case 'mortgage':
      return 'mortgage';
    default:
      return 'other';
  }
}

function sortByKey(arr, key) {
  return [...arr].sort((item1, item2) => {
    if (item1[key] < item2[key]) {
      return -1;
    } else if (item1[key] > item2[key]) {
      return 1;
    }
    return 0;
  });
}

function groupBy(arr, keyName) {
  return arr.reduce(function(obj, item) {
    var key = item[keyName];
    if (!obj.hasOwnProperty(key)) {
      obj[key] = [];
    }
    obj[key].push(item);
    return obj;
  }, {});
}

function importAccounts(data, entityIdMap) {
  return Promise.all(
    data.accounts.map(async account => {
      if (!account.deleted) {
        let id = await actual.createAccount({
          type: mapAccountType(account.type),
          name: account.name,
          offbudget: account.on_budget ? false : true,
          closed: account.closed
        });
        entityIdMap.set(account.id, id);
      }
    })
  );
}

async function importCategories(data, entityIdMap) {
  // Hidden categories are put in its own group by YNAB,
  // so it's already handled.

  const categories = await actual.getCategories();
  const incomeCatId = categories.find(cat => cat.name === 'Income').id;
  const ynabIncomeCategories = ['To be Budgeted', 'Inflow: Ready to Assign'];

  function checkSpecialCat(cat) {
    if (
      cat.category_group_id ===
      data.category_groups.find(
        group => group.name === 'Internal Master Category'
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
      // Ignores internal category and credit cards
      if (
        group.name !== 'Internal Master Category' &&
        group.name !== 'Credit Card Payments'
      ) {
        var groupId = await actual.createCategoryGroup({
          name: group.name,
          is_income: false
        });
        entityIdMap.set(group.id, groupId);
      }

      let cats = data.categories.filter(
        cat => cat.category_group_id === group.id
      );

      for (let cat of cats.reverse()) {
        if (!cat.deleted) {
          let newCategory = {};
          newCategory.name = cat.name;

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
              newCategory.group_id = groupId;
              let id = await actual.createCategory(newCategory);
              entityIdMap.set(cat.id, id);
              break;
            }
          }
        }
      }
    }
  }
}

function importPayees(data, entityIdMap) {
  return Promise.all(
    data.payees.map(async payee => {
      if (!payee.deleted) {
        let id = await actual.createPayee({
          name: payee.name
        });
        entityIdMap.set(payee.id, id);
      }
    })
  );
}

async function importTransactions(data, entityIdMap) {
  const payees = await actual.getPayees();
  const categories = await actual.getCategories();
  const incomeCatId = categories.find(cat => cat.name === 'Income').id;
  const startingBalanceCatId = categories.find(
    cat => cat.name === 'Starting Balances'
  ).id; //better way to do it?
  const startingPayeeYNAB = data.payees.find(
    payee => payee.name === 'Starting Balance'
  ).id;

  let transactionsGrouped = groupBy(data.transactions, 'account_id');
  let subtransactionsGrouped = groupBy(data.subtransactions, 'transaction_id');

  // Go ahead and generate ids for all of the transactions so we can
  // reliably resolve transfers
  for (let transaction of data.transactions) {
    entityIdMap.set(transaction.id, uuid.v4());
  }

  await Promise.all(
    Object.keys(transactionsGrouped).map(async accountId => {
      let transactions = transactionsGrouped[accountId];

      let toImport = transactions
        .map(transaction => {
          if (transaction.deleted) {
            return null;
          }

          // Handle subtransactions
          let subtransactions = subtransactionsGrouped[transaction.id];
          if (subtransactions) {
            subtransactions = subtransactions.map(subtrans => {
              return {
                amount: amountFromYnab(subtrans.amount),
                category: entityIdMap.get(subtrans.category_id) || null,
                notes: subtrans.memo
              };
            });
          }

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
          };

          // Handle transfer payee
          if (transaction.transfer_account_id) {
            newTransaction.payee = payees.find(
              p =>
                p.transfer_acct ===
                entityIdMap.get(transaction.transfer_account_id)
            ).id;
          } else {
            newTransaction.payee = entityIdMap.get(transaction.payee_id);
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
    })
  );
}

async function importBudgets(data, entityIdMap) {
  // There should be info in the docs to deal with
  // no credit card category and how YNAB and Actual
  // handle differently the amount To be Budgeted
  // i.e. Actual considers the cc debt while YNAB doesn't
  //
  // Also, there could be a way to set rollover using
  // Deferred Income Subcat and Immediate Income Subcat

  let budgets = sortByKey(data.months, 'month');

  const internalCatIdYnab = data.category_groups.find(
    group => group.name === 'Internal Master Category'
  ).id;
  const creditcardCatIdYnab = data.category_groups.find(
    group => group.name === 'Credit Card Payments'
  ).id;

  await actual.batchBudgetUpdates(async () => {
    for (let budget of budgets) {
      let month = monthFromDate(budget.month);

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
        })
      );
    }
  });
}

// Utils

async function doImport(data) {
  const entityIdMap = new Map();

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

async function importYNAB5(data) {
  if (data.data) {
    data = data.data;
  }

  return actual.runImport(data.budget.name, () => doImport(data.budget));
}

module.exports = { importYNAB5 };
