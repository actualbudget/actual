// @ts-strict-ignore
import { type RuleEntity } from '../../types/models';
import { createApp } from '../app';
import { RuleError } from '../errors';
import { mutator } from '../mutators';
import { batchMessages } from '../sync';
import * as rules from '../transactions/transaction-rules';
import { undoable } from '../undo';

import { RulesHandlers } from './types/handlers';

import { Condition, Action, rankRules } from '.';

function validateRule(rule: Partial<RuleEntity>) {
  // Returns an array of errors, the array is the same link as the
  // passed-in `array`, or null if there are no errors
  function runValidation<T>(array: T[], validate: (item: T) => unknown) {
    const result = array.map(item => {
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
    });

    return result.filter((res): res is string => typeof res === 'string').length
      ? result
      : null;
  }

  const conditionErrors = runValidation(
    rule.conditions,
    cond => new Condition(cond.op, cond.field, cond.value, cond.options),
  );

  const actionErrors = runValidation(rule.actions, action =>
    action.op === 'set-split-amount'
      ? new Action(action.op, null, action.value, action.options)
      : action.op === 'link-schedule'
        ? new Action(action.op, null, action.value, null)
        : action.op === 'prepend-notes' || action.op === 'append-notes'
          ? new Action(action.op, null, action.value, null)
          : new Action(action.op, action.field, action.value, action.options),
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
export const app = createApp<RulesHandlers>();

app.method('rule-validate', async function (rule) {
  const error = validateRule(rule);
  return { error };
});

app.method(
  'rule-add',
  mutator(async function (rule) {
    const error = validateRule(rule);
    if (error) {
      return { error };
    }

    const id = await rules.insertRule(rule);
    return { id, ...rule };
  }),
);

app.method(
  'rule-update',
  mutator(async function (rule) {
    const error = validateRule(rule);
    if (error) {
      return { error };
    }

    await rules.updateRule(rule);
    return rule;
  }),
);

app.method(
  'rule-delete',
  mutator(async function (id) {
    return rules.deleteRule(id);
  }),
);

app.method(
  'rule-delete-all',
  mutator(async function (ids) {
    let someDeletionsFailed = false;

    await batchMessages(async () => {
      for (const id of ids) {
        const res = await rules.deleteRule(id);
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
    undoable(async function ({ transactions, actions }) {
      return rules.applyActions(transactions, actions);
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
  const rule = rules.getRules().find(rule => rule.id === id);
  return rule ? rule.serialize() : null;
});

app.method('rules-run', async function ({ transaction }) {
  return rules.runRules(transaction);
});
