// @ts-strict-ignore
import * as dateFns from 'date-fns';

import { logger } from '../../platform/server/log';
import {
  monthFromDate,
  yearFromDate,
  isBefore,
  isAfter,
  addDays,
  subDays,
  parseDate,
} from '../../shared/months';
import {
  sortNumbers,
  getApproxNumberThreshold,
  isValidOp,
  FIELD_TYPES,
} from '../../shared/rules';

import { CONDITION_TYPES } from './condition-types';
import { assert } from './rule-utils';

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
