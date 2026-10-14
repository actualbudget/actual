import type { AccountEntity, TransactionEntity } from '#types/models';

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

type TransferAccount = Pick<AccountEntity, 'id' | 'offbudget'>;

// The accounts query returns offbudget as a boolean. Account records store
// the same flag as 0 or 1, which is what the category check compares.
export function linkedTransferAccounts(
  rows: ReadonlyArray<{
    id: string;
    offbudget?: boolean | number | null;
  }>,
): TransferAccount[] {
  return rows.map(account => ({
    id: account.id,
    offbudget: account.offbudget ? 1 : 0,
  }));
}

// Linking two existing transactions into a transfer. Same-budget links have
// no category. A link between an on-budget and an off-budget account keeps
// the category on the on-budget side, which is how money entering or leaving
// the budget stays categorized. The off-budget side is always cleared.
export function categoryForLinkedTransfer(
  transaction: Pick<TransactionEntity, 'account' | 'category'>,
  other: Pick<TransactionEntity, 'account'>,
  accounts: ReadonlyArray<TransferAccount>,
): string | null {
  const own = accounts.find(account => account.id === transaction.account);
  const counterparty = accounts.find(account => account.id === other.account);
  if (!own || !counterparty) {
    return null;
  }

  const crossesBudget = own.offbudget !== counterparty.offbudget;
  if (crossesBudget && own.offbudget === 0) {
    return transaction.category ?? null;
  }

  return null;
}
