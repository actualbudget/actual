// @ts-strict-ignore
import { t } from 'i18next';

import { FieldValueTypes, RuleConditionOp } from '../types/models';

import { integerToAmount, amountToInteger, currencyToAmount } from './util';

// For now, this info is duplicated from the backend. Figure out how
// to share it later.
const TYPE_INFO = {
  date: {
    ops: ['is', 'isapprox', 'gt', 'gte', 'lt', 'lte'],
    nullable: false,
  },
  id: {
    ops: [
      'is',
      'contains',
      'matches',
      'oneOf',
      'isNot',
      'doesNotContain',
      'notOneOf',
      'onBudget',
      'offBudget',
    ],
    nullable: true,
  },
  saved: {
    ops: [],
    nullable: false,
  },
  string: {
    ops: [
      'is',
      'contains',
      'matches',
      'oneOf',
      'isNot',
      'doesNotContain',
      'notOneOf',
      'hasTags',
    ],
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
} as const;

type FieldInfoConstraint = Record<
  keyof FieldValueTypes,
  {
    type: keyof typeof TYPE_INFO;
    disallowedOps?: Set<RuleConditionOp>;
    internalOps?: Set<RuleConditionOp>;
  }
>;

const FIELD_INFO = {
  imported_payee: {
    type: 'string',
    disallowedOps: new Set(['hasTags']),
  },
  payee: { type: 'id', disallowedOps: new Set(['onBudget', 'offBudget']) },
  payee_name: { type: 'string' },
  date: { type: 'date' },
  notes: { type: 'string' },
  amount: { type: 'number' },
  category: {
    type: 'id',
    disallowedOps: new Set(['onBudget', 'offBudget']),
    internalOps: new Set(['and']),
  },
  account: { type: 'id' },
  cleared: { type: 'boolean' },
  reconciled: { type: 'boolean' },
  saved: { type: 'saved' },
  transfer: { type: 'boolean' },
  parent: { type: 'boolean' },
} as const satisfies FieldInfoConstraint;

const fieldInfo: FieldInfoConstraint = FIELD_INFO;

export const FIELD_TYPES = new Map<keyof FieldValueTypes, string>(
  Object.entries(FIELD_INFO).map(([field, info]) => [
    field as unknown as keyof FieldValueTypes,
    info.type,
  ]),
);

export function isValidOp(field: keyof FieldValueTypes, op: RuleConditionOp) {
  const type = FIELD_TYPES.get(field);

  if (!type) return false;
  if (fieldInfo[field].disallowedOps?.has(op)) return false;

  return (
    TYPE_INFO[type].ops.includes(op) || fieldInfo[field].internalOps?.has(op)
  );
}

export function getValidOps(field: keyof FieldValueTypes) {
  const type = FIELD_TYPES.get(field);
  if (!type) {
    return [];
  }
  return TYPE_INFO[type].ops.filter(
    op => !fieldInfo[field].disallowedOps?.has(op),
  );
}

export function getAllocationMethods() {
  return {
    'fixed-amount': t('a fixed amount'),
    'fixed-percent': t('a fixed percent of the remainder'),
    remainder: t('an equal portion of the remainder'),
  };
}

export function mapField(field, opts?) {
  opts = opts || {};

  switch (field) {
    case 'imported_payee':
      return t('imported payee');
    case 'payee_name':
      return t('payee (name)');
    case 'amount':
      if (opts.inflow) {
        return t('amount (inflow)');
      } else if (opts.outflow) {
        return t('amount (outflow)');
      }
      return t('amount');
    case 'amount-inflow':
      return t('amount (inflow)');
    case 'amount-outflow':
      return t('amount (outflow)');
    case 'account':
      return t('account');
    case 'date':
      return t('date');
    case 'category':
      return t('category');
    case 'notes':
      return t('notes');
    case 'payee':
      return t('payee');
    case 'saved':
      return t('saved');
    case 'cleared':
      return t('cleared');
    case 'reconciled':
      return t('reconciled');
    case 'transfer':
      return t('transfer');
    default:
      return field;
  }
}

export function friendlyOp(op, type?) {
  switch (op) {
    case 'oneOf':
      return t('one of');
    case 'notOneOf':
      return t('not one of');
    case 'is':
      return t('is');
    case 'isNot':
      return t('is not');
    case 'isapprox':
      return t('is approx');
    case 'isbetween':
      return t('is between');
    case 'contains':
      return t('contains');
    case 'hasTags':
      return t('has tags');
    case 'matches':
      return t('matches');
    case 'doesNotContain':
      return t('does not contain');
    case 'gt':
      if (type === 'date') {
        return t('is after');
      }
      return t('is greater than');
    case 'gte':
      if (type === 'date') {
        return t('is after or equals');
      }
      return t('is greater than or equals');
    case 'lt':
      if (type === 'date') {
        return t('is before');
      }
      return t('is less than');
    case 'lte':
      if (type === 'date') {
        return t('is before or equals');
      }
      return t('is less than or equals');
    case 'true':
      return t('is true');
    case 'false':
      return t('is false');
    case 'set':
      return t('set');
    case 'set-split-amount':
      return t('allocate');
    case 'link-schedule':
      return t('link schedule');
    case 'prepend-notes':
      return t('prepend to notes');
    case 'append-notes':
      return t('append to notes');
    case 'and':
      return t('and');
    case 'or':
      return t('or');
    case 'onBudget':
      return t('is on budget');
    case 'offBudget':
      return t('is off budget');
    default:
      return '';
  }
}

export function translateRuleStage(stage: string): string {
  switch (stage) {
    case 'pre':
      return t('Pre');
    case 'post':
      return t('Post');
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
    case 'not-string':
      return 'Value must be a string';
    case 'not-boolean':
      return 'Value must be a boolean';
    case 'not-number':
      return 'Value must be a number';
    case 'invalid-field':
      return 'Please choose a valid field for this type of rule';
    case 'invalid-template':
      return 'Invalid handlebars template';
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

  const isMulti = ['oneOf', 'notOneOf'].includes(cond.op);

  if (isMulti) {
    return { ...cond, error: null, value: value || [] };
  }

  return { ...cond, error: null, value };
}

export function getApproxNumberThreshold(number) {
  return Math.round(Math.abs(number) * 0.075);
}
