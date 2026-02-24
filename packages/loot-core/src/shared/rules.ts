// @ts-strict-ignore
import type {
  FieldValueTypes,
  RuleActionEntity,
  RuleConditionEntity,
  RuleConditionOp,
} from '#types/models';

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
      'hasAnyTag',
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
    internalOps?: Set<RuleConditionOp | 'and'>;
  }
>;

const FIELD_INFO = {
  imported_payee: {
    type: 'string',
    disallowedOps: new Set(['hasTags', 'hasAnyTag']),
  },
  payee: { type: 'id', disallowedOps: new Set(['onBudget', 'offBudget']) },
  payee_name: { type: 'string' },
  date: { type: 'date' },
  notes: { type: 'string', disallowedOps: new Set(['oneOf', 'notOneOf']) },
  amount: { type: 'number' },
  category: {
    type: 'id',
    disallowedOps: new Set(['onBudget', 'offBudget']),
    internalOps: new Set(['and']),
  },
  category_group: {
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

export const FIELD_TYPES = new Map(
  Object.entries(FIELD_INFO).map(
    ([field, info]) =>
      [field as unknown as keyof FieldValueTypes, info.type] as const,
  ),
);

export function isValidOp(field: keyof FieldValueTypes, op: RuleConditionOp) {
  const type = FIELD_TYPES.get(field);

  if (!type) return false;
  if (fieldInfo[field].disallowedOps?.has(op)) return false;

  return (
    // @ts-expect-error Fix op type. RuleConditionEntity is really tricky to work with...
    TYPE_INFO[type].ops.includes(op) || fieldInfo[field].internalOps?.has(op)
  );
}

export function getValidOps(field: keyof FieldValueTypes): RuleConditionOp[] {
  const type = FIELD_TYPES.get(field);
  if (!type) {
    return [];
  }
  return TYPE_INFO[type].ops.filter(
    op => !fieldInfo[field].disallowedOps?.has(op),
  );
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

export function parseConditions(
  item: RuleConditionEntity,
): RuleConditionEntity & { error?: string | null } {
  switch (item.type) {
    case 'number': {
      return { ...item };
    }
    case 'string': {
      const parsed = item.value == null ? '' : item.value;
      // @ts-expect-error Fix me
      return { ...item, value: parsed };
    }
    case 'boolean': {
      const parsed = item.value;
      // @ts-expect-error Fix me
      return { ...item, value: parsed };
    }
    default:
  }

  return { ...item, error: null };
}

export function unparseConditions({
  error: _error,
  inputKey: _inputKey,
  ...item
}: RuleConditionEntity & {
  inputKey?: string;
  error?: string | null;
}): RuleConditionEntity {
  if ('type' in item && item.type) {
    switch (item.type) {
      case 'number': {
        return { ...item };
      }
      case 'string': {
        const unparsed = item.value == null ? '' : item.value;
        // @ts-expect-error Fix me
        return { ...item, value: unparsed };
      }
      case 'boolean': {
        const unparsed = item.value == null ? false : item.value;
        // @ts-expect-error Fix me
        return { ...item, value: unparsed };
      }
      default:
    }
  }

  return item;
}

export function parseActions(
  item: RuleActionEntity,
): RuleActionEntity & { error?: string | null } {
  if (item.op === 'set-split-amount') {
    if (item.options.method === 'fixed-amount') {
      return { ...item };
    }
    return item;
  }

  if ('type' in item && item.type) {
    switch (item.type) {
      case 'number': {
        return { ...item };
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
  }

  return { ...item, error: null };
}

export function unparseActions({
  error: _error,
  inputKey: _inputKey,
  ...item
}: RuleActionEntity & {
  inputKey?: string;
  error?: string | null;
}): RuleActionEntity {
  if (item.op === 'set-split-amount') {
    if (item.options.method === 'fixed-amount') {
      return {
        ...item,
      };
    }
    if (item.options.method === 'fixed-percent') {
      return {
        ...item,
        value: item.value && parseFloat(`${item.value}`),
      };
    }
    return item;
  }

  if ('type' in item && item.type) {
    switch ('type' in item && item.type) {
      case 'number': {
        return { ...item };
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
  }

  return item;
}

export function makeValue(value, cond) {
  const isMulti = ['oneOf', 'notOneOf'].includes(cond.op);

  if (isMulti) {
    return { ...cond, error: null, value: value || [] };
  }

  if (cond.type === 'number' && value == null) {
    return { ...cond, error: null, value: 0 };
  }

  return { ...cond, error: null, value };
}

export function getApproxNumberThreshold(number) {
  return Math.round(Math.abs(number) * 0.075);
}
