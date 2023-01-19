import { integerToAmount, amountToInteger, currencyToAmount } from './util';

// For now, this info is duplicated from the backend. Figure out how
// to share it later.
export const TYPE_INFO = {
  date: {
    ops: ['is', 'isapprox', 'gt', 'gte', 'lt', 'lte'],
    nullable: false
  },
  id: {
    ops: ['is', 'contains', 'oneOf'],
    nullable: true
  },
  string: {
    ops: ['is', 'contains', 'oneOf'],
    nullable: false
  },
  number: {
    ops: ['is', 'isapprox', 'isbetween', 'gt', 'gte', 'lt', 'lte'],
    nullable: false
  },
  boolean: {
    ops: ['is'],
    nullable: false
  }
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
    cleared: 'boolean'
  })
);

export function mapField(field, opts) {
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
    case 'cleared':
      return 'cleared';
    default:
      return field;
  }
}

export function friendlyOp(op, type) {
  switch (op) {
    case 'oneOf':
      return 'one of';
    case 'is':
      return 'is';
    case 'isapprox':
      return 'is approx';
    case 'isbetween':
      return 'is between';
    case 'contains':
      return 'contains';
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
    case 'link-schedule':
      return 'link schedule';
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
      return 'Internal error, sorry! Contact help@actualbudget.com';
  }
}

export function sortNumbers(num1, num2) {
  if (num1 < num2) {
    return [num1, num2];
  }
  return [num2, num1];
}

export function parse(item) {
  switch (item.type) {
    case 'number': {
      let parsed = item.value;
      if (item.field === 'amount' && item.op !== 'isbetween') {
        parsed = integerToAmount(parsed);
      }
      return { ...item, value: parsed };
    }
    case 'string': {
      let parsed = item.value == null ? '' : item.value;
      return { ...item, value: parsed };
    }
    case 'boolean': {
      let parsed = item.value;
      return { ...item, value: parsed };
    }
    default:
  }

  return { ...item, error: null };
}

export function unparse({ error, inputKey, ...item }) {
  switch (item.type) {
    case 'number': {
      let unparsed = item.value;
      if (item.field === 'amount' && item.op !== 'isbetween') {
        unparsed = amountToInteger(unparsed);
      }

      return { ...item, value: unparsed };
    }
    case 'string': {
      let unparsed = item.value == null ? '' : item.value;
      return { ...item, value: unparsed };
    }
    case 'boolean': {
      let unparsed = item.value == null ? false : item.value;
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
          value: value ? currencyToAmount(value) || 0 : 0
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
