// @ts-strict-ignore
import fc, { type Arbitrary } from 'fast-check';

import { schema } from '../server/aql';
import { addDays } from '../shared/months';

export function typeArbitrary(typeDesc, name?) {
  let arb;
  switch (typeDesc.type) {
    case 'id':
      arb = fc.uuid();
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
      arb = fc.integer({ min: 0, max: 365 * 4 }).map(n => {
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

export function flattenSortTransactions(arr) {
  const flattened = arr.reduce((list, trans) => {
    const { subtransactions, ...fields } = trans;

    if (subtransactions.length > 0) {
      list.push({
        ...fields,
        is_parent: true,
        is_child: false,
        parent_id: null,
      });
      subtransactions.forEach(subtrans => {
        list.push({
          ...subtrans,
          is_parent: false,
          is_child: true,
          parent_id: trans.id,
          date: trans.date,
          account: trans.account,
        });
      });
    } else {
      list.push({
        ...fields,
        is_parent: false,
        is_child: false,
        parent_id: null,
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

function tableArbitrary<
  T extends Record<string, { type: string; required?: boolean }>,
  E extends Record<string, Arbitrary<unknown>>,
>(
  tableSchema: T,
  extraArbs?: E,
  requiredKeys: Array<Extract<keyof T | keyof E, string>> = [],
) {
  const arb = fc.record(
    {
      ...Object.fromEntries<T>(
        Object.entries(tableSchema).map(([name, field]) => {
          return [name, typeArbitrary(field, name)] as const;
        }),
      ),
      // Override the amount to make it a smaller integer
      amount: fc.integer({ min: -1000000, max: 1000000 }),
      ...extraArbs,
    },
    {
      requiredKeys: [
        'id',
        ...requiredKeys,
        ...Object.keys(tableSchema).filter(name => tableSchema[name].required),
      ],
    },
  );

  return arb;
}

export function makeTransaction({
  splitFreq = 1,
  payeeIds,
}: { splitFreq?: number; payeeIds?: string[] } = {}) {
  const payeeField = payeeIds
    ? { payee: fc.oneof(...payeeIds.map(id => fc.constant(id))) }
    : null;

  const subtrans = tableArbitrary(schema.transactions, payeeField);

  return tableArbitrary(
    schema.transactions,
    {
      ...payeeField,
      subtransactions: fc.oneof(
        { arbitrary: fc.constant([]), weight: 100 },
        { arbitrary: fc.array(subtrans), weight: splitFreq * 100 },
      ),
    },
    ['subtransactions'],
  );
}

export const makeTransactionArray = (
  options: { minLength?; maxLength?; splitFreq?; payeeIds? } = {},
) => {
  const { minLength, maxLength, ...transOpts } = options;
  return fc
    .array(makeTransaction(transOpts), { minLength, maxLength })
    .map(arr => flattenSortTransactions(arr));
};
export const payee = tableArbitrary(schema.payees);
export const account = tableArbitrary(schema.accounts);
export const category = tableArbitrary(schema.categories);
export const category_group = tableArbitrary(schema.category_groups);
