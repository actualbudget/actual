// @ts-strict-ignore
// TODO: remove strict
import { send } from 'loot-core/platform/client/connection';
import { applyTransactionDiff } from 'loot-core/shared/transactions';
import { applyChanges, getChangedValues } from 'loot-core/shared/util';
import type { TransactionEntity } from 'loot-core/types/models';

type SaveChanges = {
  data: TransactionEntity[];
  diff: {
    added: unknown[];
    deleted: unknown[];
    updated: Record<string, unknown>[];
  };
  newTransaction: TransactionEntity;
};

export async function saveDiff(diff, learnCategories) {
  const remoteUpdates = await send('transactions-batch-update', {
    ...diff,
    learnCategories,
  });

  if (remoteUpdates && remoteUpdates.updated.length > 0) {
    return { updates: remoteUpdates };
  }
  return {};
}

export async function saveDiffAndApply(
  diff,
  changes: SaveChanges,
  onChange,
  learnCategories,
) {
  const remoteDiff = await saveDiff(diff, learnCategories);
  onChange(
    // TODO:
    // @ts-expect-error - fix me
    applyTransactionDiff(changes.newTransaction, remoteDiff),
    // TODO:
    // @ts-expect-error - fix me
    applyChanges(remoteDiff, changes.data),
  );
}

export async function applyRulesToTransaction(
  transaction: TransactionEntity,
  updatedFieldName: string | null = null,
  onRuleErrors?: (errors: string[]) => void,
) {
  const afterRules = await send('rules-run', { transaction });

  if (afterRules._ruleErrors && afterRules._ruleErrors.length > 0) {
    onRuleErrors?.(afterRules._ruleErrors);
  }

  const diff = getChangedValues(transaction, afterRules);
  const newTransaction: TransactionEntity = { ...transaction };

  if (diff) {
    Object.keys(diff).forEach(field => {
      if (
        newTransaction[field] == null ||
        newTransaction[field] === '' ||
        newTransaction[field] === 0 ||
        newTransaction[field] === false
      ) {
        newTransaction[field] = diff[field];
      }
    });

    if (
      transaction.is_parent &&
      diff.subtransactions !== undefined &&
      updatedFieldName !== null
    ) {
      newTransaction.subtransactions = diff.subtransactions.map((st, idx) => ({
        ...(newTransaction.subtransactions?.[idx] || st),
        ...(st[updatedFieldName] != null && {
          [updatedFieldName]: st[updatedFieldName],
        }),
      }));
    }
  }

  return newTransaction;
}
