import { getChangedValues } from '@actual-app/core/shared/util';
import type { TransactionEntity } from '@actual-app/core/types/models';

import {
  getClearedFieldNames,
  isFieldClearedByUser,
  shouldApplyRuleChange,
} from './table/utils';
import type { ClearedFieldsByTransaction } from './table/utils';

/**
 * Merges the result of a rules run back into a transaction that is being
 * entered, respecting the user's manual input.
 *
 * Rules may fill fields the user left empty (plus notes append/prepend
 * merges; see `shouldApplyRuleChange`), but never a field the user explicitly
 * cleared. Cleared fields are tracked per transaction row, so clearing e.g.
 * the category on one split row blocks rules only on that row, not on its
 * siblings or the parent.
 */
export function applyRulesToTransaction(
  transaction: TransactionEntity,
  afterRules: TransactionEntity,
  updatedFieldName: string | null,
  clearedFields?: ClearedFieldsByTransaction,
): TransactionEntity {
  const diff = getChangedValues(transaction, afterRules);
  const newTransaction: TransactionEntity = { ...transaction };

  if (!diff) {
    return newTransaction;
  }

  const clearedOnThisRow = getClearedFieldNames(clearedFields, transaction.id);
  Object.keys(diff).forEach(field => {
    if (
      shouldApplyRuleChange(
        field,
        Reflect.get(newTransaction, field),
        Reflect.get(diff, field),
        clearedOnThisRow,
      )
    ) {
      Reflect.set(newTransaction, field, Reflect.get(diff, field));
    }
  });

  const subtransactions = propagateRuleChangeToSubtransactions(
    newTransaction,
    diff.subtransactions,
    updatedFieldName,
    clearedFields,
  );
  if (subtransactions) {
    newTransaction.subtransactions = subtransactions;
  }

  return newTransaction;
}

/**
 * When a rule updates a parent transaction, pushes the edited field's rule
 * value down to its subtransactions — but never into a row where the user
 * explicitly cleared that field, and not at all if they cleared it on the
 * parent itself. Returns the updated subtransactions, or null when there is
 * nothing to propagate.
 */
export function propagateRuleChangeToSubtransactions(
  parent: TransactionEntity,
  ruleSubtransactions: TransactionEntity[] | undefined,
  updatedFieldName: string | null,
  clearedFields?: ClearedFieldsByTransaction,
): TransactionEntity[] | null {
  if (
    !parent.is_parent ||
    ruleSubtransactions === undefined ||
    updatedFieldName === null ||
    isFieldClearedByUser(clearedFields, parent.id, updatedFieldName)
  ) {
    return null;
  }

  return ruleSubtransactions.map((st, idx) => {
    const base = parent.subtransactions?.[idx] ?? st;
    if (isFieldClearedByUser(clearedFields, base.id, updatedFieldName)) {
      return base;
    }
    const ruleValue = Reflect.get(st, updatedFieldName);
    if (ruleValue == null) {
      return base;
    }
    return { ...base, [updatedFieldName]: ruleValue };
  });
}
