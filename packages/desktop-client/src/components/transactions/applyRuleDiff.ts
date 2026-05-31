import type { TransactionEntity } from '@actual-app/core/types/models';

const transactionFields = [
  'id',
  'is_parent',
  'is_child',
  'parent_id',
  'account',
  'category',
  'amount',
  'payee',
  'notes',
  'date',
  'imported_id',
  'imported_payee',
  'starting_balance_flag',
  'transfer_id',
  'sort_order',
  'cleared',
  'reconciled',
  'tombstone',
  'forceUpcoming',
  'schedule',
  'subtransactions',
  '_unmatched',
  '_deleted',
  'error',
  'raw_synced_data',
  '_ruleErrors',
] as const satisfies ReadonlyArray<keyof TransactionEntity>;

function isEmptyRuleTarget(value: unknown) {
  return value == null || value === '' || value === 0 || value === false;
}

function isNotesMerge(currentValue: unknown, nextValue: unknown) {
  if (
    typeof currentValue !== 'string' ||
    currentValue === '' ||
    typeof nextValue !== 'string' ||
    nextValue === currentValue
  ) {
    return false;
  }

  if (nextValue.startsWith(currentValue)) {
    return hasMergeBoundary(nextValue.slice(currentValue.length), 'start');
  }

  if (nextValue.endsWith(currentValue)) {
    return hasMergeBoundary(
      nextValue.slice(0, nextValue.length - currentValue.length),
      'end',
    );
  }

  return false;
}

function hasMergeBoundary(value: string, edge: 'start' | 'end') {
  if (value === '') {
    return false;
  }

  const boundary = edge === 'start' ? value[0] : value[value.length - 1];
  return !/[A-Za-z0-9]/.test(boundary);
}

export function shouldApplyRuleDiff(
  transaction: TransactionEntity,
  field: keyof TransactionEntity,
  nextValue: unknown,
  updatedFieldName?: keyof TransactionEntity | string | null,
) {
  const currentValue = transaction[field];

  return (
    updatedFieldName === 'payee' ||
    isEmptyRuleTarget(currentValue) ||
    (field === 'notes' && isNotesMerge(currentValue, nextValue))
  );
}

export function applyRuleDiffToTransaction(
  transaction: TransactionEntity,
  diff: Partial<TransactionEntity>,
  updatedFieldName?: keyof TransactionEntity | string | null,
) {
  const newTransaction = { ...transaction };

  transactionFields.forEach(field => {
    if (!(field in diff)) {
      return;
    }

    const nextValue = diff[field];
    if (shouldApplyRuleDiff(transaction, field, nextValue, updatedFieldName)) {
      (newTransaction as Record<string, unknown>)[field] = nextValue;
    }
  });

  return newTransaction;
}
