// @ts-strict-ignore
import * as dateFns from 'date-fns';

import { logger } from '../../platform/server/log';
import { recurConfigToRSchedule } from '../../shared/schedules';
import type { RuleConditionEntity } from '../../types/models';
import { RuleError } from '../errors';
import { RSchedule } from '../util/rschedule';

import type { Rule } from './rule';

export function assert(test: unknown, type: string, msg: string): asserts test {
  if (!test) {
    throw new RuleError(type, msg);
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
      logger.log(`Found invalid operation while ranking: ${condition.op}`);
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

export function parseRecurDate(desc) {
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

export function parseBetweenAmount(between) {
  const { num1, num2 } = between;
  if (typeof num1 !== 'number' || typeof num2 !== 'number') {
    return null;
  }
  return { type: 'between', num1, num2 };
}
