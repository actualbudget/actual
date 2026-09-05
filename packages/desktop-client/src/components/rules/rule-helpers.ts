import type {
  NewRuleEntity,
  RuleActionEntity,
  RuleConditionEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

export function createCategoryRuleFromTransaction(
  transaction: TransactionEntity,
  options: { includeAmount?: boolean } = {},
): NewRuleEntity {
  const conditions: RuleConditionEntity[] = [];

  if (transaction.imported_payee) {
    conditions.push({
      field: 'imported_payee',
      op: 'is',
      value: transaction.imported_payee,
      type: 'string',
    });
  } else if (transaction.payee) {
    conditions.push({
      field: 'payee',
      op: 'is',
      value: transaction.payee,
      type: 'id',
    });
  }

  if (options.includeAmount && transaction.amount != null) {
    conditions.push({
      field: 'amount',
      op: 'isapprox',
      value: transaction.amount,
      type: 'number',
    });
  }

  const actions: RuleActionEntity[] = [];
  if (transaction.category) {
    actions.push({
      op: 'set',
      field: 'category',
      value: transaction.category,
      type: 'id',
    });
  }

  return {
    stage: null,
    conditionsOp: 'and',
    conditions:
      conditions.length > 0
        ? conditions
        : [{ field: 'payee', op: 'is', value: '', type: 'id' }],
    actions:
      actions.length > 0
        ? actions
        : [{ op: 'set', field: 'category', value: '', type: 'id' }],
  };
}
