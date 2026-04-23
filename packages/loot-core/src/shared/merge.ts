import type { TransactionEntity } from '../types/models';

export function validForMerge(
  transactionA: TransactionEntity,
  transactionB: TransactionEntity,
) {
  if (transactionA.account !== transactionB.account) return false;
  if (transactionA.amount !== transactionB.amount) return false;
  // if both transfers, they should both be transferring to the same account to be eligible for merge.
  // In other words, you cannot merge A->B with A->C, but you can merge A->B with A->B
  if (
    transactionA.transfer_id &&
    transactionB.transfer_id &&
    transactionA.payee !== transactionB.payee
  )
    return false;
  return true;
}
