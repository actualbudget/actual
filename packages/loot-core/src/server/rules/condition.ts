// @ts-strict-ignore
import * as dateFns from 'date-fns';

import { logger } from '../../platform/server/log';
import {
  addDays,
  isAfter,
  isBefore,
  monthFromDate,
  parseDate,
  subDays,
  yearFromDate,
} from '../../shared/months';
import {
  FIELD_TYPES,
  getApproxNumberThreshold,
  isValidOp,
  sortNumbers,
} from '../../shared/rules';

import {
  assert,
  parseBetweenAmount,
  parseDateString,
  parseRecurDate,
} from './rule-utils';

export const CONDITION_TYPES = {
  date: {
    ops: ['is', 'isapprox', 'gt', 'gte', 'lt', 'lte'],
    nullable: false,
    parse(op, value, fieldName) {
      const parsed =
        typeof value === 'string'
          ? parseDateString(value)
          : value.frequency != null
            ? parseRecurDate(value)
            : null;
      assert(
        parsed,
        'date-format',
        `Invalid date format (field: ${fieldName})`,
      );

      // Approximate only works with exact & recurring dates
      if (op === 'isapprox') {
        assert(
          parsed.type === 'date' || parsed.type === 'recur',
          'date-format',
          `Invalid date value for "isapprox" (field: ${fieldName})`,
        );
      }
      // These only work with exact dates
      else if (op === 'gt' || op === 'gte' || op === 'lt' || op === 'lte') {
        assert(
          parsed.type === 'date',
          'date-format',
          `Invalid date value for "${op}" (field: ${fieldName})`,
        );
      }

      return parsed;
    },
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
      'and',
      'onBudget',
      'offBudget',
    ],
    nullable: true,
    parse(op, value, fieldName) {
      if (op === 'oneOf' || op === 'notOneOf' || op === 'and') {
        assert(
          Array.isArray(value),
          'no-empty-array',
          `oneOf must have an array value (field: ${fieldName})`,
        );
        return value;
      }
      return value;
    },
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
    parse(op, value, fieldName) {
      if (op === 'oneOf' || op === 'notOneOf') {
        assert(
          Array.isArray(value),
          'no-empty-array',
          `oneOf must have an array value (field: ${fieldName}): ${JSON.stringify(
            value,
          )}`,
        );
        return value.filter(Boolean).map(val => val.toLowerCase());
      }

      assert(
        typeof value === 'string',
        'not-string',
        `Invalid string value (field: ${fieldName})`,
      );

      if (
        op === 'contains' ||
        op === 'matches' ||
        op === 'doesNotContain' ||
        op === 'hasTags'
      ) {
        assert(
          value.length > 0,
          'no-empty-string',
          `${op} must have non-empty string (field: ${fieldName})`,
        );
      }

      if (op === 'hasTags') {
        return value;
      }

      return value.toLowerCase();
    },
  },
  number: {
    ops: ['is', 'isapprox', 'isbetween', 'gt', 'gte', 'lt', 'lte'],
    nullable: false,
    parse(op, value, fieldName) {
      const parsed =
        typeof value === 'number'
          ? { type: 'literal', value }
          : parseBetweenAmount(value);

      assert(
        parsed != null,
        'not-number',
        `Value must be a number or between amount: ${JSON.stringify(
          value,
        )} (field: ${fieldName})`,
      );

      if (op === 'isbetween') {
        assert(
          parsed.type === 'between',
          'number-format',
          `Invalid between value for "${op}" (field: ${fieldName})`,
        );
      } else {
        assert(
          parsed.type === 'literal',
          'number-format',
          `Invalid number value for "${op}" (field: ${fieldName})`,
        );
      }

      return parsed;
    },
  },
  boolean: {
    ops: ['is'],
    nullable: false,
    parse(op, value, fieldName) {
      assert(
        typeof value === 'boolean',
        'not-boolean',
        `Value must be a boolean: ${value} (field: ${fieldName})`,
      );

      return value;
    },
  },
};

export class Condition {
  field;
  op;
  options;
  rawValue;
  type;
  unparsedValue;
  value;

  constructor(op, field, value, options) {
    const typeName = FIELD_TYPES.get(field);
    assert(typeName, 'internal', 'Invalid condition field: ' + field);

    const type = CONDITION_TYPES[typeName];

    // It's important to validate rules because a faulty rule might mess
    // up the user's transaction (and be very confusing)
    assert(
      type,
      'internal',
      `Invalid condition type: ${typeName} (field: ${field})`,
    );
    assert(
      isValidOp(field, op),
      'internal',
      `Invalid condition operator: ${op} (type: ${typeName}, field: ${field})`,
    );

    if (type.nullable !== true) {
      assert(value != null, 'no-null', `Field cannot be empty: ${field}`);
    }

    // For strings, an empty string is equal to null
    if (typeName === 'string' && type.nullable !== true) {
      assert(value !== '', 'no-null', `Field cannot be empty: ${field}`);
    }

    this.rawValue = value;
    this.unparsedValue = value;
    this.op = op;
    this.field = field;
    this.value = type.parse ? type.parse(op, value, field) : value;
    this.options = options;
    this.type = typeName;
  }

  eval(object) {
    let fieldValue = object[this.field];
    const type = this.type;

    if (type === 'string') {
      fieldValue ??= '';
    }

    if (fieldValue === undefined) {
      return false;
    }

    if (typeof fieldValue === 'string') {
      fieldValue = fieldValue.toLowerCase();
    }

    if (type === 'number' && this.options) {
      if (this.options.outflow) {
        if (fieldValue > 0) {
          return false;
        }

        fieldValue = -fieldValue;
      } else if (this.options.inflow) {
        if (fieldValue < 0) {
          return false;
        }
      }
    }

    const extractValue = v => (type === 'number' ? v.value : v);

    switch (this.op) {
      case 'isapprox':
      case 'is':
        if (type === 'date') {
          if (fieldValue == null) {
            return false;
          }

          if (this.value.type === 'recur') {
            const { schedule } = this.value;
            if (this.op === 'isapprox') {
              const fieldDate = parseDate(fieldValue);
              return schedule.occursBetween(
                dateFns.subDays(fieldDate, 2),
                dateFns.addDays(fieldDate, 2),
              );
            } else {
              return schedule.occursOn({ date: parseDate(fieldValue) });
            }
          } else {
            const { date } = this.value;

            if (this.op === 'isapprox') {
              const fullDate = parseDate(date);
              const high = addDays(fullDate, 2);
              const low = subDays(fullDate, 2);

              return fieldValue >= low && fieldValue <= high;
            } else {
              switch (this.value.type) {
                case 'date':
                  return fieldValue === date;
                case 'month':
                  return monthFromDate(fieldValue) === date;
                case 'year':
                  return yearFromDate(fieldValue) === date;
                default:
              }
            }
          }
        } else if (type === 'number') {
          const number = this.value.value;
          if (this.op === 'isapprox') {
            const threshold = getApproxNumberThreshold(number);
            return (
              fieldValue >= number - threshold &&
              fieldValue <= number + threshold
            );
          }
          return fieldValue === number;
        }
        return fieldValue === this.value;

      case 'isNot':
        return fieldValue !== this.value;
      case 'isbetween': {
        // The parsing logic already checks that the value is of the
        // right type (only numbers with high and low)
        const [low, high] = sortNumbers(this.value.num1, this.value.num2);
        return fieldValue >= low && fieldValue <= high;
      }
      case 'contains':
        if (fieldValue === null) {
          return false;
        }
        return String(fieldValue).indexOf(this.value) !== -1;
      case 'doesNotContain':
        if (fieldValue === null) {
          return false;
        }
        return String(fieldValue).indexOf(this.value) === -1;
      case 'oneOf':
        if (fieldValue === null) {
          return false;
        }
        return this.value.indexOf(fieldValue) !== -1;

      case 'hasTags':
        if (fieldValue === null) {
          return false;
        }
        return String(fieldValue).indexOf(this.value) !== -1;

      case 'notOneOf':
        if (fieldValue === null) {
          return false;
        }
        return this.value.indexOf(fieldValue) === -1;
      case 'gt':
        if (fieldValue === null) {
          return false;
        } else if (type === 'date') {
          return isAfter(fieldValue, this.value.date);
        }

        return fieldValue > extractValue(this.value);
      case 'gte':
        if (fieldValue === null) {
          return false;
        } else if (type === 'date') {
          return (
            fieldValue === this.value.date ||
            isAfter(fieldValue, this.value.date)
          );
        }

        return fieldValue >= extractValue(this.value);
      case 'lt':
        if (fieldValue === null) {
          return false;
        } else if (type === 'date') {
          return isBefore(fieldValue, this.value.date);
        }
        return fieldValue < extractValue(this.value);
      case 'lte':
        if (fieldValue === null) {
          return false;
        } else if (type === 'date') {
          return (
            fieldValue === this.value.date ||
            isBefore(fieldValue, this.value.date)
          );
        }
        return fieldValue <= extractValue(this.value);
      case 'matches':
        if (fieldValue === null) {
          return false;
        }
        try {
          return new RegExp(this.value).test(fieldValue);
        } catch (e) {
          logger.log('invalid regexp in matches condition', e);
          return false;
        }

      case 'onBudget':
        if (!object._account) {
          return false;
        }

        return object._account.offbudget === 0;

      case 'offBudget':
        if (!object._account) {
          return false;
        }

        return object._account.offbudget === 1;

      default:
    }

    return false;
  }

  getValue() {
    return this.value;
  }

  serialize() {
    return {
      op: this.op,
      field: this.field,
      value: this.unparsedValue,
      type: this.type,
      ...(this.options ? { options: this.options } : null),
    };
  }
}
