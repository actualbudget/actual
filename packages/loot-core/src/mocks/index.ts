import { v4 as uuidv4 } from 'uuid';

import * as monthUtils from '../shared/months';
import type { TransactionEntity } from '../types/models';

export function generateAccount(name, isConnected, offbudget) {
  return {
    id: uuidv4(),
    name,
    balance_current: isConnected ? Math.floor(Math.random() * 100000) : null,
    bank: isConnected ? Math.floor(Math.random() * 10000) : null,
    bankId: isConnected ? Math.floor(Math.random() * 10000) : null,
    bankName: isConnected ? 'boa' : null,
    offbudget: offbudget ? 1 : 0,
    closed: 0,
  };
}

let sortOrder = 1;
export function generateCategory(name, group, isIncome = false) {
  return {
    id: uuidv4(),
    name: name,
    cat_group: group,
    is_income: isIncome ? 1 : 0,
    sort_order: sortOrder++,
  };
}

let groupSortOrder = 1;
export function generateCategoryGroup(name, isIncome = false) {
  return {
    id: uuidv4(),
    name: name,
    is_income: isIncome ? 1 : 0,
    sort_order: groupSortOrder++,
  };
}

export function generateCategoryGroups(definition) {
  return definition.map(group => {
    const g = generateCategoryGroup(group.name, group.is_income);

    return {
      ...g,
      categories: group.categories.map(cat =>
        generateCategory(cat.name, g.id, cat.is_income),
      ),
    };
  });
}

function _generateTransaction(data): TransactionEntity {
  const id = data.id || uuidv4();
  return {
    id: id,
    amount: data.amount || Math.floor(Math.random() * 10000 - 7000),
    payee: data.payee || 'payed-to',
    notes: 'Notes',
    account: data.account,
    date: data.date || monthUtils.currentDay(),
    category: data.category,
    sort_order: data.sort_order != null ? data.sort_order : 1,
    cleared: false,
    error: null,
  };
}

export function generateTransaction(data, splitAmount?, showError = false) {
  const result = [];

  const trans = _generateTransaction(data);
  result.push(trans);

  if (splitAmount) {
    const parent = trans;
    parent.isParent = true;

    result.push(
      {
        id: parent.id + '/' + uuidv4(),
        amount: trans.amount - splitAmount,
        account: parent.account,
        date: parent.date,
        notes: null,
        category: null,
        isChild: true,
      },
      {
        id: parent.id + '/' + uuidv4(),
        amount: splitAmount,
        account: parent.account,
        date: parent.date,
        notes: null,
        category: null,
        isChild: true,
      },
    );

    if (showError) {
      const last = result[result.length - 1];
      last.amount += 500;
      last.error = {
        type: 'SplitTransactionError',
        version: 1,
        difference: 500,
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
  showError = false,
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
          sort_order: i,
        },
        isSplit ? 30 : undefined,
        showError,
      ),
    );
  }

  return transactions;
}
