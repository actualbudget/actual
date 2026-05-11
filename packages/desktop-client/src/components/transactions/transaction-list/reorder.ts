import { isPreviewId } from '@actual-app/core/shared/transactions';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { isValidBoundaryDrop } from '#hooks/useDragDrop';
import type { DropPosition } from '#hooks/useDragDrop';

type ReorderArgs = {
  allTransactions: TransactionEntity[];
  id: string;
  dropPos: DropPosition;
  targetId: string;
  sortField: string;
  ascDesc: 'asc' | 'desc';
  isFiltered?: boolean;
};

type ReorderMove =
  | {
      accountId: TransactionEntity['account'];
      id: string;
      targetId: string | null;
    }
  | undefined;

export function getTransactionMovePayload({
  allTransactions,
  id,
  dropPos,
  targetId,
  sortField,
  ascDesc,
  isFiltered,
}: ReorderArgs): ReorderMove {
  if ((sortField && sortField !== 'date') || isFiltered || id === targetId) {
    return;
  }

  const draggedTransaction = allTransactions.find(
    transaction => transaction.id === id,
  );
  if (!draggedTransaction) {
    return;
  }

  if (draggedTransaction.is_child && draggedTransaction.parent_id) {
    const siblings = allTransactions.filter(
      transaction =>
        transaction.parent_id === draggedTransaction.parent_id &&
        !isPreviewId(transaction.id),
    );

    const targetIndex = siblings.findIndex(
      transaction => transaction.id === targetId,
    );
    if (targetIndex === -1) {
      return;
    }

    let siblingTargetId: string | null;
    if (dropPos === 'after') {
      siblingTargetId = targetId;
    } else {
      const aboveIndex = targetIndex - 1;
      siblingTargetId = aboveIndex >= 0 ? siblings[aboveIndex].id : null;
    }

    return {
      id,
      accountId: draggedTransaction.account,
      targetId: siblingTargetId,
    };
  }

  const reorderableTransactions = allTransactions.filter(
    transaction => !transaction.is_child && !isPreviewId(transaction.id),
  );

  const transactionIndex = reorderableTransactions.findIndex(
    transaction => transaction.id === id,
  );
  const targetIndex = reorderableTransactions.findIndex(
    transaction => transaction.id === targetId,
  );

  if (transactionIndex === -1 || targetIndex === -1) {
    return;
  }

  const transaction = reorderableTransactions[transactionIndex];
  const targetTransaction = reorderableTransactions[targetIndex];
  const isAscending = sortField === 'date' && ascDesc === 'asc';

  let isValidDrop = targetTransaction.date === transaction.date;
  if (!isValidDrop) {
    const neighborIndex =
      dropPos === 'before' ? targetIndex - 1 : targetIndex + 1;
    const neighborTransaction =
      neighborIndex >= 0 && neighborIndex < reorderableTransactions.length
        ? reorderableTransactions[neighborIndex]
        : null;

    isValidDrop = isValidBoundaryDrop(
      dropPos,
      targetTransaction.date,
      transaction.date,
      neighborTransaction?.date ?? null,
      isAscending,
    );
  }

  if (!isValidDrop) {
    return;
  }

  let moveTargetId: string | null;
  if (dropPos === 'after') {
    if (targetTransaction.is_parent) {
      return;
    }

    moveTargetId =
      targetTransaction.date === transaction.date ? targetId : null;
  } else {
    const aboveIndex = targetIndex - 1;
    const aboveTransaction =
      aboveIndex >= 0 ? reorderableTransactions[aboveIndex] : null;

    moveTargetId =
      aboveTransaction && aboveTransaction.date === transaction.date
        ? aboveTransaction.id
        : null;
  }

  return {
    id,
    accountId: transaction.account,
    targetId: moveTargetId,
  };
}
