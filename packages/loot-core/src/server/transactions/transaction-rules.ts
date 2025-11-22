// @ts-strict-ignore

import { logger } from '../../platform/server/log';
import {
  currentDay,
  addDays,
  subDays,
  parseDate,
  dayFromDate,
} from '../../shared/months';
import { q } from '../../shared/query';
import { sortNumbers, getApproxNumberThreshold } from '../../shared/rules';
import { ungroupTransaction } from '../../shared/transactions';
import { partitionByField, fastSetMerge } from '../../shared/util';
import {
  type TransactionEntity,
  type RuleActionEntity,
  type RuleEntity,
} from '../../types/models';
import { aqlQuery, schemaConfig } from '../aql';
import * as db from '../db';
import {
  getPayee,
  getPayeeByName,
  insertPayee,
  getAccount,
  getCategory,
} from '../db';
import { getMappings } from '../db/mappings';
import { RuleError } from '../errors';
import { requiredFields, toDateRepr } from '../models';
import {
  Condition,
  Action,
  Rule,
  RuleIndexer,
  rankRules,
  migrateIds,
  iterateIds,
  execActions,
} from '../rules';
import { batchMessages, addSyncListener } from '../sync';

import { batchUpdateTransactions } from '.';

// TODO: Detect if it looks like the user is creating a rename rule
// and prompt to create it in the pre phase instead
// * We could also make the "create rule" button a dropdown that
//   provides different "templates" like "create renaming rule"

export { iterateIds } from '../rules';

let allRules;
let unlistenSync;
let firstcharIndexer;
let payeeIndexer;

export function resetState() {
  allRules = new Map();
  firstcharIndexer = new RuleIndexer({
    field: 'imported_payee',
    method: 'firstchar',
  });
  payeeIndexer = new RuleIndexer({ field: 'payee' });
}

// Database functions

function invert(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(entry => {
      return [entry[1], entry[0]];
    }),
  );
}

const internalFields = schemaConfig.views.transactions.fields;
const publicFields = invert(schemaConfig.views.transactions.fields);

function fromInternalField<T extends { field: string }>(obj: T): T {
  return {
    ...obj,
    field: publicFields[obj.field] || obj.field,
  };
}

function toInternalField<T extends { field: string }>(obj: T): T {
  return {
    ...obj,
    field: internalFields[obj.field] || obj.field,
  };
}

function parseArray(str) {
  let value;
  try {
    value = typeof str === 'string' ? JSON.parse(str) : str;
  } catch (e) {
    throw new RuleError('internal', 'Cannot parse rule json');
  }

  if (!Array.isArray(value)) {
    throw new RuleError('internal', 'Rule json must be an array');
  }
  return value;
}

export function parseConditionsOrActions(str) {
  return str ? parseArray(str).map(item => fromInternalField(item)) : [];
}

export function serializeConditionsOrActions(arr) {
  return JSON.stringify(arr.map(item => toInternalField(item)));
}

export const ruleModel = {
  validate(rule, { update }: { update?: boolean } = {}) {
    requiredFields('rules', rule, ['conditions', 'actions'], update);

    if (!update || 'stage' in rule) {
      if (
        rule.stage !== 'pre' &&
        rule.stage !== 'post' &&
        rule.stage !== null
      ) {
        throw new Error('Invalid rule stage: ' + rule.stage);
      }
    }
    if (!update || 'conditionsOp' in rule) {
      if (!['and', 'or'].includes(rule.conditionsOp)) {
        throw new Error('Invalid rule conditionsOp: ' + rule.conditionsOp);
      }
    }

    return rule;
  },

  toJS(row) {
    const { conditions, conditions_op, actions, ...fields } = row;
    return {
      ...fields,
      conditionsOp: conditions_op,
      conditions: parseConditionsOrActions(conditions),
      actions: parseConditionsOrActions(actions),
    };
  },

  fromJS(rule) {
    const { conditions, conditionsOp, actions, ...row } = rule;
    if (conditionsOp) {
      row.conditions_op = conditionsOp;
    }
    if (Array.isArray(conditions)) {
      row.conditions = serializeConditionsOrActions(conditions);
    }
    if (Array.isArray(actions)) {
      row.actions = serializeConditionsOrActions(actions);
    }
    return row;
  },
};

export function makeRule(data) {
  let rule;
  try {
    rule = new Rule(ruleModel.toJS(data));
  } catch (e) {
    logger.warn('Invalid rule', e);
    if (e instanceof RuleError) {
      return null;
    }
    throw e;
  }

  // This is needed because we map ids on the fly, and they might
  // not be persisted into the db. Mappings allow items to
  // transparently merge with other items
  migrateIds(rule, getMappings());

  return rule;
}

export async function loadRules() {
  resetState();

  const rules = await db.all<db.DbRule>(`
    SELECT * FROM rules
      WHERE conditions IS NOT NULL AND actions IS NOT NULL AND tombstone = 0
  `);

  for (let i = 0; i < rules.length; i++) {
    const desc = rules[i];
    // These are old stages, can be removed before release
    if (desc.stage === 'cleanup' || desc.stage === 'modify') {
      desc.stage = 'pre';
    }

    const rule = makeRule(desc);
    if (rule) {
      allRules.set(rule.id, rule);
      firstcharIndexer.index(rule);
      payeeIndexer.index(rule);
    }
  }

  if (unlistenSync) {
    unlistenSync();
  }
  unlistenSync = addSyncListener(onApplySync);
}

export function getRules() {
  // This can simply return the in-memory data
  return [...allRules.values()];
}

export async function insertRule(
  rule: Omit<RuleEntity, 'id'> & { id?: string },
) {
  rule = ruleModel.validate(rule);
  return db.insertWithUUID('rules', ruleModel.fromJS(rule));
}

export async function updateRule(rule) {
  rule = ruleModel.validate(rule, { update: true });
  return db.update('rules', ruleModel.fromJS(rule));
}

export async function deleteRule(id: string) {
  const schedule = await db.first<Pick<db.DbSchedule, 'id'>>(
    'SELECT id FROM schedules WHERE rule = ?',
    [id],
  );

  if (schedule) {
    return false;
  }

  await db.delete_('rules', id);
  return true;
}

// Sync projections

function onApplySync(oldValues, newValues) {
  newValues.forEach((items, table) => {
    if (table === 'rules') {
      items.forEach(newValue => {
        const oldRule = allRules.get(newValue.id);

        if (newValue.tombstone === 1) {
          // Deleted, need to remove it from in-memory
          const rule = allRules.get(newValue.id);
          if (rule) {
            allRules.delete(rule.getId());
            firstcharIndexer.remove(rule);
            payeeIndexer.remove(rule);
          }
        } else {
          // Inserted/updated
          const rule = makeRule(newValue);
          if (rule) {
            if (oldRule) {
              firstcharIndexer.remove(oldRule);
              payeeIndexer.remove(oldRule);
            }
            allRules.set(newValue.id, rule);
            firstcharIndexer.index(rule);
            payeeIndexer.index(rule);
          }
        }
      });
    }
  });

  // If any of the mapping tables have changed, we need to refresh the
  // ids
  const tables = [...newValues.keys()];
  if (tables.find(table => table.indexOf('mapping') !== -1)) {
    getRules().forEach(rule => {
      migrateIds(rule, getMappings());
    });
  }
}

export async function getRuleIdFromScheduleId(
  scheduleId: string,
): Promise<string | null> {
  const row = await db.first<Pick<db.DbSchedule, 'rule'>>(
    'SELECT rule FROM schedules WHERE id = ?',
    [scheduleId],
  );

  return row?.rule || null;
}

export async function getAllRuleIdsFromSchedules(
  excluding: string,
): Promise<string[]> {
  const rows = await db.all<Pick<db.DbSchedule, 'rule'>>(
    'SELECT rule FROM schedules',
  );

  // map all rule ids, filter out null/undefined, and de-dupe if needed
  const ruleIds = rows
    .map(r => r.rule)
    .filter((rule): rule is string => !!rule)
    .filter(ruleId => ruleId !== excluding);

  return ruleIds;
}

// Runner
export async function runRules(
  trans,
  accounts: Map<string, db.DbAccount> | null = null,
) {
  let accountsMap: Map<string, db.DbAccount> = null;
  if (accounts === null) {
    accountsMap = new Map(
      (await db.getAccounts()).map(account => [account.id, account]),
    );
  } else {
    accountsMap = accounts;
  }

  let finalTrans = await prepareTransactionForRules({ ...trans }, accountsMap);

  let scheduleRuleID = '';
  // Check if a schedule is attached to this transaction and if so get the rule ID attached to that schedule.
  if (trans.schedule != null) {
    const ruleId = await getRuleIdFromScheduleId(trans.schedule);
    if (ruleId != null) {
      scheduleRuleID = ruleId;
    }
  }

  const RuleIdsLinkedToSchedules =
    await getAllRuleIdsFromSchedules(scheduleRuleID);

  const rules = rankRules(
    fastSetMerge(
      firstcharIndexer.getApplicableRules(trans),
      payeeIndexer.getApplicableRules(trans),
    ),
  );

  for (let i = 0; i < rules.length; i++) {
    // If there is a scheduleRuleID (meaning this transaction came from a schedule) then exclude rules linked to other schedules.
    if (scheduleRuleID !== '') {
      if (rules[i].id === scheduleRuleID) {
        // bypass condition checking to run the rule even if the transaction date falls outside of the schedule's date range.
        const changes = rules[i].execActions(finalTrans);
        finalTrans = Object.assign({}, finalTrans, changes);
      } else if (RuleIdsLinkedToSchedules.includes(rules[i].id)) {
        // skip all other rules that are linked to other schedules.
        continue;
      } else {
        // if a rule is not linked to a schedule, run it.
        finalTrans = rules[i].apply(finalTrans);
      }
    } else {
      // if there is no scheduleRuleID then just run all rules.
      finalTrans = rules[i].apply(finalTrans);
    }
  }

  return await finalizeTransactionForRules(finalTrans);
}

function conditionSpecialCases(cond: Condition | null): Condition | null {
  if (!cond) {
    return cond;
  }

  //special cases that require multiple conditions
  if (cond.op === 'is' && cond.field === 'category' && cond.value === null) {
    return new Condition(
      'and',
      cond.field,
      [
        cond,
        new Condition('is', 'transfer', false, null),
        new Condition('is', 'parent', false, null),
      ],
      {},
    );
  } else if (
    cond.op === 'isNot' &&
    cond.field === 'category' &&
    cond.value === null
  ) {
    return new Condition(
      'and',
      cond.field,
      [cond, new Condition('is', 'parent', false, null)],
      {},
    );
  }
  return cond;
}

// This does the inverse: finds all the transactions matching a rule
export function conditionsToAQL(
  conditions,
  { recurDateBounds = 100, applySpecialCases = true } = {},
) {
  const errors = [];

  conditions = conditions
    .map(cond => {
      if (cond instanceof Condition) {
        return cond;
      }

      try {
        return new Condition(cond.op, cond.field, cond.value, cond.options);
      } catch (e) {
        errors.push(e.type || 'internal');
        logger.log('conditionsToAQL: invalid condition: ' + e.message);
        return null;
      }
    })
    .map(cond => (applySpecialCases ? conditionSpecialCases(cond) : cond))
    .filter(Boolean);

  // rule -> actualql
  const mapConditionToActualQL = cond => {
    const { type, options } = cond;
    let { field, op, value } = cond;

    const getValue = value => {
      if (type === 'number') {
        return value.value;
      }
      return value;
    };

    if (field === 'transfer' && op === 'is') {
      field = 'transfer_id';
      if (value) {
        op = 'isNot';
        value = null;
      } else {
        value = null;
      }
    } else if (field === 'parent' && op === 'is') {
      field = 'is_parent';
      if (value) {
        op = 'true';
      } else {
        op = 'false';
      }
    }

    const apply = (field, aqlOp, value) => {
      if (type === 'number') {
        if (options) {
          if (options.outflow) {
            return {
              $and: [
                { amount: { $lt: 0 } },
                { [field]: { $transform: '$neg', [aqlOp]: value } },
              ],
            };
          } else if (options.inflow) {
            return {
              $and: [{ amount: { $gt: 0 } }, { [field]: { [aqlOp]: value } }],
            };
          }
        }

        return { amount: { [aqlOp]: value } };
      } else if (type === 'string') {
        return {
          [field]: {
            $transform: op !== 'hasTags' ? '$lower' : undefined,
            [aqlOp]: value,
          },
        };
      } else if (type === 'date') {
        return { [field]: { [aqlOp]: value.date } };
      }
      return { [field]: { [aqlOp]: value } };
    };

    switch (op) {
      case 'isapprox':
      case 'is':
        if (type === 'date') {
          if (value.type === 'recur') {
            const dates = value.schedule
              .occurrences({ take: recurDateBounds })
              .toArray()
              .map(d => dayFromDate(d.date));

            return {
              $or: dates.map(d => {
                if (op === 'isapprox') {
                  return {
                    $and: [
                      { date: { $gte: subDays(d, 2) } },
                      { date: { $lte: addDays(d, 2) } },
                    ],
                  };
                }
                return { date: d };
              }),
            };
          } else {
            if (op === 'isapprox') {
              const fullDate = parseDate(value.date);
              const high = addDays(fullDate, 2);
              const low = subDays(fullDate, 2);

              return {
                $and: [{ date: { $gte: low } }, { date: { $lte: high } }],
              };
            } else {
              switch (value.type) {
                case 'date':
                  return { date: value.date };
                case 'month': {
                  const low = value.date + '-00';
                  const high = value.date + '-99';
                  return {
                    $and: [{ date: { $gte: low } }, { date: { $lte: high } }],
                  };
                }
                case 'year': {
                  const low = value.date + '-00-00';
                  const high = value.date + '-99-99';
                  return {
                    $and: [{ date: { $gte: low } }, { date: { $lte: high } }],
                  };
                }
                default:
              }
            }
          }
        } else if (type === 'number') {
          const number = value.value;
          if (op === 'isapprox') {
            const threshold = getApproxNumberThreshold(number);

            return {
              $and: [
                apply(field, '$gte', number - threshold),
                apply(field, '$lte', number + threshold),
              ],
            };
          }
          return apply(field, '$eq', number);
        } else if (type === 'string') {
          if (value === '') {
            return {
              $or: [apply(field, '$eq', null), apply(field, '$eq', '')],
            };
          }
        }
        return apply(field, '$eq', value);
      case 'isNot':
        return apply(field, '$ne', value);

      case 'isbetween':
        // This operator is only applicable to the specific `between`
        // number type so we don't use `apply`
        const [low, high] = sortNumbers(value.num1, value.num2);
        return {
          [field]: [{ $gte: low }, { $lte: high }],
        };
      case 'contains':
        // Running contains with id will automatically reach into
        // the `name` of the referenced table and do a string match
        return apply(
          type === 'id' ? field + '.name' : field,
          '$like',
          '%' + value + '%',
        );
      case 'matches':
        // Running contains with id will automatically reach into
        // the `name` of the referenced table and do a regex match
        return apply(type === 'id' ? field + '.name' : field, '$regexp', value);
      case 'doesNotContain':
        // Running contains with id will automatically reach into
        // the `name` of the referenced table and do a string match
        return apply(
          type === 'id' ? field + '.name' : field,
          '$notlike',
          '%' + value + '%',
        );
      case 'oneOf':
        const values = value;
        if (values.length === 0) {
          // This forces it to match nothing
          return { id: null };
        }
        return { $or: values.map(v => apply(field, '$eq', v)) };

      case 'hasTags':
        const tagValues = [];
        for (const [_, tag] of value.matchAll(/(?<!#)(#[^#\s]+)/g)) {
          if (!tagValues.find(t => t.tag === tag)) {
            tagValues.push(tag);
          }
        }

        return {
          $and: tagValues.map(v => {
            const regex = new RegExp(
              `(?<!#)${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s#]|$)`,
            );
            return apply(field, '$regexp', regex.source);
          }),
        };

      case 'notOneOf':
        const notValues = value;
        if (notValues.length === 0) {
          // This forces it to match nothing
          return { id: null };
        }
        return { $and: notValues.map(v => apply(field, '$ne', v)) };
      case 'gt':
        return apply(field, '$gt', getValue(value));
      case 'gte':
        return apply(field, '$gte', getValue(value));
      case 'lt':
        return apply(field, '$lt', getValue(value));
      case 'lte':
        return apply(field, '$lte', getValue(value));
      case 'true':
        return apply(field, '$eq', true);
      case 'false':
        return apply(field, '$eq', false);
      case 'and':
        return {
          $and: getValue(value).map(subExpr => mapConditionToActualQL(subExpr)),
        };

      case 'onBudget':
        return { 'account.offbudget': false };
      case 'offBudget':
        return { 'account.offbudget': true };

      default:
        throw new Error('Unhandled operator: ' + op);
    }
  };

  const filters = conditions.map(mapConditionToActualQL);
  return { filters, errors };
}

export async function applyActions(
  transactions: TransactionEntity[],
  actions: Array<Action | RuleActionEntity>,
) {
  const parsedActions = actions
    .map(action => {
      if (action instanceof Action) {
        return action;
      }

      try {
        if (action.op === 'set-split-amount') {
          return new Action(action.op, null, action.value, action.options);
        } else if (action.op === 'link-schedule') {
          return new Action(action.op, null, action.value, null);
        } else if (
          action.op === 'prepend-notes' ||
          action.op === 'append-notes'
        ) {
          return new Action(action.op, null, action.value, null);
        } else if (action.op === 'delete-transaction') {
          return new Action(action.op, null, null, null);
        }

        return new Action(
          action.op,
          action.field,
          action.value,
          action.options,
        );
      } catch (e) {
        logger.log('Action error', e);
        return null;
      }
    })
    .filter(Boolean);

  if (parsedActions.length !== actions.length) {
    // An error happened while parsing
    return null;
  }

  const accounts: db.DbAccount[] = await db.getAccounts();
  const accountsMap = new Map(accounts.map(account => [account.id, account]));
  const transactionsForRules = await Promise.all(
    transactions.map(transactions =>
      prepareTransactionForRules(transactions, accountsMap),
    ),
  );

  const updated = transactionsForRules.flatMap(trans => {
    return ungroupTransaction(execActions(parsedActions, trans));
  });

  const finalized: TransactionEntity[] = [];
  for (const trans of updated) {
    finalized.push(await finalizeTransactionForRules(trans));
  }

  return batchUpdateTransactions({ updated: finalized });
}

export function getRulesForPayee(payeeId) {
  const rules = new Set<Rule>();
  iterateIds(getRules(), 'payee', (rule, id) => {
    if (id === payeeId) {
      rules.add(rule);
    }
  });

  return rankRules([...rules]);
}

function* getIsSetterRules(
  stage,
  condField,
  actionField,
  { condValue, actionValue }: { condValue?: string; actionValue?: string },
) {
  const rules = getRules();
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];

    if (
      rule.stage === stage &&
      rule.actions.length === 1 &&
      rule.actions[0].op === 'set' &&
      rule.actions[0].field === actionField &&
      (actionValue === undefined || rule.actions[0].value === actionValue) &&
      rule.conditions.length === 1 &&
      (rule.conditions[0].op === 'is' || rule.conditions[0].op === 'isNot') &&
      rule.conditions[0].field === condField &&
      (condValue === undefined || rule.conditions[0].value === condValue)
    ) {
      yield rule.serialize();
    }
  }

  return null;
}

function* getOneOfSetterRules(
  stage,
  condField,
  actionField,
  { condValue, actionValue }: { condValue?: string; actionValue: string },
) {
  const rules = getRules();
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];

    if (
      rule.stage === stage &&
      rule.actions.length === 1 &&
      rule.actions[0].op === 'set' &&
      rule.actions[0].field === actionField &&
      (actionValue == null || rule.actions[0].value === actionValue) &&
      rule.conditions.length === 1 &&
      (rule.conditions[0].op === 'oneOf' ||
        rule.conditions[0].op === 'oneOf') &&
      rule.conditions[0].field === condField &&
      (condValue == null || rule.conditions[0].value.indexOf(condValue) !== -1)
    ) {
      yield rule.serialize();
    }
  }

  return null;
}

export async function updatePayeeRenameRule(fromNames: string[], to: string) {
  const renameRule = getOneOfSetterRules('pre', 'imported_payee', 'payee', {
    actionValue: to,
  }).next().value;

  // Note that we don't check for existing rules that set this
  // `imported_payee` to something else. It's important to do
  // that for categories because categories will be changes frequently
  // for the same payee, but renames won't be changed much. It's a use
  // case we could improve in the future, but this is fine for now.

  if (renameRule) {
    const condition = renameRule.conditions[0];
    const newValue = [
      ...fastSetMerge(
        new Set(condition.value),
        new Set(fromNames.filter(name => name !== '')),
      ),
    ];
    const rule = {
      ...renameRule,
      conditions: [{ ...condition, value: newValue }],
    };
    await updateRule(rule);
    return renameRule.id;
  } else {
    const rule = new Rule({
      stage: 'pre',
      conditionsOp: 'and',
      conditions: [{ op: 'oneOf', field: 'imported_payee', value: fromNames }],
      actions: [{ op: 'set', field: 'payee', value: to }],
    });
    return insertRule(rule.serialize());
  }
}

export function getProbableCategory(transactions) {
  const scores = new Map();

  transactions.forEach(trans => {
    if (trans.category) {
      scores.set(trans.category, (scores.get(trans.category) || 0) + 1);
    }
  });

  const winner = transactions.reduce((winner, trans) => {
    const score = scores.get(trans.category);
    if (!winner || score > winner.score) {
      return { score, category: trans.category };
    }
    return winner;
  }, null);

  return winner.score >= 3 ? winner.category : null;
}

export async function updateCategoryRules(transactions) {
  if (transactions.length === 0) {
    return;
  }

  const payeeIds = new Set(transactions.map(trans => trans.payee));
  const transIds = new Set(transactions.map(trans => trans.id));

  // It's going to be quickest to get the oldest date and then query
  // all transactions since then so we can work in memory
  let oldestDate = null;
  for (let i = 0; i < transactions.length; i++) {
    if (oldestDate === null || transactions[i].date < oldestDate) {
      oldestDate = transactions[i].date;
    }
  }

  // We look 6 months behind to include any other transaction. This
  // makes it so we, 1. don't have to load in all transactions ever
  // and 2. "forget" really old transactions which might be nice and
  // 3. don't have to individually run a query for each payee
  oldestDate = subDays(oldestDate, 180);

  // Also look 180 days in the future to get any future transactions
  // (this might change when we think about scheduled transactions)
  const register = await db.all<db.DbViewTransaction>(
    `SELECT t.* FROM v_transactions t
     LEFT JOIN accounts a ON a.id = t.account
     LEFT JOIN payees p ON p.id = t.payee
     WHERE date >= ? AND date <= ? AND is_parent = 0 AND a.closed = 0 AND p.learn_categories = 1
     ORDER BY date DESC`,
    [toDateRepr(oldestDate), toDateRepr(addDays(currentDay(), 180))],
  );

  const allTransactions = partitionByField(register, 'payee');
  const categoriesToSet = new Map();

  for (const payeeId of payeeIds) {
    // Don't do anything if payee is null
    if (payeeId) {
      const latestTrans = (allTransactions.get(payeeId) || []).slice(0, 5);

      // Check if one of the latest transactions was one that was
      // updated. We only want to update anything if so.
      if (latestTrans.find(trans => transIds.has(trans.id))) {
        const category = getProbableCategory(latestTrans);
        if (category) {
          categoriesToSet.set(payeeId, category);
        }
      }
    }
  }

  await batchMessages(async () => {
    for (const [payeeId, category] of categoriesToSet.entries()) {
      const ruleSetters = [
        ...getIsSetterRules(null, 'payee', 'category', {
          condValue: payeeId,
        }),
      ];

      if (ruleSetters.length > 0) {
        // If there are existing rules, change all of them to the new
        // category (if they aren't already using it). We set all of
        // them because it's possible that multiple rules exist
        // because 2 clients made them independently. Not really a big
        // deal, but to make sure our update gets applied set it to
        // all of them
        for (const rule of ruleSetters) {
          const action = rule.actions[0];
          if (action.value !== category) {
            await updateRule({
              ...rule,
              actions: [{ ...action, value: category }],
            });
          }
        }
      } else {
        // No existing rules, so create one
        const newRule = new Rule({
          stage: null,
          conditionsOp: 'and',
          conditions: [{ op: 'is', field: 'payee', value: payeeId }],
          actions: [{ op: 'set', field: 'category', value: category }],
        });
        await insertRule(newRule.serialize());
      }
    }
  });
}

export type TransactionForRules = TransactionEntity & {
  payee_name?: string;
  _account?: db.DbAccount;
  balance?: number;
  _category_name?: string;
  _account_name?: string;
};

export async function prepareTransactionForRules(
  trans: TransactionEntity,
  accounts: Map<string, db.DbAccount> | null = null,
): Promise<TransactionForRules> {
  const r: TransactionForRules = { ...trans };
  if (trans.payee) {
    const payee = await getPayee(trans.payee);
    if (payee) {
      r.payee_name = payee.name;
    }
  }

  r.balance = 0;

  if (trans.account) {
    if (accounts !== null && accounts.has(trans.account)) {
      r._account = accounts.get(trans.account);
      r._account_name = r._account?.name || '';
    } else {
      r._account = await getAccount(trans.account);
      r._account_name = r._account?.name || '';
    }

    const dateBoundary = trans.date ?? currentDay();
    let query = q('transactions')
      .filter({ account: trans.account, is_parent: false })
      .options({ splits: 'inline' });

    if (trans.id) {
      query = query.filter({ id: { $ne: trans.id } });
    }

    const sameDayFilter =
      trans.sort_order != null
        ? {
            $and: [
              { date: dateBoundary },
              { sort_order: { $lt: trans.sort_order } },
            ],
          }
        : {
            $and: [
              { date: dateBoundary },
              {
                $or: [
                  { sort_order: { $ne: null } }, // ordered items come before null sort_order
                  ...(trans.id ? [{ id: { $lt: trans.id } }] : []), // among nulls, tie-break by id
                ],
              },
            ],
          };

    const { data: balance } = await aqlQuery(
      query
        .filter({ $or: [{ date: { $lt: dateBoundary } }, sameDayFilter] })
        .calculate({ $sum: '$amount' }),
    );

    r.balance = balance ?? 0;
  }

  if (trans.category) {
    const category = await getCategory(trans.category);
    if (category) {
      r._category_name = category.name;
    }
  }

  return r;
}

export async function finalizeTransactionForRules(
  trans: TransactionEntity | TransactionForRules,
): Promise<TransactionEntity> {
  if ('payee_name' in trans) {
    if (trans.payee === 'new') {
      if (trans.payee_name) {
        let payeeId = (await getPayeeByName(trans.payee_name))?.id;
        payeeId ??= await insertPayee({
          name: trans.payee_name,
        });

        trans.payee = payeeId;
      } else {
        trans.payee = null;
      }
    }

    delete trans.payee_name;
  }

  if ('balance' in trans) {
    delete trans.balance;
  }

  return trans;
}
