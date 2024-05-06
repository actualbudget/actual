import { v4 as uuidv4 } from 'uuid';

import {
  type TransactionEntity,
  type NewTransactionEntity,
} from '../types/models';

import { last, diffItems, applyChanges } from './util';

interface TransactionEntityWithError extends TransactionEntity {
  error: ReturnType<typeof SplitTransactionError> | null;
  _deleted?: boolean;
}

export function isTemporaryId(id: string) {
  return id.indexOf('temp') !== -1;
}

export function isPreviewId(id: string) {
  return id.indexOf('preview/') !== -1;
}

// The amount might be null when adding a new transaction
function num(n: number | null | undefined) {
  return typeof n === 'number' ? n : 0;
}

function SplitTransactionError(total: number, parent: TransactionEntity) {
  const difference = num(parent.amount) - total;

  return {
    type: 'SplitTransactionError',
    version: 1,
    difference,
  };
}

type GenericTransactionEntity =
  | NewTransactionEntity
  | TransactionEntity
  | TransactionEntityWithError;

export function makeChild<T extends GenericTransactionEntity>(
  parent: T,
  data: object,
) {
  const prefix = parent.id === 'temp' ? 'temp' : '';

  return {
    amount: 0,
    ...data,
    category: 'category' in data ? data.category : parent.category,
    payee: 'payee' in data ? data.payee : parent.payee,
    id: 'id' in data ? data.id : prefix + uuidv4(),
    account: parent.account,
    date: parent.date,
    cleared: parent.cleared != null ? parent.cleared : null,
    reconciled: 'reconciled' in data ? data.reconciled : parent.reconciled,
    starting_balance_flag:
      parent.starting_balance_flag != null
        ? parent.starting_balance_flag
        : null,
    is_child: true,
    parent_id: parent.id,
    error: null,
  } as unknown as T;
}

export function recalculateSplit(trans: TransactionEntity) {
  // Calculate the new total of split transactions and make sure
  // that it equals the parent amount
  const total = (trans.subtransactions || []).reduce(
    (acc, t) => acc + num(t.amount),
    0,
  );
  return {
    ...trans,
    error:
      total === num(trans.amount) ? null : SplitTransactionError(total, trans),
  } as TransactionEntityWithError;
}

function findParentIndex(transactions: TransactionEntity[], idx: number) {
  // This relies on transactions being sorted in a way where parents
  // are always before children, which is enforced in the db layer.
  // Walk backwards and find the last parent;
  while (idx >= 0) {
    const trans = transactions[idx];
    if (trans.is_parent) {
      return idx;
    }
    idx--;
  }
  return null;
}

function getSplit(transactions: TransactionEntity[], parentIndex: number) {
  const split = [transactions[parentIndex]];
  let curr = parentIndex + 1;
  while (curr < transactions.length && transactions[curr].is_child) {
    split.push(transactions[curr]);
    curr++;
  }
  return split;
}

export function ungroupTransactions(transactions: TransactionEntity[]) {
  return transactions.reduce<TransactionEntity[]>((list, parent) => {
    const { subtransactions, ...trans } = parent;
    const _subtransactions = subtransactions || [];

    list.push(trans);

    for (let i = 0; i < _subtransactions.length; i++) {
      list.push(_subtransactions[i]);
    }
    return list;
  }, []);
}

export function groupTransaction(split: TransactionEntity[]) {
  return { ...split[0], subtransactions: split.slice(1) } as TransactionEntity;
}

export function ungroupTransaction(split: TransactionEntity | null) {
  if (split == null) {
    return null;
  }
  return ungroupTransactions([split]);
}

export function applyTransactionDiff(
  groupedTrans: Parameters<typeof ungroupTransaction>[0],
  diff: Parameters<typeof applyChanges>[0],
) {
  return groupTransaction(
    applyChanges(
      diff,
      ungroupTransaction(groupedTrans) || [],
    ) as TransactionEntity[],
  );
}

function replaceTransactions(
  transactions: TransactionEntity[],
  id: string,
  func: (
    transaction: TransactionEntity,
  ) => TransactionEntity | TransactionEntityWithError | null,
) {
  const idx = transactions.findIndex(t => t.id === id);
  const trans = transactions[idx];
  const transactionsCopy = [...transactions];

  if (idx === -1) {
    throw new Error('Tried to edit unknown transaction id: ' + id);
  }

  if (trans.is_parent || trans.is_child) {
    const parentIndex = findParentIndex(transactions, idx);
    if (parentIndex == null) {
      console.log('Cannot find parent index');
      return { data: [], diff: { deleted: [], updated: [] } };
    }

    const split = getSplit(transactions, parentIndex);
    let grouped = func(groupTransaction(split));
    const newSplit = ungroupTransaction(grouped);

    let diff;
    if (newSplit == null) {
      // If everything was deleted, just delete the parent which will
      // delete everything
      diff = { deleted: [{ id: split[0].id }], updated: [] };
      grouped = { ...split[0], _deleted: true };
      transactionsCopy.splice(parentIndex, split.length);
    } else {
      diff = diffItems(split, newSplit);
      transactionsCopy.splice(parentIndex, split.length, ...newSplit);
    }

    return { data: transactionsCopy, newTransaction: grouped, diff };
  } else {
    const grouped = func(trans);
    const newTrans = ungroupTransaction(grouped) || [];
    if (grouped) {
      grouped.subtransactions = grouped.subtransactions || [];
    }
    transactionsCopy.splice(idx, 1, ...newTrans);

    return {
      data: transactionsCopy,
      newTransaction: grouped || {
        ...trans,
        _deleted: true,
      },
      diff: diffItems([trans], newTrans),
    };
  }
}

export function addSplitTransaction(
  transactions: TransactionEntity[],
  id: string,
) {
  return replaceTransactions(transactions, id, trans => {
    if (!trans.is_parent) {
      return trans;
    }
    const prevSub = last(trans.subtransactions || []);
    trans.subtransactions?.push(
      makeChild(trans, {
        amount: 0,
        sort_order: num(prevSub && prevSub.sort_order) - 1,
      }),
    );
    return trans;
  });
}

export function updateTransaction(
  transactions: TransactionEntity[],
  transaction: TransactionEntity,
) {
  return replaceTransactions(transactions, transaction.id, trans => {
    if (trans.is_parent) {
      const parent = trans.id === transaction.id ? transaction : trans;
      const sub = trans.subtransactions?.map(t => {
        // Make sure to update the children to reflect the updated
        // properties (if the parent updated)

        let child = t;
        if (trans.id === transaction.id) {
          child = {
            ...t,
            payee: t.payee === trans.payee ? transaction.payee : t.payee,
          };
        } else if (t.id === transaction.id) {
          child = transaction;
        }

        return makeChild(parent, child);
      });

      return recalculateSplit({ ...parent, subtransactions: sub });
    } else {
      return transaction;
    }
  });
}

export function deleteTransaction(
  transactions: TransactionEntity[],
  id: string,
) {
  return replaceTransactions(transactions, id, trans => {
    if (trans.is_parent) {
      if (trans.id === id) {
        return null;
      } else if (trans.subtransactions?.length === 1) {
        return {
          ...trans,
          subtransactions: undefined,
          is_parent: false,
          error: null,
        } as TransactionEntityWithError;
      } else {
        const sub = trans.subtransactions?.filter(t => t.id !== id);
        return recalculateSplit({ ...trans, subtransactions: sub });
      }
    } else {
      return null;
    }
  });
}

export function splitTransaction(
  transactions: TransactionEntity[],
  id: string,
) {
  return replaceTransactions(transactions, id, trans => {
    if (trans.is_parent || trans.is_child) {
      return trans;
    }

    return {
      ...trans,
      is_parent: true,
      error: num(trans.amount) === 0 ? null : SplitTransactionError(0, trans),
      subtransactions: [makeChild(trans, { amount: 0, sort_order: -1 })],
    } as TransactionEntityWithError;
  });
}

export function realizeTempTransactions(transactions: TransactionEntity[]) {
  const parent = { ...transactions.find(t => !t.is_child), id: uuidv4() };
  const children = transactions.filter(t => t.is_child);
  return [
    parent,
    ...children.map(child => ({
      ...child,
      id: uuidv4(),
      parent_id: parent.id,
    })),
  ];
}
