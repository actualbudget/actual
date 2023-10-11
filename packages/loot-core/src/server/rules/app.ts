import { FIELD_TYPES as ruleFieldTypes } from '../../shared/rules';
import { type RuleEntity } from '../../types/models';
import { Condition, Action, rankRules } from '../accounts/rules';
import * as rules from '../accounts/transaction-rules';
import { createApp } from '../app';
import { RuleError } from '../errors';
import { mutator } from '../mutators';
import { batchMessages } from '../sync';
import { undoable } from '../undo';

import { RulesHandlers } from './types/handlers';

function validateRule(rule: Partial<RuleEntity>) {
  // Returns an array of errors, the array is the same link as the
  // passed-in `array`, or null if there are no errors
  function runValidation<T>(array: T[], validate: (item: T) => unknown) {
    const result = array
      .map(item => {
        try {
          validate(item);
        } catch (e) {
          if (e instanceof RuleError) {
            console.warn('Invalid rule', e);
            return e.type;
          }
          throw e;
        }
        return null;
      })
      .filter((res): res is string => typeof res === 'string');

    return result.length ? result : null;
  }

  let conditionErrors = runValidation(
    rule.conditions,
    cond =>
      new Condition(
        cond.op,
        cond.field,
        cond.value,
        cond.options,
        ruleFieldTypes,
      ),
  );

  let actionErrors = runValidation(rule.actions, action =>
    action.op === 'link-schedule'
      ? new Action(action.op, null, action.value, null, ruleFieldTypes)
      : new Action(
          action.op,
          action.field,
          action.value,
          action.options,
          ruleFieldTypes,
        ),
  );

  if (conditionErrors || actionErrors) {
    return {
      conditionErrors,
      actionErrors,
    };
  }

  return null;
}

// Expose functions to the client
let app = createApp<RulesHandlers>();

app.method('rule-validate', async function (rule) {
  let error = validateRule(rule);
  return { error };
});

app.method(
  'rule-add',
  mutator(async function (rule) {
    let error = validateRule(rule);
    if (error) {
      return { error };
    }

    let id = await rules.insertRule(rule);
    return { id };
  }),
);

app.method(
  'rule-update',
  mutator(async function (rule) {
    let error = validateRule(rule);
    if (error) {
      return { error };
    }

    await rules.updateRule(rule);
    return {};
  }),
);

app.method(
  'rule-delete',
  mutator(async function (rule) {
    return rules.deleteRule(rule);
  }),
);

app.method(
  'rule-delete-all',
  mutator(async function (ids) {
    let someDeletionsFailed = false;

    await batchMessages(async () => {
      for (let id of ids) {
        let res = await rules.deleteRule({ id });
        if (res === false) {
          someDeletionsFailed = true;
        }
      }
    });

    return { someDeletionsFailed };
  }),
);

app.method(
  'rule-apply-actions',
  mutator(
    undoable(async function ({ transactionIds, actions }) {
      return rules.applyActions(transactionIds, actions);
    }),
  ),
);

app.method(
  'rule-add-payee-rename',
  mutator(async function ({ fromNames, to }) {
    return rules.updatePayeeRenameRule(fromNames, to);
  }),
);

app.method('rules-get', async function () {
  return rankRules(rules.getRules()).map(rule => rule.serialize());
});

app.method('rule-get', async function ({ id }) {
  let rule = rules.getRules().find(rule => rule.id === id);
  return rule ? rule.serialize() : null;
});

app.method('rules-run', async function ({ transaction }) {
  return rules.runRules(transaction);
});

export default app;
