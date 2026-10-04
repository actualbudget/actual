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

  // When a rule updates a parent transaction, push the edited field's rule
  // value down to the subtransactions — but never into a row where the user
  // explicitly cleared that field, and not at all if they cleared it on the
  // parent itself.
  if (
    transaction.is_parent &&
    diff.subtransactions !== undefined &&
    updatedFieldName !== null &&
    !isFieldClearedByUser(clearedFields, transaction.id, updatedFieldName)
  ) {
    newTransaction.subtransactions = diff.subtransactions.map((st, idx) => {
      const base = newTransaction.subtransactions?.[idx] ?? st;
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

  return newTransaction;
}
