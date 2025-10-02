// @ts-strict-ignore
import * as dateFns from 'date-fns';

import { recurConfigToRSchedule } from '../../shared/schedules';
import { RuleError } from '../errors';
import { RSchedule } from '../util/rschedule';

function assert(test: unknown, type: string, msg: string): asserts test {
  if (!test) {
    throw new RuleError(type, msg);
  }
}

function parseRecurDate(desc) {
  try {
    const rules = recurConfigToRSchedule(desc);

    return {
      type: 'recur',
      schedule: new RSchedule({
        rrules: rules,
        data: {
          skipWeekend: desc.skipWeekend,
          weekendSolve: desc.weekendSolveMode,
        },
      }),
    };
  } catch (e) {
    throw new RuleError('parse-recur-date', e.message);
  }
}

export function parseDateString(str) {
  if (typeof str !== 'string') {
    return null;
  } else if (str.length === 10) {
    // YYYY-MM-DD
    if (!dateFns.isValid(dateFns.parseISO(str))) {
      return null;
    }

    return { type: 'date', date: str };
  } else if (str.length === 7) {
    // YYYY-MM
    if (!dateFns.isValid(dateFns.parseISO(str + '-01'))) {
      return null;
    }

    return { type: 'month', date: str };
  } else if (str.length === 4) {
    // YYYY
    if (!dateFns.isValid(dateFns.parseISO(str + '-01-01'))) {
      return null;
    }

    return { type: 'year', date: str };
  }

  return null;
}

function parseBetweenAmount(between) {
  const { num1, num2 } = between;
  if (typeof num1 !== 'number' || typeof num2 !== 'number') {
    return null;
  }
  return { type: 'between', num1, num2 };
}

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
          `Invalid date value for “isapprox” (field: ${fieldName})`,
        );
      }
      // These only work with exact dates
      else if (op === 'gt' || op === 'gte' || op === 'lt' || op === 'lte') {
        assert(
          parsed.type === 'date',
          'date-format',
          `Invalid date value for “${op}” (field: ${fieldName})`,
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
          `Invalid between value for “${op}” (field: ${fieldName})`,
        );
      } else {
        assert(
          parsed.type === 'literal',
          'number-format',
          `Invalid number value for “${op}” (field: ${fieldName})`,
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
