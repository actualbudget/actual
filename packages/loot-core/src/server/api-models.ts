import type {
  AccountEntity,
  CategoryEntity,
  CategoryGroupEntity,
  PayeeEntity,
} from '../types/models';

import * as models from './models';

export type APIAccountEntity = Pick<AccountEntity, 'id' | 'name'> & {
  offbudget: boolean;
  closed: boolean;
};

export const accountModel = {
  ...models.accountModel,

  toExternal(account: AccountEntity): APIAccountEntity {
    return {
      id: account.id,
      name: account.name,
      offbudget: account.offbudget ? true : false,
      closed: account.closed ? true : false,
    };
  },

  fromExternal(account: APIAccountEntity) {
    const result = { ...account } as unknown as AccountEntity;
    if ('offbudget' in account) {
      result.offbudget = account.offbudget ? 1 : 0;
    }
    if ('closed' in account) {
      result.closed = account.closed ? 1 : 0;
    }
    return result;
  },
};

export type APICategoryEntity = Pick<
  CategoryEntity,
  'id' | 'name' | 'is_income' | 'hidden'
> & {
  group_id?: string;
};

export const categoryModel = {
  ...models.categoryModel,

  toExternal(category: CategoryEntity): APICategoryEntity {
    return {
      id: category.id,
      name: category.name,
      is_income: category.is_income ? true : false,
      hidden: category.hidden ? true : false,
      group_id: category.cat_group,
    };
  },

  fromExternal(category: APICategoryEntity) {
    const { group_id: _, ...result }: { group_id?: string } & CategoryEntity =
      category;

    if ('group_id' in category) {
      result.cat_group = category.group_id;
    }
    return result;
  },
};

export type APICategoryGroupEntity = Pick<
  CategoryGroupEntity,
  'id' | 'name' | 'is_income' | 'hidden'
> & {
  categories: APICategoryEntity[];
};

export const categoryGroupModel = {
  ...models.categoryGroupModel,

  toExternal(group: CategoryGroupEntity): APICategoryGroupEntity {
    return {
      id: group.id,
      name: group.name,
      is_income: group.is_income ? true : false,
      hidden: group.hidden ? true : false,
      categories: group.categories?.map(categoryModel.toExternal) || [],
    };
  },

  fromExternal(group: APICategoryGroupEntity) {
    const result = { ...group } as unknown as CategoryGroupEntity;
    if ('categories' in group) {
      result.categories = group.categories.map(categoryModel.fromExternal);
    }
    return result;
  },
};

export type APIPayeeEntity = Pick<PayeeEntity, 'id' | 'name' | 'transfer_acct'>;

export const payeeModel = {
  ...models.payeeModel,

  toExternal(payee: PayeeEntity) {
    return {
      id: payee.id,
      name: payee.name,
      transfer_acct: payee.transfer_acct,
    };
  },

  fromExternal(payee: APIPayeeEntity) {
    // No translation is needed
    return payee as PayeeEntity;
  },
};
