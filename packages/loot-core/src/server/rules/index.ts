// @ts-strict-ignore
import * as dateFns from 'date-fns';
import {
  addMonths,
  addWeeks,
  addYears,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns';
import * as Handlebars from 'handlebars';

import {
  monthFromDate,
  yearFromDate,
  isBefore,
  isAfter,
  addDays,
  subDays,
  parseDate,
  format,
  currentDay,
} from '../../shared/months';
import {
  sortNumbers,
  getApproxNumberThreshold,
  isValidOp,
  FIELD_TYPES,
} from '../../shared/rules';
import { recurConfigToRSchedule } from '../../shared/schedules';
import {
  addSplitTransaction,
  groupTransaction,
  recalculateSplit,
  splitTransaction,
  ungroupTransaction,
} from '../../shared/transactions';
import { fastSetMerge } from '../../shared/util';
import { RuleConditionEntity, RuleEntity } from '../../types/models';
import { RuleError } from '../errors';
import { Schedule as RSchedule } from '../util/rschedule';

function registerHandlebarsHelpers() {
  const regexTest = /^\/(.*)\/([gimuy]*)$/;

  function mathHelper(fn: (a: number, b: number) => number) {
    return (a: unknown, ...b: unknown[]) => {
      return b.map(Number).reduce(fn, Number(a));
    };
  }

  function regexHelper(
    mapRegex: (regex: string, flags: string) => string | RegExp,
    mapNonRegex: (value: string) => string | RegExp,
    apply: (value: string, regex: string | RegExp, replace: string) => string,
  ) {
    return (value: unknown, regex: unknown, replace: unknown) => {
      if (value == null) {
        return null;
      }

      if (typeof regex !== 'string' || typeof replace !== 'string') {
        return '';
      }

      let regexp: string | RegExp;
      const match = regexTest.exec(regex);
      // Regex is in format /regex/flags
      if (match) {
        regexp = mapRegex(match[1], match[2]);
      } else {
        regexp = mapNonRegex(regex);
      }

      return apply(String(value), regexp, replace);
    };
  }

  const helpers = {
    regex: regexHelper(
      (regex, flags) => new RegExp(regex, flags),
      value => new RegExp(value),
      (value, regex, replace) => value.replace(regex, replace),
    ),
    replace: regexHelper(
      (regex, flags) => new RegExp(regex, flags),
      value => value,
      (value, regex, replace) => value.replace(regex, replace),
    ),
    replaceAll: regexHelper(
      (regex, flags) => new RegExp(regex, flags),
      value => value,
      (value, regex, replace) => value.replaceAll(regex, replace),
    ),
    add: mathHelper((a, b) => a + b),
    sub: mathHelper((a, b) => a - b),
    div: mathHelper((a, b) => a / b),
    mul: mathHelper((a, b) => a * b),
    mod: mathHelper((a, b) => a % b),
    floor: (a: unknown) => Math.floor(Number(a)),
    ceil: (a: unknown) => Math.ceil(Number(a)),
    round: (a: unknown) => Math.round(Number(a)),
    abs: (a: unknown) => Math.abs(Number(a)),
    min: mathHelper((a, b) => Math.min(a, b)),
    max: mathHelper((a, b) => Math.max(a, b)),
    fixed: (a: unknown, digits: unknown) => Number(a).toFixed(Number(digits)),
    day: (date?: string) => date && format(date, 'd'),
    month: (date?: string) => date && format(date, 'M'),
    year: (date?: string) => date && format(date, 'yyyy'),
    format: (date?: string, f?: string) => date && f && format(date, f),
    addDays: (date?: string, days?: number) => {
      if (!date || !days) return date;
      return format(addDays(date, days), 'yyyy-MM-dd');
    },
    subDays: (date?: string, days?: number) => {
      if (!date || !days) return date;
      return format(subDays(date, days), 'yyyy-MM-dd');
    },
    addMonths: (date?: string, months?: number) => {
      if (!date || !months) return date;
      return format(addMonths(parseDate(date), months), 'yyyy-MM-dd');
    },
    subMonths: (date?: string, months?: number) => {
      if (!date || !months) return date;
      return format(subMonths(parseDate(date), months), 'yyyy-MM-dd');
    },
    addWeeks: (date?: string, weeks?: number) => {
      if (!date || !weeks) return date;
      return format(addWeeks(parseDate(date), weeks), 'yyyy-MM-dd');
    },
    subWeeks: (date?: string, weeks?: number) => {
      if (!date || !weeks) return date;
      return format(subWeeks(parseDate(date), weeks), 'yyyy-MM-dd');
    },
    addYears: (date?: string, years?: number) => {
      if (!date || !years) return date;
      return format(addYears(parseDate(date), years), 'yyyy-MM-dd');
    },
    subYears: (date?: string, years?: number) => {
      if (!date || !years) return date;
      return format(subYears(parseDate(date), years), 'yyyy-MM-dd');
    },
    setDay: (date?: string, day?: number) => {
      if (!date) return date;
      const actualDay = Number(format(date, 'd'));
      return format(addDays(date, day - actualDay), 'yyyy-MM-dd');
    },
    debug: (value: unknown) => {
      console.log(value);
    },
    concat: (...args: unknown[]) => args.join(''),
  } as Record<string, Handlebars.HelperDelegate>;

  for (const [name, fn] of Object.entries(helpers)) {
    Handlebars.registerHelper(name, (...args: unknown[]) => {
      //The last argument is the Handlebars options object
      return fn(...args.slice(0, -1));
    });
  }
}

registerHandlebarsHelpers();

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

const CONDITION_TYPES = {
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
          console.log('invalid regexp in matches condition', e);
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

const ACTION_OPS = [
  'set',
  'set-split-amount',
  'link-schedule',
  'prepend-notes',
  'append-notes',
] as const;
type ActionOperator = (typeof ACTION_OPS)[number];

export class Action {
  field;
  op: ActionOperator;
  options;
  rawValue;
  type;
  value;

  private handlebarsTemplate?: Handlebars.TemplateDelegate;

  constructor(op: ActionOperator, field, value, options) {
    assert(
      ACTION_OPS.includes(op),
      'internal',
      `Invalid action operation: ${op}`,
    );

    if (op === 'set') {
      const typeName = FIELD_TYPES.get(field);
      assert(typeName, 'internal', `Invalid field for action: ${field}`);
      this.field = field;
      this.type = typeName;
      if (options?.template) {
        this.handlebarsTemplate = Handlebars.compile(options.template, {
          noEscape: true,
        });
        try {
          this.handlebarsTemplate({});
        } catch (e) {
          console.debug(e);
          assert(false, 'invalid-template', `Invalid Handlebars template`);
        }
      }
    } else if (op === 'set-split-amount') {
      this.field = null;
      this.type = 'number';
    } else if (op === 'link-schedule') {
      this.field = null;
      this.type = 'id';
    } else if (op === 'prepend-notes' || op === 'append-notes') {
      this.field = 'notes';
      this.type = 'id';
    }

    if (field === 'account') {
      assert(value, 'no-null', `Field cannot be empty: ${field}`);
    }

    this.op = op;
    this.rawValue = value;
    this.value = value;
    this.options = options;
  }

  exec(object) {
    switch (this.op) {
      case 'set':
        if (this.handlebarsTemplate) {
          object[this.field] = this.handlebarsTemplate({
            ...object,
            today: currentDay(),
          });

          // Handlebars always returns a string, so we need to convert
          switch (this.type) {
            case 'number':
              object[this.field] = parseFloat(object[this.field]);
              break;
            case 'date':
              const parsed = parseDate(object[this.field]);
              if (parsed && dateFns.isValid(parsed)) {
                object[this.field] = format(parsed, 'yyyy-MM-dd');
              } else {
                // Keep original string; log for diagnostics but avoid hard crash
                console.error(
                  `rules: invalid date produced by template for field “${this.field}”:`,
                  object[this.field],
                );
                // Make it stick like a sore thumb
                object[this.field] = '9999-12-31';
              }
              break;
            case 'boolean':
              object[this.field] = object[this.field] === 'true';
              break;
          }
        } else {
          object[this.field] = this.value;
        }

        if (this.field === 'payee_name') {
          object['payee'] = 'new';
        }
        break;
      case 'set-split-amount':
        switch (this.options.method) {
          case 'fixed-amount':
            object.amount = this.value;
            break;
          default:
        }
        break;
      case 'link-schedule':
        object.schedule = this.value;
        break;
      case 'prepend-notes':
        object[this.field] = object[this.field]
          ? this.value + object[this.field]
          : this.value;
        break;
      case 'append-notes':
        object[this.field] = object[this.field]
          ? object[this.field] + this.value
          : this.value;
        break;
      default:
    }
  }

  serialize() {
    return {
      op: this.op,
      field: this.field,
      value: this.value,
      type: this.type,
      ...(this.options ? { options: this.options } : null),
    };
  }
}

function execNonSplitActions(actions: Action[], transaction) {
  const update = transaction;
  actions.forEach(action => action.exec(update));
  return update;
}

function getSplitRemainder(transactions) {
  const { error } = recalculateSplit(groupTransaction(transactions));
  return error ? error.difference : 0;
}

function execSplitActions(actions: Action[], transaction) {
  const splitAmountActions = actions.filter(
    action => action.op === 'set-split-amount',
  );

  // Convert the transaction to a split transaction.
  const { data } = splitTransaction(
    ungroupTransaction(transaction),
    transaction.id,
  );
  let newTransactions = data;

  // Add empty splits, and apply non-set-amount actions.
  // This also populates any fixed-amount splits.
  actions.forEach(action => {
    const splitTransactionIndex = (action.options?.splitIndex ?? 0) + 1;
    if (splitTransactionIndex >= newTransactions.length) {
      const { data } = addSplitTransaction(newTransactions, transaction.id);
      newTransactions = data;
    }
    action.exec(newTransactions[splitTransactionIndex]);
  });

  // Distribute to fixed-percent splits.
  const remainingAfterFixedAmounts = getSplitRemainder(newTransactions);
  splitAmountActions
    .filter(action => action.options.method === 'fixed-percent')
    .forEach(action => {
      const splitTransactionIndex = (action.options?.splitIndex ?? 0) + 1;
      const percent = action.value / 100;
      const amount = Math.round(remainingAfterFixedAmounts * percent);
      newTransactions[splitTransactionIndex].amount = amount;
    });

  // Distribute to remainder splits.
  const remainderActions = splitAmountActions.filter(
    action => action.options.method === 'remainder',
  );
  const remainingAfterFixedPercents = getSplitRemainder(newTransactions);
  if (remainderActions.length !== 0) {
    const amountPerRemainderSplit = Math.round(
      remainingAfterFixedPercents / remainderActions.length,
    );
    let lastNonFixedTransactionIndex = -1;
    remainderActions.forEach(action => {
      const splitTransactionIndex = (action.options?.splitIndex ?? 0) + 1;
      newTransactions[splitTransactionIndex].amount = amountPerRemainderSplit;
      lastNonFixedTransactionIndex = Math.max(
        lastNonFixedTransactionIndex,
        splitTransactionIndex,
      );
    });

    // The last remainder split will be adjusted for any leftovers from rounding.
    newTransactions[lastNonFixedTransactionIndex].amount +=
      getSplitRemainder(newTransactions);
  }

  // The split index 0 (transaction index 1) is reserved for "Apply to all" actions.
  // Remove that entry from the transaction list.
  newTransactions.splice(1, 1);
  return recalculateSplit(groupTransaction(newTransactions));
}

export function execActions(actions: Action[], transaction) {
  const parentActions = actions.filter(action => !action.options?.splitIndex);
  const childActions = actions.filter(action => action.options?.splitIndex);
  const totalSplitCount =
    actions.reduce(
      (prev, cur) => Math.max(prev, cur.options?.splitIndex ?? 0),
      0,
    ) + 1;

  const nonSplitResult = execNonSplitActions(parentActions, transaction);
  if (totalSplitCount === 1) {
    // No splits, no need to do anything else.
    return nonSplitResult;
  }

  if (nonSplitResult.is_child) {
    // Rules with splits can't be applied to child transactions.
    return nonSplitResult;
  }

  return execSplitActions(childActions, nonSplitResult);
}

export class Rule {
  actions: Action[];
  conditions: Condition[];
  conditionsOp;
  id?: string;
  stage: 'pre' | null | 'post';

  constructor({
    id,
    stage,
    conditionsOp,
    conditions,
    actions,
  }: {
    id?: string;
    stage?: 'pre' | null | 'post';
    conditionsOp;
    conditions;
    actions;
  }) {
    this.id = id;
    this.stage = stage ?? null;
    this.conditionsOp = conditionsOp;
    this.conditions = conditions.map(
      c => new Condition(c.op, c.field, c.value, c.options),
    );
    this.actions = actions.map(
      a => new Action(a.op, a.field, a.value, a.options),
    );
  }

  evalConditions(object): boolean {
    if (this.conditions.length === 0) {
      return false;
    }

    const method = this.conditionsOp === 'or' ? 'some' : 'every';
    return this.conditions[method](condition => {
      return condition.eval(object);
    });
  }

  execActions<T>(object: T): Partial<T> {
    const result = execActions(this.actions, {
      ...object,
    });
    const changes = Object.keys(result).reduce((prev, cur) => {
      if (result[cur] !== object[cur]) {
        prev[cur] = result[cur];
      }
      return prev;
    }, {} as T);
    return changes;
  }

  exec(object) {
    if (this.evalConditions(object)) {
      return this.execActions(object);
    }
    return null;
  }

  // Apply is similar to exec but applies the changes for you
  apply(object) {
    const changes = this.exec(object);
    return Object.assign({}, object, changes);
  }

  getId(): string | undefined {
    return this.id;
  }

  serialize(): RuleEntity {
    return {
      id: this.id,
      stage: this.stage,
      conditionsOp: this.conditionsOp,
      conditions: this.conditions.map(c => c.serialize()),
      actions: this.actions.map(a => a.serialize()),
    };
  }
}

export class RuleIndexer {
  field: string;
  method?: string;
  rules: Map<string, Set<Rule>>;

  constructor({ field, method }: { field: string; method?: string }) {
    this.field = field;
    this.method = method;
    this.rules = new Map();
  }

  getIndex(key: string | null): Set<Rule> {
    if (!this.rules.has(key)) {
      this.rules.set(key, new Set());
    }
    return this.rules.get(key);
  }

  getIndexForValue(value: unknown): Set<Rule> {
    return this.getIndex(this.getKey(value) || '*');
  }

  getKey(value: unknown): string | null {
    if (typeof value === 'string' && value !== '') {
      if (this.method === 'firstchar') {
        return value[0].toLowerCase();
      }
      return value.toLowerCase();
    }
    return null;
  }

  getIndexes(rule: Rule): Set<Rule>[] {
    const cond = rule.conditions.find(cond => cond.field === this.field);
    const indexes = [];

    if (
      cond &&
      (cond.op === 'oneOf' ||
        cond.op === 'is' ||
        cond.op === 'isNot' ||
        cond.op === 'notOneOf')
    ) {
      if (cond.op === 'oneOf' || cond.op === 'notOneOf') {
        cond.value.forEach(val => indexes.push(this.getIndexForValue(val)));
      } else {
        indexes.push(this.getIndexForValue(cond.value));
      }
    } else {
      indexes.push(this.getIndex('*'));
    }

    return indexes;
  }

  index(rule: Rule): void {
    const indexes = this.getIndexes(rule);
    indexes.forEach(index => {
      index.add(rule);
    });
  }

  remove(rule: Rule): void {
    const indexes = this.getIndexes(rule);
    indexes.forEach(index => {
      index.delete(rule);
    });
  }

  getApplicableRules(object): Set<Rule> {
    let indexedRules;
    if (this.field in object) {
      const key = this.getKey(object[this.field]);
      if (key) {
        indexedRules = this.rules.get(key);
      }
    }

    return fastSetMerge(
      indexedRules || new Set(),
      this.rules.get('*') || new Set(),
    );
  }
}

const OP_SCORES: Record<RuleConditionEntity['op'], number> = {
  is: 10,
  isNot: 10,
  oneOf: 9,
  notOneOf: 9,
  isapprox: 5,
  isbetween: 5,
  gt: 1,
  gte: 1,
  lt: 1,
  lte: 1,
  contains: 0,
  doesNotContain: 0,
  matches: 0,
  hasTags: 0,
  onBudget: 0,
  offBudget: 0,
};

function computeScore(rule: Rule): number {
  const initialScore = rule.conditions.reduce((score, condition) => {
    if (OP_SCORES[condition.op] == null) {
      console.log(`Found invalid operation while ranking: ${condition.op}`);
      return 0;
    }

    return score + OP_SCORES[condition.op];
  }, 0);

  if (
    rule.conditions.every(
      cond =>
        cond.op === 'is' ||
        cond.op === 'isNot' ||
        cond.op === 'isapprox' ||
        cond.op === 'oneOf' ||
        cond.op === 'notOneOf',
    )
  ) {
    return initialScore * 2;
  }
  return initialScore;
}

function _rankRules(rules: Rule[]): Rule[] {
  const scores = new Map();
  rules.forEach(rule => {
    scores.set(rule, computeScore(rule));
  });

  // No matter the order of rules, this must always return exactly the same
  // order. That's why rules have ids: if two rules have the same score, it
  // sorts by id
  return [...rules].sort((r1, r2) => {
    const score1 = scores.get(r1);
    const score2 = scores.get(r2);
    if (score1 < score2) {
      return -1;
    } else if (score1 > score2) {
      return 1;
    } else {
      const id1 = r1.getId();
      const id2 = r2.getId();
      return id1 < id2 ? -1 : id1 > id2 ? 1 : 0;
    }
  });
}

export function rankRules(rules: Iterable<Rule>): Rule[] {
  let pre = [];
  let normal = [];
  let post = [];

  for (const rule of rules) {
    switch (rule.stage) {
      case 'pre':
        pre.push(rule);
        break;
      case 'post':
        post.push(rule);
        break;
      default:
        normal.push(rule);
    }
  }

  pre = _rankRules(pre);
  normal = _rankRules(normal);
  post = _rankRules(post);

  return pre.concat(normal).concat(post);
}

export function migrateIds(rule: Rule, mappings: Map<string, string>): void {
  // Go through the in-memory rules and patch up ids that have been
  // "migrated" to other ids. This is a little tricky, but a lot
  // easier than trying to keep an up-to-date mapping in the db. This
  // is necessary because ids can be transparently mapped as items are
  // merged/deleted in the system.
  //
  // It's very important here that we look at `rawValue` specifically,
  // and only apply the patches to the other `value` fields. We always
  // need to keep the original id around because undo can walk
  // backwards, and we need to be able to consistently apply a
  // "projection" of these mapped values. For example: if we have ids
  // [1, 2] and applying mappings transforms it to [2, 2], if `1` gets
  // mapped to something else there's no way to no to map *only* the
  // first id back to make [1, 2]. Keeping the original value around
  // solves this.
  for (let ci = 0; ci < rule.conditions.length; ci++) {
    const cond = rule.conditions[ci];
    if (cond.type === 'id') {
      switch (cond.op) {
        case 'is':
          cond.value = mappings.get(cond.rawValue) || cond.rawValue;
          cond.unparsedValue = cond.value;
          break;
        case 'isNot':
          cond.value = mappings.get(cond.rawValue) || cond.rawValue;
          cond.unparsedValue = cond.value;
          break;
        case 'oneOf':
          cond.value = cond.rawValue.map(v => mappings.get(v) || v);
          cond.unparsedValue = [...cond.value];
          break;
        case 'notOneOf':
          cond.value = cond.rawValue.map(v => mappings.get(v) || v);
          cond.unparsedValue = [...cond.value];
          break;
        default:
      }
    }
  }

  for (let ai = 0; ai < rule.actions.length; ai++) {
    const action = rule.actions[ai];
    if (action.type === 'id') {
      if (action.op === 'set') {
        action.value = mappings.get(action.rawValue) || action.rawValue;
      }
    }
  }
}

// This finds all the rules that reference the `id`
export function iterateIds(
  rules: Rule[],
  fieldName: string,
  func: (rule: Rule, id: string) => void | boolean,
): void {
  let i;

  ruleiter: for (i = 0; i < rules.length; i++) {
    const rule = rules[i];
    for (let ci = 0; ci < rule.conditions.length; ci++) {
      const cond = rule.conditions[ci];
      if (cond.type === 'id' && cond.field === fieldName) {
        switch (cond.op) {
          case 'is':
            if (func(rule, cond.value)) {
              continue ruleiter;
            }
            break;
          case 'isNot':
            if (func(rule, cond.value)) {
              continue ruleiter;
            }
            break;
          case 'oneOf':
            for (let vi = 0; vi < cond.value.length; vi++) {
              if (func(rule, cond.value[vi])) {
                continue ruleiter;
              }
            }
            break;
          case 'notOneOf':
            for (let vi = 0; vi < cond.value.length; vi++) {
              if (func(rule, cond.value[vi])) {
                continue ruleiter;
              }
            }
            break;
          default:
        }
      }
    }

    for (let ai = 0; ai < rule.actions.length; ai++) {
      const action = rule.actions[ai];
      if (action.type === 'id' && action.field === fieldName) {
        // Currently `set` is the only op, but if we add more this
        // will need to be extended
        if (action.op === 'set') {
          if (func(rule, action.value)) {
            break;
          }
        }
      }
    }
  }
}
