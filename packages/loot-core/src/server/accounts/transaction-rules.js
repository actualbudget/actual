import {
  currentDay,
  addDays,
  subDays,
  parseDate,
  dayFromDate
} from '../../shared/months';
import {
  FIELD_TYPES,
  sortNumbers,
  getApproxNumberThreshold
} from '../../shared/rules';
import { partitionByField, fastSetMerge } from '../../shared/util';
import { schemaConfig } from '../aql';
import * as db from '../db';
import { getMappings } from '../db/mappings';
import { RuleError } from '../errors';
import { requiredFields, toDateRepr } from '../models';
import { setSyncingMode, batchMessages } from '../sync';
import { addSyncListener } from '../sync/index';

import {
  Condition,
  Action,
  Rule,
  RuleIndexer,
  rankRules,
  migrateIds,
  iterateIds
} from './rules';

// TODO: Detect if it looks like the user is creating a rename rule
// and prompt to create it in the pre phase instead
// * We could also make the "create rule" button a dropdown that
//   provides different "templates" like "create renaming rule"

export { iterateIds } from './rules';

let allRules;
let unlistenSync;
let firstcharIndexer;
let payeeIndexer;

export function resetState() {
  allRules = new Map();
  firstcharIndexer = new RuleIndexer({
    field: 'imported_payee',
    method: 'firstchar'
  });
  payeeIndexer = new RuleIndexer({ field: 'payee' });
}

// Database functions

function invert(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(entry => {
      return [entry[1], entry[0]];
    })
  );
}

let internalFields = schemaConfig.views.transactions.fields;
let publicFields = invert(schemaConfig.views.transactions.fields);

function fromInternalField(obj) {
  return {
    ...obj,
    field: publicFields[obj.field] || obj.field
  };
}

function toInternalField(obj) {
  return {
    ...obj,
    field: internalFields[obj.field] || obj.field
  };
}

export const ruleModel = {
  validate(rule, { update } = {}) {
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

    return rule;
  },

  toJS(row) {
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

    let rule = { ...row };
    rule.conditions = rule.conditions
      ? parseArray(rule.conditions).map(cond => fromInternalField(cond))
      : [];
    rule.actions = rule.actions
      ? parseArray(rule.actions).map(action => fromInternalField(action))
      : [];
    return rule;
  },

  fromJS(rule) {
    let row = { ...rule };
    if ('conditions' in row) {
      let conditions = row.conditions.map(cond => toInternalField(cond));
      row.conditions = JSON.stringify(conditions);
    }
    if ('actions' in row) {
      let actions = row.actions.map(action => toInternalField(action));
      row.actions = JSON.stringify(actions);
    }
    return row;
  }
};

export function makeRule(data) {
  let rule;
  try {
    rule = new Rule({
      ...ruleModel.toJS(data),
      fieldTypes: FIELD_TYPES
    });
  } catch (e) {
    console.warn('Invalid rule', e);
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

  let rules = await db.all(`
    SELECT * FROM rules
      WHERE conditions IS NOT NULL AND actions IS NOT NULL AND tombstone = 0
  `);

  for (let i = 0; i < rules.length; i++) {
    let desc = rules[i];
    // These are old stages, can be removed before release
    if (desc.stage === 'cleanup' || desc.stage === 'modify') {
      desc.stage = 'pre';
    }

    let rule = makeRule(desc);
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

export async function insertRule(rule) {
  rule = ruleModel.validate(rule);
  return db.insertWithUUID('rules', ruleModel.fromJS(rule));
}

export async function updateRule(rule) {
  rule = ruleModel.validate(rule, { update: true });
  return db.update('rules', ruleModel.fromJS(rule));
}

export async function deleteRule(rule) {
  let schedule = await db.first('SELECT id FROM schedules WHERE rule = ?', [
    rule.id
  ]);

  if (schedule) {
    return false;
  }

  return db.delete_('rules', rule.id);
}

// Sync projections

function onApplySync(oldValues, newValues) {
  newValues.forEach((items, table) => {
    if (table === 'rules') {
      items.forEach(newValue => {
        let oldRule = allRules.get(newValue.id);

        if (newValue.tombstone === 1) {
          // Deleted, need to remove it from in-memory
          let rule = allRules.get(newValue.id);
          if (rule) {
            allRules.delete(rule.getId());
            firstcharIndexer.remove(rule);
            payeeIndexer.remove(rule);
          }
        } else {
          // Inserted/updated
          let rule = makeRule(newValue);
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
  let tables = [...newValues.keys()];
  if (tables.find(table => table.indexOf('mapping') !== -1)) {
    getRules().forEach(rule => {
      migrateIds(rule, getMappings());
    });
  }
}

// Runner
export function runRules(trans) {
  let finalTrans = { ...trans };

  let rules = rankRules(
    fastSetMerge(
      firstcharIndexer.getApplicableRules(trans),
      payeeIndexer.getApplicableRules(trans)
    )
  );

  for (let i = 0; i < rules.length; i++) {
    finalTrans = rules[i].apply(finalTrans);
  }

  return finalTrans;
}

// This does the inverse: finds all the transactions matching a rule
export function conditionsToAQL(conditions, { recurDateBounds = 100 } = {}) {
  let errors = [];

  conditions = conditions
    .map(cond => {
      if (cond instanceof Condition) {
        return cond;
      }

      try {
        return new Condition(
          cond.op,
          cond.field,
          cond.value,
          cond.options,
          FIELD_TYPES
        );
      } catch (e) {
        errors.push(e.type || 'internal');
        console.log('conditionsToAQL: invalid condition: ' + e.message);
        return null;
      }
    })
    .filter(Boolean);

  // rule -> actualql
  let filters = conditions.map(cond => {
    let { type, field, op, value, options } = cond;

    let getValue = value => {
      if (type === 'number') {
        return value.value;
      }
      return value;
    };

    let apply = (field, op, value) => {
      if (type === 'number') {
        if (options) {
          if (options.outflow) {
            return {
              $and: [
                { amount: { $lt: 0 } },
                { [field]: { $transform: '$neg', [op]: value } }
              ]
            };
          } else if (options.inflow) {
            return {
              $and: [{ amount: { $gt: 0 } }, { [field]: { [op]: value } }]
            };
          }
        }

        return { amount: { [op]: value } };
      } else if (type === 'string') {
        return { [field]: { $transform: '$lower', [op]: value } };
      } else if (type === 'date') {
        return { [field]: { [op]: value.date } };
      }
      return { [field]: { [op]: value } };
    };

    switch (op) {
      case 'isapprox':
      case 'is':
        if (type === 'date') {
          if (value.type === 'recur') {
            let dates = value.schedule
              .occurrences({ take: recurDateBounds })
              .toArray()
              .map(d => dayFromDate(d.date));

            return {
              $or: dates.map(d => {
                if (op === 'isapprox') {
                  return {
                    $and: [
                      { date: { $gte: subDays(d, 2) } },
                      { date: { $lte: addDays(d, 2) } }
                    ]
                  };
                }
                return { date: d };
              })
            };
          } else {
            if (op === 'isapprox') {
              let fullDate = parseDate(value.date);
              let high = addDays(fullDate, 2);
              let low = subDays(fullDate, 2);

              return {
                $and: [{ date: { $gte: low } }, { date: { $lte: high } }]
              };
            } else {
              switch (value.type) {
                case 'date':
                  return { date: value.date };
                case 'month': {
                  let low = value.date + '-00';
                  let high = value.date + '-99';
                  return {
                    $and: [{ date: { $gte: low } }, { date: { $lte: high } }]
                  };
                }
                case 'year': {
                  let low = value.date + '-00-00';
                  let high = value.date + '-99-99';
                  return {
                    $and: [{ date: { $gte: low } }, { date: { $lte: high } }]
                  };
                }
                default:
              }
            }
          }
        } else if (type === 'number') {
          let number = value.value;
          if (op === 'isapprox') {
            let threshold = getApproxNumberThreshold(number);

            return {
              $and: [
                apply(field, '$gte', number - threshold),
                apply(field, '$lte', number + threshold)
              ]
            };
          }
          return apply(field, '$eq', number);
        }

        return apply(field, '$eq', value);

      case 'isbetween':
        // This operator is only applicable to the specific `between`
        // number type so we don't use `apply`
        let [low, high] = sortNumbers(value.num1, value.num2);
        return {
          [field]: [{ $gte: low }, { $lte: high }]
        };
      case 'contains':
        // Running contains with id will automatically reach into
        // the `name` of the referenced table and do a string match
        return apply(
          type === 'id' ? field + '.name' : field,
          '$like',
          '%' + value + '%'
        );
      case 'oneOf':
        let values = value;
        if (values.length === 0) {
          // This forces it to match nothing
          return { id: null };
        }
        return { $or: values.map(v => apply(field, '$eq', v)) };
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
      default:
        throw new Error('Unhandled operator: ' + op);
    }
  });

  return { filters, errors };
}

export function applyActions(transactionIds, actions, handlers) {
  let parsedActions = actions
    .map(action => {
      if (action instanceof Action) {
        return action;
      }

      try {
        return new Action(
          action.op,
          action.field,
          action.value,
          action.options,
          FIELD_TYPES
        );
      } catch (e) {
        console.log('Action error', e);
        return null;
      }
    })
    .filter(Boolean);

  if (parsedActions.length !== actions.length) {
    // An error happened while parsing
    return null;
  }

  let updated = transactionIds.map(id => {
    let update = { id };
    for (let action of parsedActions) {
      action.exec(update);
    }
    return update;
  });

  return handlers['transactions-batch-update']({ updated });
}

export function getRulesForPayee(payeeId) {
  let rules = new Set();
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
  { condValue, actionValue }
) {
  let rules = getRules();
  for (let i = 0; i < rules.length; i++) {
    let rule = rules[i];

    if (
      rule.stage === stage &&
      rule.actions.length === 1 &&
      rule.actions[0].op === 'set' &&
      rule.actions[0].field === actionField &&
      (actionValue === undefined || rule.actions[0].value === actionValue) &&
      rule.conditions.length === 1 &&
      rule.conditions[0].op === 'is' &&
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
  { condValue, actionValue }
) {
  let rules = getRules();
  for (let i = 0; i < rules.length; i++) {
    let rule = rules[i];

    if (
      rule.stage === stage &&
      rule.actions.length === 1 &&
      rule.actions[0].op === 'set' &&
      rule.actions[0].field === actionField &&
      (actionValue == null || rule.actions[0].value === actionValue) &&
      rule.conditions.length === 1 &&
      rule.conditions[0].op === 'oneOf' &&
      rule.conditions[0].field === condField &&
      (condValue == null || rule.conditions[0].value.indexOf(condValue) !== -1)
    ) {
      yield rule.serialize();
    }
  }

  return null;
}

export async function updatePayeeRenameRule(fromNames, to) {
  let renameRule = getOneOfSetterRules('pre', 'imported_payee', 'payee', {
    actionValue: to
  }).next().value;

  // Note that we don't check for existing rules that set this
  // `imported_payee` to something else. It's important to do
  // that for categories because categories will be changes frequently
  // for the same payee, but renames won't be changed much. It's a use
  // case we could improve in the future, but this is fine for now.

  if (renameRule) {
    let condition = renameRule.conditions[0];
    let newValue = [
      ...fastSetMerge(
        new Set(condition.value),
        new Set(fromNames.filter(name => name !== ''))
      )
    ];
    let rule = {
      ...renameRule,
      conditions: [{ ...condition, value: newValue }]
    };
    await updateRule(rule);
    return renameRule.id;
  } else {
    let rule = new Rule({
      stage: 'pre',
      conditions: [{ op: 'oneOf', field: 'imported_payee', value: fromNames }],
      actions: [{ op: 'set', field: 'payee', value: to }],
      fieldTypes: FIELD_TYPES
    });
    return insertRule(rule.serialize());
  }
}

export function getProbableCategory(transactions) {
  let scores = new Map();

  transactions.forEach(trans => {
    if (trans.category) {
      scores.set(trans.category, (scores.get(trans.category) || 0) + 1);
    }
  });

  let winner = transactions.reduce((winner, trans) => {
    let score = scores.get(trans.category);
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

  let payeeIds = new Set(transactions.map(trans => trans.payee));
  let transIds = new Set(transactions.map(trans => trans.id));

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
  let register = await db.all(
    `SELECT t.* FROM v_transactions t
     LEFT JOIN accounts a ON a.id = t.account
     WHERE date >= ? AND date <= ? AND is_parent = 0 AND a.closed = 0`,
    [toDateRepr(oldestDate), toDateRepr(addDays(currentDay(), 180))]
  );

  let allTransactions = partitionByField(register, 'payee');
  let categoriesToSet = new Map();

  for (let payeeId of payeeIds) {
    // Don't do anything if payee is null
    if (payeeId) {
      let latestTrans = (allTransactions.get(payeeId) || []).slice(0, 5);

      // Check if one of the latest transactions was one that was
      // updated. We only want to update anything if so.
      if (latestTrans.find(trans => transIds.has(trans.id))) {
        let category = getProbableCategory(latestTrans);
        if (category) {
          categoriesToSet.set(payeeId, category);
        }
      }
    }
  }

  await batchMessages(async () => {
    for (let [payeeId, category] of categoriesToSet.entries()) {
      let ruleSetters = [
        ...getIsSetterRules(null, 'payee', 'category', {
          condValue: payeeId
        })
      ];

      if (ruleSetters.length > 0) {
        // If there are existing rules, change all of them to the new
        // category (if they aren't already using it). We set all of
        // them because it's possible that multiple rules exist
        // because 2 clients made them independently. Not really a big
        // deal, but to make sure our update gets applied set it to
        // all of them
        for (let rule of ruleSetters) {
          let action = rule.actions[0];
          if (action.value !== category) {
            await updateRule({
              ...rule,
              actions: [{ ...action, value: category }]
            });
          }
        }
      } else {
        // No existing rules, so create one
        let newRule = new Rule({
          stage: null,
          conditions: [{ op: 'is', field: 'payee', value: payeeId }],
          actions: [{ op: 'set', field: 'category', value: category }],
          fieldTypes: FIELD_TYPES
        });
        await insertRule(newRule.serialize());
      }
    }
  });
}

// This can be removed in the future
export async function migrateOldRules() {
  let allPayees = await db.all(
    `SELECT p.*, c.id as category FROM payees p
    LEFT JOIN category_mapping cm ON cm.id = p.category
    LEFT JOIN categories c ON (c.id = cm.transferId AND c.tombstone = 0)
    WHERE p.tombstone = 0 AND transfer_acct IS NULL`
  );
  let allRules = await db.all(
    `SELECT pr.*, pm.targetId as payee_id FROM payee_rules pr
      LEFT JOIN payee_mapping pm ON pm.id = pr.payee_id
      WHERE pr.tombstone = 0`
  );

  let payeesById = new Map();
  for (let i = 0; i < allPayees.length; i++) {
    payeesById.set(allPayees[i].id, allPayees[i]);
  }

  let rulesByPayeeId = new Map();
  for (let i = 0; i < allRules.length; i++) {
    let item = allRules[i];
    let rules = rulesByPayeeId.get(item.payee_id) || [];
    rules.push(item);
    rulesByPayeeId.set(item.payee_id, rules);
  }

  let rules = [];

  // Convert payee name rules
  for (let [payeeId, payeeRules] of rulesByPayeeId.entries()) {
    let equals = payeeRules.filter(r => {
      let payee = payeesById.get(r.payee_id);

      return (
        (r.type === 'equals' || r.type == null) &&
        (!payee || r.value.toLowerCase() !== payee.name.toLowerCase())
      );
    });
    let contains = payeeRules.filter(r => r.type === 'contains');
    let actions = [{ op: 'set', field: 'payee', value: payeeId }];

    if (equals.length > 0) {
      rules.push({
        stage: null,
        conditions: [
          {
            op: 'oneOf',
            field: 'imported_payee',
            value: equals.map(payeeRule => payeeRule.value)
          }
        ],
        actions
      });
    }

    if (contains.length > 0) {
      rules = rules.concat(
        contains.map(payeeRule => ({
          stage: null,
          conditions: [
            {
              op: 'contains',
              field: 'imported_payee',
              value: payeeRule.value
            }
          ],
          actions
        }))
      );
    }
  }

  // Convert category rules
  let catRules = allPayees
    .filter(p => p.category)
    .reduce((map, payee) => {
      let ids = map.get(payee.category) || new Set();
      ids.add(payee.id);
      map.set(payee.category, ids);
      return map;
    }, new Map());

  for (let [catId, payeeIds] of catRules) {
    rules.push({
      stage: null,
      conditions: [
        {
          op: 'oneOf',
          field: 'payee',
          value: [...payeeIds]
        }
      ],
      actions: [
        {
          op: 'set',
          field: 'category',
          value: catId
        }
      ]
    });
  }

  // Very important: we never want to sync migration changes, but it
  // still has to run through the syncing layer to make sure
  // projections are correct. This is only OK because we require a
  // sync reset after this.
  let prevMode = setSyncingMode('disabled');
  await batchMessages(async () => {
    for (let rule of rules) {
      await insertRule({
        stage: rule.stage,
        conditions: rule.conditions,
        actions: rule.actions
      });
    }

    await db.runQuery('DELETE FROM payee_rules', []);
  });
  setSyncingMode(prevMode);
}
