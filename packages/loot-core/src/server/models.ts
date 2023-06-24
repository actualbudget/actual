export function requiredFields(name, row, fields, update) {
  fields.forEach(field => {
    if (update) {
      if (row.hasOwnProperty(field) && row[field] == null) {
        throw new Error(`${name} is missing field ${field}`);
      }
    } else {
      if (!row.hasOwnProperty(field) || row[field] == null) {
        throw new Error(`${name} is missing field ${field}`);
      }
    }
  });
}

export function toDateRepr(str) {
  if (typeof str !== 'string') {
    throw new Error('toDateRepr not passed a string: ' + str);
  }

  return parseInt(str.replace(/-/g, ''));
}

export function fromDateRepr(number) {
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
  validate(account, { update }: { update?: boolean } = {}) {
    requiredFields(
      'account',
      account,
      update ? ['name', 'offbudget', 'closed'] : ['name'],
      update,
    );

    return account;
  },
};

export const categoryModel = {
  validate(category, { update }: { update?: boolean } = {}) {
    requiredFields(
      'category',
      category,
      update ? ['name', 'is_income', 'cat_group'] : ['name', 'cat_group'],
      update,
    );

    let { sort_order, ...rest } = category;
    return rest;
  },
};

export const categoryGroupModel = {
  validate(categoryGroup, { update }: { update?: boolean } = {}) {
    requiredFields(
      'categoryGroup',
      categoryGroup,
      update ? ['name', 'is_income'] : ['name'],
      update,
    );

    let { sort_order, ...rest } = categoryGroup;
    return rest;
  },
};

export const payeeModel = {
  validate(payee, { update }: { update?: boolean } = {}) {
    requiredFields('payee', payee, ['name'], update);
    return payee;
  },
};

export const transactionModel = {
  validate(trans, { update }: { update?: boolean } = {}) {
    requiredFields('transaction', trans, ['date', 'acct'], update);

    if ('date' in trans) {
      // Make sure it's the right format, and also do a sanity check.
      // Really old dates can mess up the system and can happen by
      // accident
      if (
        trans.date.match(/^\d{4}-\d{2}-\d{2}$/) == null ||
        trans.date < '2000-01-01'
      ) {
        throw new Error('Invalid transaction date: ' + trans.date);
      }
    }

    return trans;
  },

  toJS(row) {
    // Check a non-important field that typically wouldn't be passed in
    // manually, and use it as a smoke test to see if this is a
    // fully-formed transaction or not.
    if (!('location' in row)) {
      throw new Error(
        'A full transaction is required to be passed to `toJS`. Instead got: ' +
          JSON.stringify(row),
      );
    }

    let trans = { ...row };
    trans.error = row.error ? JSON.parse(row.error) : null;
    trans.isParent = row.isParent === 1 ? true : false;
    trans.isChild = row.isChild === 1 ? true : false;
    trans.starting_balance_flag =
      row.starting_balance_flag === 1 ? true : false;
    trans.cleared = row.cleared === 1 ? true : false;
    trans.pending = row.pending === 1 ? true : false;
    trans.date = trans.date && fromDateRepr(trans.date);
    return trans;
  },

  fromJS(trans) {
    let row = { ...trans };
    if ('error' in row) {
      row.error = trans.error ? JSON.stringify(trans.error) : null;
    }
    if ('isParent' in row) {
      row.isParent = trans.isParent ? 1 : 0;
    }
    if ('isChild' in row) {
      row.isChild = trans.isChild ? 1 : 0;
    }
    if ('cleared' in row) {
      row.cleared = trans.cleared ? 1 : 0;
    }
    if ('pending' in row) {
      row.pending = trans.pending ? 1 : 0;
    }
    if ('starting_balance_flag' in row) {
      row.starting_balance_flag = trans.starting_balance_flag ? 1 : 0;
    }
    if ('date' in row) {
      row.date = toDateRepr(trans.date);
    }

    return row;
  },
};
