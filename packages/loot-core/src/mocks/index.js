import * as monthUtils from '../shared/months';

const uuid = require('../platform/uuid');

export function generateAccount(name, isConnected, type, offbudget) {
  return {
    id: uuid.v4Sync(),
    name,
    balance_current: isConnected ? Math.floor(Math.random() * 100000) : null,
    bank: isConnected ? Math.floor(Math.random() * 10000) : null,
    bankId: isConnected ? Math.floor(Math.random() * 10000) : null,
    bankName: isConnected ? 'boa' : null,
    type: type || 'checking',
    offbudget: offbudget ? 1 : 0,
    closed: 0
  };
}

let sortOrder = 1;
export function generateCategory(name, group, isIncome = false) {
  return {
    id: uuid.v4Sync(),
    name: name,
    cat_group: group,
    is_income: isIncome ? 1 : 0,
    sort_order: sortOrder++
  };
}

let groupSortOrder = 1;
export function generateCategoryGroup(name, isIncome = false) {
  return {
    id: uuid.v4Sync(),
    name: name,
    is_income: isIncome ? 1 : 0,
    sort_order: groupSortOrder++
  };
}

export function generateCategoryGroups(definition) {
  return definition.map(group => {
    const g = generateCategoryGroup(group.name, group.is_income);

    return {
      ...g,
      categories: group.categories.map(cat =>
        generateCategory(cat.name, g.id, cat.is_income)
      )
    };
  });
}

function _generateTransaction(data) {
  const id = data.id || uuid.v4Sync();
  return {
    id: id,
    amount: data.amount || Math.floor(Math.random() * 10000 - 7000),
    payee: data.payee || (Math.random() < 0.9 ? 'payed-to' : 'guy'),
    notes:
      Math.random() < 0.1 ? 'A really long note that should overflow' : 'Notes',
    account: data.account,
    date: data.date || monthUtils.currentDay(),
    category: data.category,
    sort_order: data.sort_order != null ? data.sort_order : 1,
    cleared: false,
    error: null
  };
}

export function generateTransaction(data, splitAmount, showError = false) {
  const result = [];

  const trans = _generateTransaction(data);
  result.push(trans);

  if (splitAmount) {
    const parent = trans;
    parent.isParent = true;

    result.push(
      {
        id: parent.id + '/' + uuid.v4Sync(),
        amount: trans.amount - splitAmount,
        account: parent.account,
        date: parent.date,
        notes: null,
        category: null,
        isChild: true
      },
      {
        id: parent.id + '/' + uuid.v4Sync(),
        amount: splitAmount,
        account: parent.account,
        date: parent.date,
        notes: null,
        category: null,
        isChild: true
      }
    );

    if (showError) {
      const last = result[result.length - 1];
      last.amount += 500;
      last.error = {
        type: 'SplitTransactionError',
        version: 1,
        difference: 500
      };
    }
  }

  return result;
}

export function generateTransactions(
  count,
  accountId,
  groupId,
  splitAtIndexes = [],
  showError = false
) {
  const transactions = [];

  for (let i = 0; i < count; i++) {
    const isSplit = splitAtIndexes.includes(i);

    transactions.push.apply(
      transactions,
      generateTransaction(
        {
          account: accountId,
          category: groupId,
          amount: isSplit ? 50 : undefined,
          sort_order: i
        },
        isSplit ? 30 : undefined,
        showError
      )
    );
  }

  return transactions;
}
