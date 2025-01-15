import { v4 as uuidv4 } from 'uuid';

import * as monthUtils from '../shared/months';
import type {
  _SyncFields,
  AccountEntity,
  CategoryEntity,
  CategoryGroupEntity,
  NewCategoryGroupEntity,
  TransactionEntity,
} from '../types/models';

import { random } from './random';

export function generateAccount(
  name: AccountEntity['name'],
  isConnected?: boolean,
  offbudget?: boolean,
): AccountEntity & { bankId: number | null; bankName: string | null } {
  const offlineAccount: AccountEntity & {
    bankId: number | null;
    bankName: string | null;
  } = {
    id: uuidv4(),
    name,
    bankId: null,
    bankName: null,
    offbudget: offbudget ? 1 : 0,
    sort_order: 0,
    tombstone: 0,
    closed: 0,
    ...emptySyncFields(),
  };

  if (isConnected) {
    return {
      ...offlineAccount,
      balance_current: Math.floor(random() * 100000),
      bankId: Math.floor(random() * 10000),
      bankName: 'boa',
      bank: Math.floor(random() * 10000).toString(),
      account_id: 'idx',
      mask: 'xxx',
      official_name: 'boa',
      balance_available: 0,
      balance_limit: 0,
      account_sync_source: 'goCardless',
    };
  }

  return offlineAccount;
}

function emptySyncFields(): _SyncFields<false> {
  return {
    account_id: null,
    bank: null,
    mask: null,
    official_name: null,
    balance_current: null,
    balance_available: null,
    balance_limit: null,
    account_sync_source: null,
  };
}

let sortOrder = 1;
export function generateCategory(
  name: string,
  group: string,
  isIncome: boolean = false,
): CategoryEntity {
  return {
    id: uuidv4(),
    name,
    cat_group: group,
    is_income: isIncome,
    sort_order: sortOrder++,
  };
}

let groupSortOrder = 1;
export function generateCategoryGroup(
  name: string,
  isIncome: boolean = false,
): CategoryGroupEntity {
  return {
    id: uuidv4(),
    name,
    is_income: isIncome,
    sort_order: groupSortOrder++,
  };
}

export function generateCategoryGroups(
  definition: Partial<NewCategoryGroupEntity>[],
): CategoryGroupEntity[] {
  return definition.map(group => {
    const g = generateCategoryGroup(group.name ?? '', group.is_income);

    return {
      ...g,
      categories: group.categories?.map(cat =>
        generateCategory(cat.name, g.id, cat.is_income),
      ),
    };
  });
}

function _generateTransaction(
  data: Partial<TransactionEntity> & Pick<TransactionEntity, 'account'>,
): TransactionEntity {
  return {
    id: data.id || uuidv4(),
    amount: data.amount || Math.floor(random() * 10000 - 7000),
    payee: data.payee || 'payed-to',
    notes: 'Notes',
    account: data.account,
    date: data.date || monthUtils.currentDay(),
    category: data.category,
    sort_order: data.sort_order != null ? data.sort_order : 1,
    cleared: false,
  };
}

export function generateTransaction(
  data: Partial<TransactionEntity> & Pick<TransactionEntity, 'account'>,
  splitAmount?: number,
  showError: boolean = false,
) {
  const result: TransactionEntity[] = [];

  const trans = _generateTransaction(data);
  result.push(trans);

  if (splitAmount) {
    const parent = trans;
    parent.is_parent = true;

    result.push(
      {
        id: parent.id + '/' + uuidv4(),
        amount: trans.amount - splitAmount,
        account: parent.account,
        date: parent.date,
        is_child: true,
      },
      {
        id: parent.id + '/' + uuidv4(),
        amount: splitAmount,
        account: parent.account,
        date: parent.date,
        is_child: true,
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
  count: number,
  accountId: string,
  groupId: string,
  splitAtIndexes: number[] = [],
  showError: boolean = false,
): TransactionEntity[] {
  const transactions: TransactionEntity[] = [];

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
