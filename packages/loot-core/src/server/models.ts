import {
  AccountEntity,
  CategoryEntity,
  CategoryGroupEntity,
  PayeeEntity,
} from '../types/models';

import {
  convertForInsert,
  convertForUpdate,
  convertFromSelect,
  schema,
  schemaConfig,
} from './aql';
import {
  DbAccount,
  DbCategory,
  DbCategoryGroup,
  DbPayee,
  DbTransaction,
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

    return account as DbAccount;
  },
  fromDbArray(accounts: DbAccount[]): AccountEntity[] {
    return accounts.map(account => accountModel.fromDb(account));
  },
  fromDb(account: DbAccount): AccountEntity {
    return convertFromSelect(
      schema,
      schemaConfig,
      'accounts',
      account,
    ) as AccountEntity;
  },
  toDb(
    account: AccountEntity,
    { update }: { update?: boolean } = {},
  ): DbAccount {
    return (
      update
        ? convertForUpdate(schema, schemaConfig, 'accounts', account)
        : convertForInsert(schema, schemaConfig, 'accounts', account)
    ) as DbAccount;
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
    return { ...rest, hidden: rest.hidden ? 1 : 0 } as DbCategory;
  },
  fromDbArray(categories: DbCategory[]): CategoryEntity[] {
    return categories.map(category => categoryModel.fromDb(category));
  },
  fromDb(category: DbCategory): CategoryEntity {
    return convertFromSelect(
      schema,
      schemaConfig,
      'categories',
      category,
    ) as CategoryEntity;
  },
  toDb(
    category: CategoryEntity,
    { update }: { update?: boolean } = {},
  ): DbCategory {
    return (
      update
        ? convertForUpdate(schema, schemaConfig, 'categories', category)
        : convertForInsert(schema, schemaConfig, 'categories', category)
    ) as DbCategory;
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
    return { ...rest, hidden: rest.hidden ? 1 : 0 } as DbCategoryGroup;
  },
  fromDbArray(
    grouped: [DbCategoryGroup, ...DbCategory[]][],
  ): CategoryGroupEntity[] {
    return grouped.map(([group, ...categories]) =>
      categoryGroupModel.fromDb(group, ...categories),
    );
  },
  fromDb(
    categoryGroup: DbCategoryGroup,
    ...categories: DbCategory[]
  ): CategoryGroupEntity {
    const group = convertFromSelect(
      schema,
      schemaConfig,
      'category_groups',
      categoryGroup,
    ) as CategoryGroupEntity;
    return {
      ...group,
      categories: categories
        .filter(category => category.cat_group === categoryGroup.id)
        .map(category => categoryModel.fromDb(category)),
    };
  },
  toDb(
    categoryGroup: CategoryGroupEntity,
    { update }: { update?: boolean } = {},
  ): [DbCategoryGroup, ...DbCategory[]] {
    const group = (
      update
        ? convertForUpdate(
            schema,
            schemaConfig,
            'category_groups',
            categoryGroup,
          )
        : convertForInsert(
            schema,
            schemaConfig,
            'category_groups',
            categoryGroup,
          )
    ) as DbCategoryGroup;
    const categories =
      categoryGroup.categories?.map(category => categoryModel.toDb(category)) ||
      [];
    return [group, ...categories];
  },
};

export const payeeModel = {
  validate(payee: Partial<DbPayee>, { update }: { update?: boolean } = {}) {
    requiredFields('payee', payee, update ? [] : ['name'], update);
    return payee as DbPayee;
  },
  toDb(payee: PayeeEntity, { update }: { update?: boolean } = {}): DbPayee {
    return (
      update
        ? convertForUpdate(schema, schemaConfig, 'payees', payee)
        : convertForInsert(schema, schemaConfig, 'payees', payee)
    ) as DbPayee;
  },
  fromDb(payee: DbPayee): PayeeEntity {
    return convertFromSelect(
      schema,
      schemaConfig,
      'payees',
      payee,
    ) as PayeeEntity;
  },
  fromDbArray(payees: DbPayee[]): PayeeEntity[] {
    return payees.map(payee => payeeModel.fromDb(payee));
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
};
