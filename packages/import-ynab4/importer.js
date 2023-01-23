// This is a special usage of the API because this package is embedded
// into Actual itself. We only want to pull in the methods in that
// case and ignore everything else; otherwise we'd be pulling in the
// entire backend bundle from the API
const actual = require('@actual-app/api/methods');
const { amountToInteger } = require('@actual-app/api/utils');
const AdmZip = require('adm-zip');
const d = require('date-fns');
const normalizePathSep = require('slash');
const uuid = require('uuid');

// Utils

function mapAccountType(type) {
  switch (type) {
    case 'Cash':
    case 'Checking':
      return 'checking';
    case 'CreditCard':
      return 'credit';
    case 'Savings':
      return 'savings';
    case 'InvestmentAccount':
      return 'investment';
    case 'Mortgage':
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
  return arr.reduce(function (obj, item) {
    var key = item[keyName];
    if (!obj.hasOwnProperty(key)) {
      obj[key] = [];
    }
    obj[key].push(item);
    return obj;
  }, {});
}

function _parse(value) {
  if (typeof value === 'string') {
    // We don't want parsing to take local timezone into account,
    // which parsing a string does. Pass the integers manually to
    // bypass it.

    let [year, month, day] = value.split('-');
    if (day != null) {
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (month != null) {
      return new Date(parseInt(year), parseInt(month) - 1, 1);
    } else {
      return new Date(parseInt(year), 0, 1);
    }
  }
  return value;
}

function monthFromDate(date) {
  return d.format(_parse(date), 'yyyy-MM');
}

function getCurrentMonth() {
  return d.format(new Date(), 'yyyy-MM');
}

// Importer

async function importAccounts(data, entityIdMap) {
  const accounts = sortByKey(data.accounts, 'sortableIndex');

  return Promise.all(
    accounts.map(async account => {
      if (!account.isTombstone) {
        const id = await actual.createAccount({
          type: mapAccountType(account.accountType),
          name: account.accountName,
          offbudget: account.onBudget ? false : true,
          closed: account.hidden ? true : false
        });
        entityIdMap.set(account.entityId, id);
      }
    })
  );
}

async function importCategories(data, entityIdMap) {
  const masterCategories = sortByKey(data.masterCategories, 'sortableIndex');

  await Promise.all(
    masterCategories.map(async masterCategory => {
      if (
        masterCategory.type === 'OUTFLOW' &&
        !masterCategory.isTombstone &&
        masterCategory.subCategories &&
        masterCategory.subCategories.some(cat => !cat.isTombstone) > 0
      ) {
        const id = await actual.createCategoryGroup({
          name: masterCategory.name,
          is_income: false
        });
        entityIdMap.set(masterCategory.entityId, id);

        if (masterCategory.subCategories) {
          const subCategories = sortByKey(
            masterCategory.subCategories,
            'sortableIndex'
          );
          subCategories.reverse();

          // This can't be done in parallel because sort order depends
          // on insertion order
          for (let category of subCategories) {
            if (!category.isTombstone) {
              const id = await actual.createCategory({
                name: category.name,
                group_id: entityIdMap.get(category.masterCategoryId)
              });
              entityIdMap.set(category.entityId, id);
            }
          }
        }
      }
    })
  );
}

async function importPayees(data, entityIdMap) {
  for (let payee of data.payees) {
    if (!payee.isTombstone) {
      let id = await actual.createPayee({
        name: payee.name,
        category: entityIdMap.get(payee.autoFillCategoryId) || null,
        transfer_acct: entityIdMap.get(payee.targetAccountId) || null
      });

      // TODO: import payee rules

      entityIdMap.set(payee.entityId, id);
    }
  }
}

async function importTransactions(data, entityIdMap) {
  const categories = await actual.getCategories();
  const incomeCategoryId = categories.find(cat => cat.name === 'Income').id;
  const accounts = await actual.getAccounts();
  const payees = await actual.getPayees();

  function getCategory(id) {
    if (id == null || id === 'Category/__Split__') {
      return null;
    } else if (
      id === 'Category/__ImmediateIncome__' ||
      id === 'Category/__DeferredIncome__'
    ) {
      return incomeCategoryId;
    }
    return entityIdMap.get(id);
  }

  function isOffBudget(acctId) {
    let acct = accounts.find(acct => acct.id === acctId);
    if (!acct) {
      throw new Error('Could not find account for transaction when importing');
    }
    return acct.offbudget;
  }

  // Go ahead and generate ids for all of the transactions so we can
  // reliably resolve transfers
  for (let transaction of data.transactions) {
    entityIdMap.set(transaction.entityId, uuid.v4());

    if (transaction.subTransactions) {
      for (let subTransaction of transaction.subTransactions) {
        entityIdMap.set(subTransaction.entityId, uuid.v4());
      }
    }
  }

  let sortOrder = 1;
  let transactionsGrouped = groupBy(data.transactions, 'accountId');

  await Promise.all(
    Object.keys(transactionsGrouped).map(async accountId => {
      let transactions = transactionsGrouped[accountId];

      let toImport = transactions
        .map(transaction => {
          if (transaction.isTombstone) {
            return;
          }

          let id = entityIdMap.get(transaction.entityId);

          function transferProperties(t) {
            let transferId = entityIdMap.get(t.transferTransactionId) || null;

            let payee = null;
            if (transferId) {
              payee = payees.find(
                p => p.transfer_acct === entityIdMap.get(t.targetAccountId)
              ).id;
            } else {
              payee = entityIdMap.get(t.payeeId);
            }

            return { transfer_id: transferId, payee };
          }

          let newTransaction = {
            id,
            amount: amountToInteger(transaction.amount),
            category: isOffBudget(entityIdMap.get(accountId))
              ? null
              : getCategory(transaction.categoryId),
            date: transaction.date,
            notes: transaction.memo || null,
            cleared: transaction.cleared === 'Cleared',
            ...transferProperties(transaction)
          };

          newTransaction.subtransactions =
            transaction.subTransactions &&
            transaction.subTransactions.map((t, i) => {
              return {
                amount: amountToInteger(t.amount),
                category: getCategory(t.categoryId),
                notes: t.memo || null,
                ...transferProperties(t)
              };
            });

          return newTransaction;
        })
        .filter(x => x);

      await actual.addTransactions(entityIdMap.get(accountId), toImport);
    })
  );
}

function fillInBudgets(data, categoryBudgets) {
  // YNAB only contains entries for categories that have been actually
  // budgeted. That would be fine except that we need to set the
  // "carryover" flag on each month when carrying debt across months.
  // To make sure our system has a chance to set this flag on each
  // category, make sure a budget exists for every category of every
  // month.
  const budgets = [...categoryBudgets];
  data.masterCategories.forEach(masterCategory => {
    if (masterCategory.subCategories) {
      masterCategory.subCategories.forEach(category => {
        if (!budgets.find(b => b.categoryId === category.entityId)) {
          budgets.push({
            budgeted: 0,
            categoryId: category.entityId
          });
        }
      });
    }
  });
  return budgets;
}

async function importBudgets(data, entityIdMap) {
  let budgets = sortByKey(data.monthlyBudgets, 'month');

  await actual.batchBudgetUpdates(async () => {
    for (let budget of budgets) {
      let filled = fillInBudgets(
        data,
        budget.monthlySubCategoryBudgets.filter(b => !b.isTombstone)
      );

      await Promise.all(
        filled.map(async catBudget => {
          let amount = amountToInteger(catBudget.budgeted);
          let catId = entityIdMap.get(catBudget.categoryId);
          let month = monthFromDate(budget.month);
          if (!catId) {
            return;
          }

          await actual.setBudgetAmount(month, catId, amount);

          if (catBudget.overspendingHandling === 'AffectsBuffer') {
            await actual.setBudgetCarryover(month, catId, false);
          } else if (catBudget.overspendingHandling === 'Confined') {
            await actual.setBudgetCarryover(month, catId, true);
          }
        })
      );
    }
  });
}

function estimateRecentness(str) {
  // The "recentness" is the total amount of changes that this device
  // is aware of, which is estimated by summing up all of the version
  // numbers that its aware of. This works because version numbers are
  // increasing integers.
  return str.split(',').reduce((total, version) => {
    const [_, number] = version.split('-');
    return total + parseInt(number);
  }, 0);
}

function findLatestDevice(zipped, entries) {
  let devices = entries
    .map(entry => {
      const contents = zipped.readFile(entry).toString('utf8');

      let data;
      try {
        data = JSON.parse(contents);
      } catch (e) {
        return null;
      }

      if (data.hasFullKnowledge) {
        return {
          deviceGUID: data.deviceGUID,
          shortName: data.shortDeviceId,
          recentness: estimateRecentness(data.knowledge)
        };
      }

      return null;
    })
    .filter(x => x);

  devices = sortByKey(devices, 'recentness');
  return devices[devices.length - 1].deviceGUID;
}

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

function getBudgetName(filepath) {
  let unixFilepath = normalizePathSep(filepath);

  if (!/\.zip/.test(unixFilepath)) {
    return null;
  }

  unixFilepath = unixFilepath.replace(/\.zip$/, '').replace(/.ynab4$/, '');

  // Most budgets are named like "Budget~51938D82.ynab4" but sometimes
  // they are only "Budget.ynab4". We only want to grab the name
  // before the ~ if it exists.
  let m = unixFilepath.match(/([^/~]+)[^/]*$/);
  if (!m) {
    return null;
  }
  return m[1];
}

function getFile(entries, path) {
  let files = entries.filter(e => e.entryName === path);
  if (files.length === 0) {
    throw new Error('Could not find file: ' + path);
  }
  if (files.length >= 2) {
    throw new Error('File name matches multiple files: ' + path);
  }
  return files[0];
}

function join(...paths) {
  return paths.slice(1).reduce((full, path) => {
    return full + '/' + path.replace(/^\//, '');
  }, paths[0].replace(/\/$/, ''));
}

async function importBuffer(filepath, buffer) {
  let budgetName = getBudgetName(filepath);

  if (!budgetName) {
    throw new Error('Not a YNAB4 file: ' + filepath);
  }

  let zipped = new AdmZip(buffer);
  let entries = zipped.getEntries();

  let root = '';
  let dirMatch = entries[0].entryName.match(/([^/]*\.ynab4)/);
  if (dirMatch) {
    root = dirMatch[1] + '/';
  }

  let metaStr = zipped.readFile(getFile(entries, root + 'Budget.ymeta'));
  let meta = JSON.parse(metaStr.toString('utf8'));
  let budgetPath = join(root, meta.relativeDataFolderName);

  let deviceFiles = entries.filter(e =>
    e.entryName.startsWith(join(budgetPath, 'devices'))
  );
  let deviceGUID = findLatestDevice(zipped, deviceFiles);

  const yfullPath = join(budgetPath, deviceGUID, 'Budget.yfull');
  let contents;
  try {
    contents = zipped.readFile(getFile(entries, yfullPath)).toString('utf8');
  } catch (e) {
    console.log(e);
    throw new Error('Error reading Budget.yfull file');
  }

  let data;
  try {
    data = JSON.parse(contents);
  } catch (e) {
    throw new Error('Error parsing Budget.yull file');
  }

  return actual.runImport(budgetName, () => doImport(data));
}

module.exports = { importBuffer };
