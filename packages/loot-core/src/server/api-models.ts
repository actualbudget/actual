import * as models from './models';

export const transactionModel = {
  ...models.transactionModel,

  toExternal(transactions, idx, payees) {
    return transactions;
    // function convert(t, payee) {
    //   return {
    //     id: t.id,
    //     account_id: t.acct,
    //     amount: t.amount,
    //     payee_id: payee ? payee.id : null,
    //     payee: payee ? payee.name : null,
    //     imported_payee: t.imported_description,
    //     category_id: t.category,
    //     date: t.date,
    //     notes: t.notes,
    //     imported_id: t.financial_id,
    //     transfer_id: t.transferred_id,
    //     cleared: t.cleared
    //   };
    // }

    // let splits = getAllSplitTransactions(transactions, idx);
    // if (splits) {
    //   let payee =
    //     splits.parent.description && payees[splits.parent.description];

    //   return {
    //     ...convert(splits.parent, payee),
    //     subtransactions: splits.children.map(child => convert(child, payee))
    //   };
    // }

    // let transaction = transactions[idx];
    // let payee = transaction.description && payees[transaction.description];
    // return convert(transaction, payee);
  },

  fromExternal(transaction) {
    let result: Record<string, unknown> = {};
    if ('id' in transaction) {
      result.id = transaction.id;
    }
    if ('account_id' in transaction) {
      result.acct = transaction.account_id;
    }
    if ('amount' in transaction) {
      result.amount = transaction.amount;
    }
    if ('payee_id' in transaction) {
      result.description = transaction.payee_id;
    }
    if ('imported_payee' in transaction) {
      result.imported_description = transaction.imported_payee;
    }
    if ('category_id' in transaction) {
      result.category = transaction.category_id;
    }
    if ('date' in transaction) {
      result.date = transaction.date;
    }
    if ('notes' in transaction) {
      result.notes = transaction.notes;
    }
    if ('imported_id' in transaction) {
      result.financial_id = transaction.imported_id;
    }
    if ('transfer_id' in transaction) {
      result.transferred_id = transaction.transfer_id;
    }
    if ('cleared' in transaction) {
      result.cleared = transaction.cleared;
    }
    return result;
  },
};

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
