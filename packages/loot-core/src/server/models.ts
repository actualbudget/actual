import {
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
import { DbAccount, DbCategory, DbCategoryGroup, DbPayee } from './db';
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
};

export const categoryModel = {
  validate(
    category: Partial<DbCategory>,
    { update }: { update?: boolean } = {},
  ): DbCategory {
    requiredFields(
      'category',
      category,
      update ? ['name', 'is_income', 'cat_group'] : ['name', 'cat_group'],
      update,
    );

    const { sort_order, ...rest } = category;
    return { ...rest } as DbCategory;
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
  fromDb(category: DbCategory): CategoryEntity {
    return convertFromSelect(
      schema,
      schemaConfig,
      'categories',
      category,
    ) as CategoryEntity;
  },
};

export const categoryGroupModel = {
  validate(
    categoryGroup: Partial<DbCategoryGroup>,
    { update }: { update?: boolean } = {},
  ): DbCategoryGroup {
    requiredFields(
      'categoryGroup',
      categoryGroup,
      update ? ['name', 'is_income'] : ['name'],
      update,
    );

    const { sort_order, ...rest } = categoryGroup;
    return { ...rest } as DbCategoryGroup;
  },
  toDb(
    categoryGroup: CategoryGroupEntity,
    { update }: { update?: boolean } = {},
  ): DbCategoryGroup {
    return (
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
  },
  fromDb(
    categoryGroup: DbCategoryGroup & {
      categories: DbCategory[];
    },
  ): CategoryGroupEntity {
    const { categories, ...rest } = categoryGroup;
    const categoryGroupEntity = convertFromSelect(
      schema,
      schemaConfig,
      'category_groups',
      rest,
    ) as CategoryGroupEntity;

    return {
      ...categoryGroupEntity,
      categories: categories
        .filter(category => category.cat_group === categoryGroup.id)
        .map(categoryModel.fromDb),
    };
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
};
