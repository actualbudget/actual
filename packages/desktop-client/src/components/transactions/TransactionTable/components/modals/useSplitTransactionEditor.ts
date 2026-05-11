import { useCallback, useMemo, useState } from 'react';

import type { TransactionEntity } from '@actual-app/core/types/models';
import { v4 as uuidv4 } from 'uuid';

export type SplitDraft = {
  id: string;
  category: string | null;
  amount: number;
  notes: string;
};

function createNewSplitDraft(): SplitDraft {
  return {
    id: `temp-${uuidv4()}`,
    category: null,
    amount: 0,
    notes: '',
  };
}

function createInitialSplits(childTransactions: TransactionEntity[]) {
  if (childTransactions.length > 0) {
    return childTransactions.map(child => ({
      id: child.id,
      category: child.category || null,
      amount: child.amount,
      notes: child.notes || '',
    }));
  }

  return [createNewSplitDraft(), createNewSplitDraft()];
}

export function buildSplitChildren(
  transaction: TransactionEntity,
  splits: SplitDraft[],
) {
  return splits.map(
    split =>
      ({
        id: split.id.startsWith('temp-') ? uuidv4() : split.id,
        account: transaction.account,
        date: transaction.date,
        amount: split.amount,
        category: split.category,
        notes: split.notes,
        is_child: true,
        parent_id: transaction.id,
        cleared: transaction.cleared,
      }) as TransactionEntity,
  );
}

export function useSplitTransactionEditor(
  transaction: TransactionEntity,
  childTransactions: TransactionEntity[],
) {
  const [splits, setSplits] = useState<SplitDraft[]>(() =>
    createInitialSplits(childTransactions),
  );

  const totalSplitAmount = useMemo(
    () => splits.reduce((sum, split) => sum + split.amount, 0),
    [splits],
  );

  const remainingAmount = useMemo(
    () => transaction.amount - totalSplitAmount,
    [transaction.amount, totalSplitAmount],
  );

  const percentageAllocated = useMemo(() => {
    if (transaction.amount === 0) {
      return 100;
    }

    return Math.abs((totalSplitAmount / transaction.amount) * 100);
  }, [totalSplitAmount, transaction.amount]);

  const isValid =
    remainingAmount === 0 && splits.every(split => split.category);

  const updateSplit = useCallback(
    (
      id: string,
      field: keyof SplitDraft,
      value: SplitDraft[keyof SplitDraft],
    ) => {
      setSplits(prev =>
        prev.map(split =>
          split.id === id ? { ...split, [field]: value } : split,
        ),
      );
    },
    [],
  );

  const addSplit = useCallback(() => {
    setSplits(prev => [...prev, createNewSplitDraft()]);
  }, []);

  const removeSplit = useCallback((id: string) => {
    setSplits(prev => prev.filter(split => split.id !== id));
  }, []);

  const distributeRemainder = useCallback(() => {
    if (remainingAmount === 0 || splits.length === 0) {
      return;
    }

    const amountPerSplit = Math.floor(remainingAmount / splits.length);
    const leftover = remainingAmount - amountPerSplit * splits.length;

    setSplits(prev =>
      prev.map((split, index) => ({
        ...split,
        amount: split.amount + amountPerSplit + (index === 0 ? leftover : 0),
      })),
    );
  }, [remainingAmount, splits.length]);

  return {
    splits,
    remainingAmount,
    percentageAllocated,
    isValid,
    addSplit,
    removeSplit,
    updateSplit,
    distributeRemainder,
  };
}
