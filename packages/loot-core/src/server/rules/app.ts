// @ts-strict-ignore
import { logger } from '#platform/server/log';
import { createApp } from '#server/app';
import { RuleError } from '#server/errors';
import { mutator } from '#server/mutators';
import { batchMessages } from '#server/sync';
import * as rules from '#server/transactions/transaction-rules';
import { undoable } from '#server/undo';
import type {
  PayeeEntity,
  RuleActionEntity,
  RuleEntity,
  TransactionEntity,
} from '#types/models';

import { Action, Condition, rankRules } from '.';

function validateRule(rule: Partial<RuleEntity>) {
  // Returns an array of errors, the array is the same link as the
  // passed-in `array`, or null if there are no errors
  function runValidation<T>(array: T[], validate: (item: T) => unknown) {
    const result = array.map(item => {
      try {
        validate(item);
      } catch (e) {
        if (e instanceof RuleError) {
          logger.warn('Invalid rule', e);
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
    action.op === 'delete-transaction'
      ? new Action(action.op, null, null, null)
      : action.op === 'set-split-amount'
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

type ValidationError = {
  conditionErrors: string[];
  actionErrors: string[];
};

export type RulesHandlers = {
  'rule-validate': typeof ruleValidate;
  'rule-add': typeof addRule;
  'rule-update': typeof updateRule;
  'rule-delete': typeof deleteRule;
  'rule-delete-all': typeof deleteAllRules;
  'rule-apply-actions': typeof applyRuleActions;
  'rule-add-payee-rename': typeof addRulePayeeRename;
  'rules-run': typeof runRules;
  'rules-get': typeof getRules;
  'rule-get': typeof getRule;
};

// Expose functions to the client
export const app = createApp<RulesHandlers>();

app.method('rule-validate', ruleValidate);
app.method('rule-add', mutator(addRule));
app.method('rule-update', mutator(undoable(updateRule)));
app.method('rule-delete', mutator(undoable(deleteRule)));
app.method('rule-delete-all', mutator(undoable(deleteAllRules)));
app.method('rule-apply-actions', mutator(undoable(applyRuleActions)));
app.method('rule-add-payee-rename', mutator(addRulePayeeRename));
app.method('rules-run', mutator(runRules));
app.method('rules-get', getRules);
app.method('rule-get', getRule);

async function ruleValidate(
  rule: Partial<RuleEntity>,
): Promise<{ error: ValidationError | null }> {
  const error = validateRule(rule);
  return { error };
}

async function addRule(rule: Omit<RuleEntity, 'id'>): Promise<RuleEntity> {
  const error = validateRule(rule);
  if (error) {
    throw error;
  }

  const id = await rules.insertRule(rule);
  return { id, ...rule };
}

async function updateRule(rule: RuleEntity): Promise<RuleEntity> {
  const error = validateRule(rule);
  if (error) {
    throw error;
  }

  await rules.updateRule(rule);
  return rule;
}

async function deleteRule(id: RuleEntity['id']) {
  const isSuccess = await rules.deleteRule(id);
  if (!isSuccess) {
    throw new Error(
      'Error deleting rule. The rule may be linked to a schedule which prevents it from being deleted.',
    );
  }
  return isSuccess;
}

async function deleteAllRules(ids: Array<RuleEntity['id']>): Promise<void> {
  const failedIds: Array<RuleEntity['id']> = [];

  await batchMessages(async () => {
    for (const id of ids) {
      const isSuccess = await rules.deleteRule(id);
      if (!isSuccess) {
        failedIds.push(id);
      }
    }
  });

  if (failedIds.length > 0) {
    throw new Error(
      `Error deleting ${failedIds.length} rules. These rules may be linked to schedules which prevents them from being deleted.`,
    );
  }
}

async function applyRuleActions({
  transactions,
  actions,
}: {
  transactions: TransactionEntity[];
  actions: Array<Action | RuleActionEntity>;
}): Promise<null | {
  added: TransactionEntity[];
  updated: unknown[];
  errors: string[];
}> {
  return rules.applyActions(transactions, actions);
}

async function addRulePayeeRename({
  fromNames,
  to,
}: {
  fromNames: Array<PayeeEntity['name']>;
  to: PayeeEntity['id'];
}): Promise<string> {
  return rules.updatePayeeRenameRule(fromNames, to);
}

async function getRule({
  id,
}: {
  id: RuleEntity['id'];
}): Promise<RuleEntity | null> {
  const rule = rules.getRules().find(rule => rule.id === id);
  return rule ? rule.serialize() : null;
}

async function getRules() {
  return rankRules(rules.getRules()).map(rule => rule.serialize());
}

async function runRules({
  transaction,
}: {
  transaction: TransactionEntity;
}): Promise<TransactionEntity> {
  return rules.runRules(transaction);
}
