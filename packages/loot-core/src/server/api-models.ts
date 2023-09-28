import * as models from './models';

export const accountModel = {
  ...models.accountModel,

  toExternal(account) {
    return {
      id: account.id,
      name: account.name,
      offbudget: account.offbudget ? true : false,
      closed: account.closed ? true : false,
    };
  },

  fromExternal(account) {
    let result = { ...account };
    if ('offbudget' in account) {
      result.offbudget = account.offbudget ? 1 : 0;
    }
    if ('closed' in account) {
      result.closed = account.closed ? 1 : 0;
    }
    return result;
  },
};

export const categoryModel = {
  ...models.categoryModel,

  toExternal(category) {
    return {
      id: category.id,
      name: category.name,
      is_income: category.is_income ? true : false,
      group_id: category.cat_group,
    };
  },

  fromExternal(category) {
    let { group_id: _, ...result } = category;
    if ('is_income' in category) {
      result.is_income = category.is_income ? 1 : 0;
    }
    if ('group_id' in category) {
      result.cat_group = category.group_id;
    }
    return result;
  },
};

export const categoryGroupModel = {
  ...models.categoryGroupModel,

  toExternal(group) {
    return {
      id: group.id,
      name: group.name,
      is_income: group.is_income ? true : false,
      categories: group.categories.map(categoryModel.toExternal),
    };
  },

  fromExternal(group) {
    let result = { ...group };
    if ('is_income' in group) {
      result.is_income = group.is_income ? 1 : 0;
    }
    if ('categories' in group) {
      result.categories = group.categories.map(categoryModel.fromExternal);
    }
    return result;
  },
};

export const payeeModel = {
  ...models.payeeModel,

  toExternal(payee) {
    return {
      id: payee.id,
      name: payee.name,
      category: payee.category,
      transfer_acct: payee.transfer_acct,
    };
  },

  fromExternal(payee) {
    // No translation is needed
    return payee;
  },
};
