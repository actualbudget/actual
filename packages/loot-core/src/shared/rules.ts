// @ts-strict-ignore
import { integerToAmount, amountToInteger, currencyToAmount } from './util';

// For now, this info is duplicated from the backend. Figure out how
// to share it later.
export const TYPE_INFO = {
  date: {
    ops: ['is', 'isapprox', 'gt', 'gte', 'lt', 'lte'],
    nullable: false,
  },
  id: {
    ops: ['is', 'contains', 'oneOf', 'isNot', 'doesNotContain', 'notOneOf'],
    nullable: true,
  },
  saved: {
    ops: [],
    nullable: false,
  },
  string: {
    ops: ['is', 'contains', 'oneOf', 'isNot', 'doesNotContain', 'notOneOf'],
    nullable: true,
  },
  number: {
    ops: ['is', 'isapprox', 'isbetween', 'gt', 'gte', 'lt', 'lte'],
    nullable: false,
  },
  boolean: {
    ops: ['is'],
    nullable: false,
  },
};

export const FIELD_TYPES = new Map(
  Object.entries({
    imported_payee: 'string',
    payee: 'id',
    date: 'date',
    notes: 'string',
    amount: 'number',
    amountInflow: 'number',
    amountOutfow: 'number',
    category: 'id',
    account: 'id',
    cleared: 'boolean',
    reconciled: 'boolean',
    saved: 'saved',
  }),
);

export const ALLOCATION_METHODS = {
  'fixed-amount': 'a fixed amount',
  'fixed-percent': 'a fixed percent',
  remainder: 'an equal portion of the remainder',
};

export function mapField(field, opts?) {
  opts = opts || {};

  switch (field) {
    case 'imported_payee':
      return 'imported payee';
    case 'amount':
      if (opts.inflow) {
        return 'amount (inflow)';
      } else if (opts.outflow) {
        return 'amount (outflow)';
      }
      return 'amount';
    case 'amount-inflow':
      return 'amount (inflow)';
    case 'amount-outflow':
      return 'amount (outflow)';
    default:
      return field;
  }
}

export function friendlyOp(op, type?) {
  switch (op) {
    case 'oneOf':
      return 'one of';
    case 'notOneOf':
      return 'not one of';
    case 'is':
      return 'is';
    case 'isNot':
      return 'is not';
    case 'isapprox':
      return 'is approx';
    case 'isbetween':
      return 'is between';
    case 'contains':
      return 'contains';
    case 'doesNotContain':
      return 'does not contain';
    case 'gt':
      if (type === 'date') {
        return 'is after';
      }
      return 'is greater than';
    case 'gte':
      if (type === 'date') {
        return 'is after or equals';
      }
      return 'is greater than or equals';
    case 'lt':
      if (type === 'date') {
        return 'is before';
      }
      return 'is less than';
    case 'lte':
      if (type === 'date') {
        return 'is before or equals';
      }
      return 'is less than or equals';
    case 'true':
      return 'is true';
    case 'false':
      return 'is false';
    case 'set':
      return 'set';
    case 'set-split-amount':
      return 'allocate';
    case 'link-schedule':
      return 'link schedule';
    case 'and':
      return 'and';
    case 'or':
      return 'or';
    default:
      return '';
  }
}

export function deserializeField(field) {
  if (field === 'amount-inflow') {
    return { field: 'amount', options: { inflow: true } };
  } else if (field === 'amount-outflow') {
    return { field: 'amount', options: { outflow: true } };
  } else {
    return { field };
  }
}

export function getFieldError(type) {
  switch (type) {
    case 'date-format':
      return 'Invalid date format';
    case 'no-null':
    case 'no-empty-array':
    case 'no-empty-string':
      return 'Value cannot be empty';
    case 'not-number':
      return 'Value must be a number';
    case 'invalid-field':
      return 'Please choose a valid field for this type of rule';
    default:
      return 'Internal error, sorry! Please get in touch https://actualbudget.org/contact/ for support';
  }
}

export function sortNumbers(num1, num2) {
  if (num1 < num2) {
    return [num1, num2];
  }
  return [num2, num1];
}

export function parse(item) {
  if (item.op === 'set-split-amount') {
    if (item.options.method === 'fixed-amount') {
      return { ...item, value: item.value && integerToAmount(item.value) };
    }
    return item;
  }

  switch (item.type) {
    case 'number': {
      let parsed = item.value;
      if (
        item.field === 'amount' &&
        item.op !== 'isbetween' &&
        parsed != null
      ) {
        parsed = integerToAmount(parsed);
      }
      return { ...item, value: parsed };
    }
    case 'string': {
      const parsed = item.value == null ? '' : item.value;
      return { ...item, value: parsed };
    }
    case 'boolean': {
      const parsed = item.value;
      return { ...item, value: parsed };
    }
    default:
  }

  return { ...item, error: null };
}

export function unparse({ error, inputKey, ...item }) {
  if (item.op === 'set-split-amount') {
    if (item.options.method === 'fixed-amount') {
      return {
        ...item,
        value: item.value && amountToInteger(item.value),
      };
    }
    if (item.options.method === 'fixed-percent') {
      return {
        ...item,
        value: item.value && parseFloat(item.value),
      };
    }
    return item;
  }

  switch (item.type) {
    case 'number': {
      let unparsed = item.value;
      if (item.field === 'amount' && item.op !== 'isbetween') {
        unparsed = amountToInteger(unparsed);
      }

      return { ...item, value: unparsed };
    }
    case 'string': {
      const unparsed = item.value == null ? '' : item.value;
      return { ...item, value: unparsed };
    }
    case 'boolean': {
      const unparsed = item.value == null ? false : item.value;
      return { ...item, value: unparsed };
    }
    default:
  }

  return item;
}

export function makeValue(value, cond) {
  switch (cond.type) {
    case 'number': {
      if (cond.op !== 'isbetween') {
        return {
          ...cond,
          error: null,
          value: value ? currencyToAmount(String(value)) || 0 : 0,
        };
      }
      break;
    }
    default:
  }

  return { ...cond, error: null, value };
}

export function getApproxNumberThreshold(number) {
  return Math.round(Math.abs(number) * 0.075);
}
