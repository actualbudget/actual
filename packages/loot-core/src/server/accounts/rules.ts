// @ts-strict-ignore
import * as dateFns from 'date-fns';

import {
  monthFromDate,
  yearFromDate,
  isBefore,
  isAfter,
  addDays,
  subDays,
  parseDate,
} from '../../shared/months';
import { sortNumbers, getApproxNumberThreshold } from '../../shared/rules';
import { recurConfigToRSchedule } from '../../shared/schedules';
import {
  addSplitTransaction,
  recalculateSplit,
  splitTransaction,
  ungroupTransaction,
} from '../../shared/transactions';
import { fastSetMerge } from '../../shared/util';
import { RuleConditionEntity } from '../../types/models';
import { RuleError } from '../errors';
import * as prefs from '../prefs';
import { Schedule as RSchedule } from '../util/rschedule';

function assert(test, type, msg) {
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
    ops: ['is', 'contains', 'oneOf', 'isNot', 'doesNotContain', 'notOneOf'],
    nullable: true,
    parse(op, value, fieldName) {
      if (op === 'oneOf' || op === 'notOneOf') {
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
    ops: ['is', 'contains', 'oneOf', 'isNot', 'doesNotContain', 'notOneOf'],
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

      if (op === 'contains' || op === 'doesNotContain') {
        assert(
          typeof value === 'string' && value.length > 0,
          'no-empty-string',
          `contains must have non-empty string (field: ${fieldName})`,
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

  constructor(op, field, value, options, fieldTypes) {
    const typeName = fieldTypes.get(field);
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
      type.ops.includes(op),
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
    if (fieldValue === undefined) {
      return false;
    }

    if (typeof fieldValue === 'string') {
      fieldValue = fieldValue.toLowerCase();
    }

    const type = this.type;

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
        return fieldValue.indexOf(this.value) !== -1;
      case 'doesNotContain':
        if (fieldValue === null) {
          return false;
        }
        return fieldValue.indexOf(this.value) === -1;
      case 'oneOf':
        if (fieldValue === null) {
          return false;
        }
        return this.value.indexOf(fieldValue) !== -1;
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

const ACTION_OPS = ['set', 'set-split-amount', 'link-schedule'] as const;
type ActionOperator = (typeof ACTION_OPS)[number];

export class Action {
  field;
  op: ActionOperator;
  options;
  rawValue;
  type;
  value;

  constructor(op: ActionOperator, field, value, options, fieldTypes) {
    assert(
      ACTION_OPS.includes(op),
      'internal',
      `Invalid action operation: ${op}`,
    );

    if (op === 'set') {
      const typeName = fieldTypes.get(field);
      assert(typeName, 'internal', `Invalid field for action: ${field}`);
      this.field = field;
      this.type = typeName;
    } else if (op === 'set-split-amount') {
      this.field = null;
      this.type = 'number';
    } else if (op === 'link-schedule') {
      this.field = null;
      this.type = 'id';
    }

    this.op = op;
    this.rawValue = value;
    this.value = value;
    this.options = options;
  }

  exec(object) {
    switch (this.op) {
      case 'set':
        object[this.field] = this.value;
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

export function execActions(actions: Action[], transaction) {
  const parentActions = actions.filter(action => !action.options?.splitIndex);
  const childActions = actions.filter(action => action.options?.splitIndex);
  const totalSplitCount =
    actions.reduce(
      (prev, cur) => Math.max(prev, cur.options?.splitIndex ?? 0),
      0,
    ) + 1;

  let update = execNonSplitActions(parentActions, transaction);
  if (!prefs.getPrefs()?.['flags.splitsInRules'] || totalSplitCount === 1) {
    return update;
  }

  if (update.is_child) {
    // Rules with splits can't be applied to child transactions.
    return update;
  }

  const splitAmountActions = childActions.filter(
    action => action.op === 'set-split-amount',
  );
  const fixedSplitAmountActions = splitAmountActions.filter(
    action => action.options.method === 'fixed-amount',
  );
  const fixedAmountsBySplit: Record<number, number> = {};
  fixedSplitAmountActions.forEach(action => {
    const splitIndex = action.options.splitIndex ?? 0;
    fixedAmountsBySplit[splitIndex] = action.value;
  });
  const fixedAmountSplitCount = Object.keys(fixedAmountsBySplit).length;
  const totalFixedAmount = Object.values(fixedAmountsBySplit).reduce<number>(
    (prev, cur: number) => prev + cur,
    0,
  );
  if (
    fixedAmountSplitCount === totalSplitCount &&
    totalFixedAmount !== (transaction.amount ?? totalFixedAmount)
  ) {
    // Not all value would be distributed to a split.
    return transaction;
  }

  const { data, newTransaction } = splitTransaction(
    ungroupTransaction(update),
    transaction.id,
  );
  update = recalculateSplit(newTransaction);
  data[0] = update;
  let newTransactions = data;

  for (const action of childActions) {
    const splitIndex = action.options?.splitIndex ?? 0;
    if (splitIndex >= update.subtransactions.length) {
      const { data, newTransaction } = addSplitTransaction(
        newTransactions,
        transaction.id,
      );
      update = recalculateSplit(newTransaction);
      data[0] = update;
      newTransactions = data;
    }
    action.exec(update.subtransactions[splitIndex]);
  }

  // Make sure every transaction has an amount.
  if (fixedAmountSplitCount !== totalSplitCount) {
    // This is the amount that will be distributed to the splits that
    // don't have a fixed amount. The last split will get the remainder.
    // The amount will be zero if the parent transaction has no amount.
    const amountToDistribute =
      (transaction.amount ?? totalFixedAmount) - totalFixedAmount;
    let remainingAmount = amountToDistribute;

    // First distribute the fixed percentages.
    splitAmountActions
      .filter(action => action.options.method === 'fixed-percent')
      .forEach(action => {
        const splitIndex = action.options.splitIndex;
        const percent = action.value / 100;
        const amount = Math.round(amountToDistribute * percent);
        update.subtransactions[splitIndex].amount = amount;
        remainingAmount -= amount;
      });

    // Then distribute the remainder.
    const remainderSplitAmountActions = splitAmountActions.filter(
      action => action.options.method === 'remainder',
    );

    // Check if there is any value left to distribute after all fixed
    // (percentage and amount) splits have been distributed.
    if (remainingAmount !== 0) {
      // If there are no remainder splits explicitly added by the user,
      // distribute the remainder to a virtual split that will be
      // adjusted for the remainder.
      if (remainderSplitAmountActions.length === 0) {
        const splitIndex = totalSplitCount;
        const { newTransaction } = addSplitTransaction(
          newTransactions,
          transaction.id,
        );
        update = recalculateSplit(newTransaction);
        update.subtransactions[splitIndex].amount = remainingAmount;
      } else {
        const amountPerRemainderSplit = Math.round(
          remainingAmount / remainderSplitAmountActions.length,
        );
        let lastNonFixedIndex = -1;
        remainderSplitAmountActions.forEach(action => {
          const splitIndex = action.options.splitIndex;
          update.subtransactions[splitIndex].amount = amountPerRemainderSplit;
          remainingAmount -= amountPerRemainderSplit;
          lastNonFixedIndex = Math.max(lastNonFixedIndex, splitIndex);
        });

        // The last non-fixed split will be adjusted for the remainder.
        update.subtransactions[lastNonFixedIndex].amount -= remainingAmount;
      }
      update = recalculateSplit(update);
    }
  }

  // The split index 0 is reserved for "Apply to all" actions.
  // Remove that entry from the subtransactions.
  update.subtransactions = update.subtransactions.slice(1);

  return update;
}

export class Rule {
  actions;
  conditions;
  conditionsOp;
  id;
  stage;

  constructor({
    id,
    stage,
    conditionsOp,
    conditions,
    actions,
    fieldTypes,
  }: {
    id?: string;
    stage?;
    conditionsOp;
    conditions;
    actions;
    fieldTypes;
  }) {
    this.id = id;
    this.stage = stage;
    this.conditionsOp = conditionsOp;
    this.conditions = conditions.map(
      c => new Condition(c.op, c.field, c.value, c.options, fieldTypes),
    );
    this.actions = actions.map(
      a => new Action(a.op, a.field, a.value, a.options, fieldTypes),
    );
  }

  evalConditions(object) {
    if (this.conditions.length === 0) {
      return false;
    }

    const method = this.conditionsOp === 'or' ? 'some' : 'every';
    return this.conditions[method](condition => {
      return condition.eval(object);
    });
  }

  execActions(object) {
    const result = execActions(this.actions, {
      ...object,
      subtransactions: object.subtransactions,
    });
    const changes = Object.keys(result).reduce((prev, cur) => {
      if (result[cur] !== object[cur]) {
        prev[cur] = result[cur];
      }
      return prev;
    }, {});
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

  getId() {
    return this.id;
  }

  serialize() {
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
  field;
  method;
  rules;

  constructor({ field, method }: { field: string; method?: string }) {
    this.field = field;
    this.method = method;
    this.rules = new Map();
  }

  getIndex(key) {
    if (!this.rules.has(key)) {
      this.rules.set(key, new Set());
    }
    return this.rules.get(key);
  }

  getIndexForValue(value) {
    return this.getIndex(this.getKey(value) || '*');
  }

  getKey(value) {
    if (typeof value === 'string' && value !== '') {
      if (this.method === 'firstchar') {
        return value[0].toLowerCase();
      }
      return value.toLowerCase();
    }
    return null;
  }

  getIndexes(rule) {
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

  index(rule) {
    const indexes = this.getIndexes(rule);
    indexes.forEach(index => {
      index.add(rule);
    });
  }

  remove(rule) {
    const indexes = this.getIndexes(rule);
    indexes.forEach(index => {
      index.delete(rule);
    });
  }

  getApplicableRules(object) {
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
};

function computeScore(rule) {
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

function _rankRules(rules) {
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

export function rankRules(rules) {
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

export function migrateIds(rule, mappings) {
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
export function iterateIds(rules, fieldName, func) {
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
