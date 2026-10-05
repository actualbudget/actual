import type { TransactionEntity } from '#types/models';

export function validForTransfer(
  fromTransaction: TransactionEntity,
  toTransaction: TransactionEntity,
  crossCurrency = false,
) {
  if (
    fromTransaction.transfer_id != null ||
    toTransaction.transfer_id != null ||
    fromTransaction.account === toTransaction.account ||
    fromTransaction.amount !== -toTransaction.amount
  ) {
    return false;
  }
  if (crossCurrency) {
    return (
      [fromTransaction, toTransaction].every(
        row => !row.is_parent && !row.is_child,
      ) &&
      Math.sign(fromTransaction.transaction_amount ?? fromTransaction.amount) *
        Math.sign(toTransaction.transaction_amount ?? toTransaction.amount) ===
        -1
    );
  }
  return (
    (fromTransaction.transaction_amount ?? null) ===
    (toTransaction.transaction_amount == null
      ? null
      : -toTransaction.transaction_amount)
  );
}
