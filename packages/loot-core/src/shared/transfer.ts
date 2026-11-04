import type { TransactionEntity } from '#types/models';

export function validForTransfer(
  fromTransaction: TransactionEntity,
  toTransaction: TransactionEntity,
  // Between accounts in different currencies each side keeps its own
  // amount, so only the signs must be opposite
  { isCrossCurrency = false }: { isCrossCurrency?: boolean } = {},
) {
  if (
    // not already a transfer
    [fromTransaction, toTransaction].every(tran => tran.transfer_id == null) &&
    fromTransaction.account !== toTransaction.account && // belong to different accounts
    (isCrossCurrency
      ? fromTransaction.amount !== 0 &&
        Math.sign(fromTransaction.amount) === -Math.sign(toTransaction.amount)
      : fromTransaction.amount + toTransaction.amount === 0) // amount must zero each other out
  ) {
    return true;
  }
  return false;
}
