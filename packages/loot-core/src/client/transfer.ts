import type { TransactionEntity } from '../types/models';

export function validForTransfer(
  fromTransaction: TransactionEntity,
  toTransaction: TransactionEntity,
) {
  const isSubtransaction = [fromTransaction, toTransaction].every(
    tran => tran.is_child === true,
  );
  if (isSubtransaction) {
    return false;
  }

  // Count of transactions that are transfers
  const transferCount =
    +(fromTransaction.transfer_id != null) +
    +(toTransaction.transfer_id != null);
  const differentAccount = fromTransaction.account !== toTransaction.account;

  if (differentAccount) {
    // Linking 2 normal transactions into transfer
    const addsToZero = fromTransaction.amount + toTransaction.amount === 0;
    return transferCount === 0 && addsToZero;
  } else {
    // Merging existing transaction with transfer
    const sameAmount = fromTransaction.amount === toTransaction.amount;
    return transferCount === 1 && sameAmount;
  }
}
