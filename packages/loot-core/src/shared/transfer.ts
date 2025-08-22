import type { TransactionEntity } from '../types/models';

export function validForTransfer(
  fromTransaction: TransactionEntity,
  toTransaction: TransactionEntity,
) {
  if (
    // not already a transfer
    [fromTransaction, toTransaction].every(tran => tran.transfer_id == null) &&
    fromTransaction.account !== toTransaction.account && // belong to different accounts
    fromTransaction.amount + toTransaction.amount === 0 // amount must zero each other out
  ) {
    return true;
  }
  return false;
}
