import type { TransactionEntity } from '#types/models';

export function validForTransfer(
  fromTransaction: TransactionEntity,
  toTransaction: TransactionEntity,
) {
  if (
    // not already a transfer
    [fromTransaction, toTransaction].every(tran => tran.transfer_id == null) &&
    fromTransaction.account !== toTransaction.account && // belong to different accounts
    fromTransaction.amount + toTransaction.amount === 0 && // amount must zero each other out
    // Native amounts must cancel too when either row carries one.
    (fromTransaction.transaction_amount ?? null) ===
      (toTransaction.transaction_amount == null
        ? null
        : -toTransaction.transaction_amount)
  ) {
    return true;
  }
  return false;
}
