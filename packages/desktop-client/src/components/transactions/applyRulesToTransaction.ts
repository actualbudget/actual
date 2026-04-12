import { getChangedValues } from '@actual-app/core/shared/util';
import type { TransactionEntity } from '@actual-app/core/types/models';

function isOverwritableRuleTarget(value: unknown) {
  return value == null || value === '' || value === 0 || value === false;
}

/**
 * Merges the result of a rules run back into a transaction, respecting the
 * field the user just explicitly changed.
 *
 * Rules are allowed to fill in any field that is currently empty (null, '', 0,
 * or false), EXCEPT for the field named by `updatedFieldName`. That field was
 * just set by the user, so even if it is now empty/null (e.g. the user cleared
 * a pre-assigned category), the rule must not overwrite it.
 */
export function applyRulesToTransaction(
  transaction: TransactionEntity,
  afterRules: TransactionEntity,
  updatedFieldName: string | null,
): TransactionEntity {
  const diff = getChangedValues(transaction, afterRules);
  const newTransaction: TransactionEntity = { ...transaction };

  if (diff) {
    Object.keys(diff).forEach(field => {
      // Never override a field the user just explicitly changed.
      // This allows clearing a pre-assigned category (or any other field)
      // without the rule immediately re-filling it.
      if (field === updatedFieldName) return;

      const currentValue = Reflect.get(newTransaction, field);
      if (isOverwritableRuleTarget(currentValue)) {
        Reflect.set(newTransaction, field, Reflect.get(diff, field));
      }
    });

    // When a rule updates a parent transaction, propagate the updated field
    // value down to all subtransactions — but only when the user actually set
    // the field to a real (non-null) value on the parent. If the user cleared
    // the field (parent value is null/undefined), don't let rules fill it on
    // the children either.
    if (
      transaction.is_parent &&
      diff.subtransactions !== undefined &&
      updatedFieldName !== null
    ) {
      const parentValue = Reflect.get(newTransaction, updatedFieldName);

      newTransaction.subtransactions = diff.subtransactions.map((st, idx) => {
        const base = newTransaction.subtransactions?.[idx] ?? st;
        // If the parent field was cleared, don't propagate the rule value.
        if (isOverwritableRuleTarget(parentValue)) return base;
        const ruleValue = Reflect.get(st, updatedFieldName);
        if (ruleValue == null) return base;
        return { ...base, [updatedFieldName]: ruleValue };
      });
    }
  }

  return newTransaction;
}
