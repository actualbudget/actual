import fc from 'fast-check';

import { schema } from '../server/aql';
import { addDays } from '../shared/months';

function typeArbitrary(typeDesc, name) {
  let arb;
  switch (typeDesc.type) {
    case 'id':
      // uuid shrinking is broken right now, will file an issue
      arb = fc.hexaString({ minLength: 30, maxLength: 30 });
      break;
    case 'boolean':
      arb = fc.boolean();
      break;
    case 'integer':
      arb = fc.integer();
      break;
    case 'float':
      arb = fc.float();
      break;
    case 'string':
      arb = fc.string();
      break;
    case 'date':
      arb = fc.integer(0, 365 * 4).map(n => {
        return addDays('2018-01-01', n);
      });
      break;
    case 'json':
      arb = fc.constant(null);
      break;
    default:
      throw new Error('Unknown schema field type: ' + typeDesc.type);
  }

  if (!typeDesc.required && name !== 'id') {
    return fc.option(arb).map(val => {
      if (val == null) {
        if (typeDesc.default !== undefined) {
          return typeof typeDesc.default === 'function'
            ? typeDesc.default()
            : typeDesc.default;
        } else if (typeDesc.type === 'boolean') {
          return false;
        }
      }
      return val;
    });
  }
  return arb;
}

function flattenSortTransactions(arr) {
  let flattened = arr.reduce((list, trans) => {
    let { subtransactions, ...fields } = trans;

    if (subtransactions.length > 0) {
      list.push({
        ...fields,
        is_parent: true,
        is_child: false,
        parent_id: null
      });
      subtransactions.forEach(subtrans => {
        list.push({
          ...subtrans,
          is_parent: false,
          is_child: true,
          parent_id: trans.id,
          date: trans.date,
          account: trans.account
        });
      });
    } else {
      list.push({
        ...fields,
        is_parent: false,
        is_child: false,
        parent_id: null
      });
    }
    return list;
  }, []);

  return flattened.sort((t1, t2) => {
    if (t1.id < t2.id) {
      return -1;
    } else if (t1.id > t2.id) {
      return 1;
    }
    return 0;
  });
}

function tableArbitrary(tableSchema, extraArbs, requiredKeys = []) {
  let arb = fc.record(
    {
      ...Object.fromEntries(
        Object.entries(tableSchema).map(([name, field]) => {
          return [name, typeArbitrary(field, name)];
        })
      ),
      // Override the amount to make it a smaller integer
      amount: fc.integer({ min: -1000000, max: 1000000 }),
      ...extraArbs
    },
    {
      requiredKeys: [
        'id',
        ...requiredKeys,
        ...Object.keys(tableSchema).filter(name => tableSchema[name].required)
      ]
    }
  );

  return arb;
}

function makeTransaction({ splitFreq = 1, payeeIds } = {}) {
  let payeeField = payeeIds
    ? { payee: fc.oneof(...payeeIds.map(id => fc.constant(id))) }
    : null;

  let subtrans = tableArbitrary(schema.transactions, payeeField);

  return tableArbitrary(
    schema.transactions,
    {
      ...payeeField,
      subtransactions: fc.frequency(
        { arbitrary: fc.constant([]), weight: 1 },
        { arbitrary: fc.array(subtrans), weight: splitFreq }
      )
    },
    ['subtransactions']
  );
}

export default {
  typeArbitrary,
  flattenSortTransactions,
  makeTransaction: makeTransaction,
  makeTransactionArray: (options = {}) => {
    let { minLength, maxLength, ...transOpts } = options;
    return fc
      .array(makeTransaction(transOpts), { minLength, maxLength })
      .map(arr => flattenSortTransactions(arr));
  },
  payee: tableArbitrary(schema.payees),
  account: tableArbitrary(schema.accounts),
  category: tableArbitrary(schema.categories),
  category_group: tableArbitrary(schema.category_groups)
};
