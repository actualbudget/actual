// @ts-strict-ignore
import {
  addSplitTransaction,
  groupTransaction,
  recalculateSplit,
  splitTransaction,
  ungroupTransaction,
} from '../../shared/transactions';
import type { RuleEntity } from '../../types/models';

import { Action } from './action';
import { Condition } from './condition';

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
