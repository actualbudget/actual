import {
  AccountEntity,
  CategoryEntity,
  CategoryGroupEntity,
  PayeeEntity,
  TransactionEntity,
} from '../types/models';

import {
  DbAccount,
  DbCategory,
  DbCategoryGroup,
  DbPayee,
  DbTransaction,
  DbViewTransactionInternal,
} from './db';
import { ValidationError } from './errors';

export function requiredFields<T extends object, K extends keyof T>(
  name: string,
  row: T,
  fields: K[],
  update?: boolean,
) {
  fields.forEach(field => {
    if (update) {
      if (row.hasOwnProperty(field) && row[field] == null) {
        throw new ValidationError(`${name} is missing field ${String(field)}`);
      }
    } else {
      if (!row.hasOwnProperty(field) || row[field] == null) {
        throw new ValidationError(`${name} is missing field ${String(field)}`);
      }
    }
  });
}

export function toDateRepr(str: string) {
  if (typeof str !== 'string') {
    throw new Error('toDateRepr not passed a string: ' + str);
  }

  return parseInt(str.replace(/-/g, ''));
}

export function fromDateRepr(number: number) {
  if (typeof number !== 'number') {
    throw new Error('fromDateRepr not passed a number: ' + number);
  }

  const dateString = number.toString();
  return (
    dateString.slice(0, 4) +
    '-' +
    dateString.slice(4, 6) +
    '-' +
    dateString.slice(6)
  );
}

export const accountModel = {
  validate(account: Partial<DbAccount>, { update }: { update?: boolean } = {}) {
    requiredFields(
      'account',
      account,
      update ? ['name', 'offbudget', 'closed'] : ['name'],
      update,
    );

    return account;
  },
  fromDbArray(accounts: DbAccount[]): AccountEntity[] {
    return accounts.map(account => accountModel.fromDb(account));
  },
  fromDb(account: DbAccount): AccountEntity {
    return {
      id: account.id,
      name: account.name,
      account_id: account.account_id ?? null,
      offbudget: account.offbudget === 1,
      closed: account.closed === 1,
      sort_order: account.sort_order,
      tombstone: account.tombstone === 1,
      account_sync_source: account.account_sync_source ?? null,
      balance_available: account.balance_available ?? null,
      balance_current: account.balance_current ?? null,
      balance_limit: account.balance_limit ?? null,
      bank: account.bank ?? null,
      mask: account.mask ?? null,
      official_name: account.official_name ?? null,
    } as AccountEntity;
  },
  toDb(account: AccountEntity): DbAccount {
    return {
      id: account.id,
      name: account.name,
      offbudget: account.offbudget ? 1 : 0,
      closed: account.closed ? 1 : 0,
      tombstone: account.tombstone ? 1 : 0,
      sort_order: account.sort_order,
      account_sync_source: account.account_sync_source,
      account_id: account.account_id,
      balance_available: account.balance_available,
      balance_current: account.balance_current,
      balance_limit: account.balance_limit,
      bank: account.bank,
      mask: account.mask,
      official_name: account.official_name,
      // No longer used
      // type,
      // subtype,
    };
  },
};

export const categoryModel = {
  validate(
    category: Partial<DbCategory>,
    { update }: { update?: boolean } = {},
  ) {
    requiredFields(
      'category',
      category,
      update ? ['name', 'is_income', 'cat_group'] : ['name', 'cat_group'],
      update,
    );

    const { sort_order, ...rest } = category;
    return { ...rest, hidden: rest.hidden ? (1 as const) : (0 as const) };
  },
  fromDbArray(categories: DbCategory[]): CategoryEntity[] {
    return categories.map(category => categoryModel.fromDb(category));
  },
  fromDb(category: DbCategory): CategoryEntity {
    return {
      id: category.id,
      name: category.name,
      is_income: category.is_income === 1,
      cat_group: category.cat_group,
      sort_order: category.sort_order,
      tombstone: category.tombstone === 1,
      hidden: category.hidden === 1,
      goal_def: category.goal_def ?? undefined,
    };
  },
  toDb(category: CategoryEntity): DbCategory {
    if (!category.cat_group) {
      throw new Error('Category missing cat_group');
    }
    return {
      id: category.id,
      name: category.name,
      is_income: category.is_income ? 1 : 0,
      cat_group: category.cat_group,
      sort_order: category.sort_order ?? 0,
      tombstone: category.tombstone ? 1 : 0,
      hidden: category.hidden ? 1 : 0,
      goal_def: category.goal_def,
    };
  },
};

export const categoryGroupModel = {
  validate(
    categoryGroup: Partial<DbCategoryGroup>,
    { update }: { update?: boolean } = {},
  ) {
    requiredFields(
      'categoryGroup',
      categoryGroup,
      update ? ['name', 'is_income'] : ['name'],
      update,
    );

    const { sort_order, ...rest } = categoryGroup;
    return { ...rest, hidden: rest.hidden ? 1 : 0 };
  },
  fromDbArray(
    grouped: [DbCategoryGroup, ...DbCategory[]][],
  ): CategoryGroupEntity[] {
    return grouped.map(([group, ...categories]) =>
      categoryGroupModel.fromDb(group, categories),
    );
  },
  fromDb(
    categoryGroup: DbCategoryGroup,
    categories: DbCategory[] = [],
  ): CategoryGroupEntity {
    return {
      id: categoryGroup.id,
      name: categoryGroup.name,
      is_income: categoryGroup.is_income === 1,
      sort_order: categoryGroup.sort_order,
      hidden: categoryGroup.hidden === 1,
      tombstone: categoryGroup.tombstone === 1,
      categories: categories
        .filter(category => category.cat_group === categoryGroup.id)
        .map(category => categoryModel.fromDb(category)),
    };
  },
};

export const payeeModel = {
  validate(payee: Partial<DbPayee>, { update }: { update?: boolean } = {}) {
    requiredFields('payee', payee, ['name'], update);
    return payee;
  },
  fromDbArray(payees: DbPayee[]): PayeeEntity[] {
    return payees.map(payee => payeeModel.fromDb(payee));
  },
  fromDb(payee: DbPayee): PayeeEntity {
    return {
      id: payee.id,
      name: payee.name,
      favorite: payee.favorite === 1,
      learn_categories: payee.learn_categories === 1,
      tombstone: payee.tombstone === 1,
      transfer_acct: payee.transfer_acct ?? undefined,
    };
  },
  toDb(payee: PayeeEntity): DbPayee {
    return {
      id: payee.id,
      name: payee.name,
      favorite: payee.favorite ? 1 : 0,
      learn_categories: payee.learn_categories ? 1 : 0,
      tombstone: payee.tombstone ? 1 : 0,
      transfer_acct: payee.transfer_acct,
      // No longer used
      // category
    };
  },
};

export const transactionModel = {
  validate(
    transaction: Partial<DbTransaction>,
    { update }: { update?: boolean } = {},
  ) {
    requiredFields(
      'transaction',
      transaction,
      ['date', 'amount', 'acct'],
      update,
    );
    return transaction;
  },
  fromDbView(
    transaction: DbViewTransactionInternal,
    subtransactions: DbViewTransactionInternal[] = [],
  ): TransactionEntity {
    return {
      id: transaction.id,
      date: fromDateRepr(transaction.date),
      amount: transaction.amount,
      payee: transaction.payee ?? undefined,
      account: transaction.account ?? undefined,
      category: transaction.category ?? undefined,
      transfer_id: transaction.transfer_id ?? undefined,
      imported_id: transaction.imported_id ?? undefined,
      error: transaction.error ? JSON.parse(transaction.error) : undefined,
      imported_payee: transaction.imported_payee ?? undefined,
      starting_balance_flag: transaction.starting_balance_flag === 1,
      notes: transaction.notes ?? undefined,
      cleared: transaction.cleared === 1,
      reconciled: transaction.reconciled === 1,
      subtransactions: subtransactions.map(subtransaction =>
        transactionModel.fromDbView(subtransaction),
      ),
      schedule: transaction.schedule ?? undefined,
      is_child: transaction.is_child === 1,
      is_parent: transaction.is_parent === 1,
      parent_id: transaction.parent_id ?? undefined,
      sort_order: transaction.sort_order,
      tombstone: transaction.tombstone === 1,
    };
  },
  fromDb(
    transaction: DbTransaction,
    subtransactions: DbTransaction[] = [],
  ): TransactionEntity {
    return {
      id: transaction.id,
      date: fromDateRepr(transaction.date),
      amount: transaction.amount,
      // payee: transaction.payee_id,
      account: transaction.acct,
      category: transaction.category ?? undefined,
      transfer_id: transaction.transferred_id ?? undefined,
      notes: transaction.notes ?? undefined,
      cleared: transaction.cleared === 1,
      reconciled: transaction.reconciled === 1,
      error: transaction.error ? JSON.parse(transaction.error) : undefined,
      imported_id: transaction.financial_id ?? undefined,
      imported_payee: transaction.imported_description ?? undefined,
      starting_balance_flag: transaction.starting_balance_flag === 1,
      schedule: transaction.schedule ?? undefined,
      sort_order: transaction.sort_order,
      tombstone: transaction.tombstone === 1,
      is_child: transaction.isChild === 1,
      is_parent: transaction.isParent === 1,
      parent_id: transaction.parent_id ?? undefined,
      subtransactions: subtransactions.map(subtransaction =>
        transactionModel.fromDb(subtransaction),
      ),
      payee: transaction.description ?? undefined,
    };
  },
  toDb(transaction: TransactionEntity): DbTransaction {
    return {
      id: transaction.id,
      date: toDateRepr(transaction.date),
      amount: transaction.amount,
      description: transaction.payee,
      acct: transaction.account,
      category: transaction.category,
      transferred_id: transaction.transfer_id,
      notes: transaction.notes,
      error: JSON.stringify(transaction.error),
      financial_id: transaction.imported_id,
      imported_description: transaction.imported_payee,
      schedule: transaction.schedule,
      sort_order: transaction.sort_order ?? 0,
      tombstone: transaction.tombstone ? 1 : 0,
      isChild: transaction.is_child ? 1 : 0,
      isParent: transaction.is_parent ? 1 : 0,
      parent_id: transaction.parent_id,
      starting_balance_flag: transaction.starting_balance_flag ? 1 : 0,
      cleared: transaction.cleared ? 1 : 0,
      reconciled: transaction.reconciled ? 1 : 0,
    };
  },
};
