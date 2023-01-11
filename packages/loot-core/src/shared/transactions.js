import { last, diffItems, applyChanges } from './util';

const uuid = require('../platform/uuid');

export function isPreviewId(id) {
  return id.indexOf('preview/') !== -1;
}

// The amount might be null when adding a new transaction
function num(n) {
  return typeof n === 'number' ? n : 0;
}

function SplitTransactionError(total, parent) {
  let difference = num(parent.amount) - total;

  return {
    type: 'SplitTransactionError',
    version: 1,
    difference
  };
}

export function makeChild(parent, data) {
  let prefix = parent.id === 'temp' ? 'temp' : '';

  return {
    amount: 0,
    ...data,
    payee: data.payee || parent.payee,
    id: data.id ? data.id : prefix + uuid.v4Sync(),
    account: parent.account,
    date: parent.date,
    cleared: parent.cleared != null ? parent.cleared : null,
    starting_balance_flag:
      parent.starting_balance_flag != null
        ? parent.starting_balance_flag
        : null,
    is_child: true,
    parent_id: parent.id,
    error: null
  };
}

export function recalculateSplit(trans) {
  // Calculate the new total of split transactions and make sure
  // that it equals the parent amount
  const total = trans.subtransactions.reduce(
    (acc, t) => acc + num(t.amount),
    0
  );
  return {
    ...trans,
    error:
      total === num(trans.amount) ? null : SplitTransactionError(total, trans)
  };
}

export function findParentIndex(transactions, idx) {
  // This relies on transactions being sorted in a way where parents
  // are always before children, which is enforced in the db layer.
  // Walk backwards and find the last parent;
  while (idx >= 0) {
    let trans = transactions[idx];
    if (trans.is_parent) {
      return idx;
    }
    idx--;
  }
  return null;
}

export function getSplit(transactions, parentIndex) {
  let split = [transactions[parentIndex]];
  let curr = parentIndex + 1;
  while (curr < transactions.length && transactions[curr].is_child) {
    split.push(transactions[curr]);
    curr++;
  }
  return split;
}

export function ungroupTransactions(transactions) {
  let x = transactions.reduce((list, parent) => {
    let { subtransactions, ...trans } = parent;
    subtransactions = subtransactions || [];

    list.push(trans);

    for (let i = 0; i < subtransactions.length; i++) {
      list.push(subtransactions[i]);
    }
    return list;
  }, []);
  return x;
}

export function groupTransaction(split) {
  return { ...split[0], subtransactions: split.slice(1) };
}

export function ungroupTransaction(split) {
  if (split == null) {
    return null;
  }
  return ungroupTransactions([split]);
}

export function applyTransactionDiff(groupedTrans, diff) {
  return groupTransaction(applyChanges(diff, ungroupTransaction(groupedTrans)));
}

export function replaceTransactions(transactions, id, func) {
  let idx = transactions.findIndex(t => t.id === id);
  let trans = transactions[idx];
  let transactionsCopy = [...transactions];

  if (idx === -1) {
    throw new Error('Tried to edit unknown transaction id: ' + id);
  }

  if (trans.is_parent || trans.is_child) {
    let parentIndex = findParentIndex(transactions, idx);
    if (parentIndex == null) {
      console.log('Cannot find parent index');
      return { diff: { deleted: [], updated: [] } };
    }

    let split = getSplit(transactions, parentIndex);
    let grouped = func(groupTransaction(split));
    let newSplit = ungroupTransaction(grouped);

    let diff;
    if (newSplit == null) {
      // If everything was deleted, just delete the parent which will
      // delete everything
      diff = { deleted: [{ id: split[0].id }], updated: [] };
      grouped = { id: split[0].id, _deleted: true };
      transactionsCopy.splice(parentIndex, split.length);
    } else {
      diff = diffItems(split, newSplit);
      transactionsCopy.splice(parentIndex, split.length, ...newSplit);
    }

    return { data: transactionsCopy, newTransaction: grouped, diff };
  } else {
    let grouped = func(trans);
    let newTrans = ungroupTransaction(grouped) || [];
    if (grouped) {
      grouped.subtransactions = grouped.subtransactions || [];
    }
    transactionsCopy.splice(idx, 1, ...newTrans);

    return {
      data: transactionsCopy,
      newTransaction: grouped || { id: trans.id, _deleted: true },
      diff: diffItems([trans], newTrans)
    };
  }
}

export function addSplitTransaction(transactions, id) {
  return replaceTransactions(transactions, id, trans => {
    if (!trans.is_parent) {
      return trans;
    }
    let prevSub = last(trans.subtransactions);
    trans.subtransactions.push(
      makeChild(trans, {
        amount: 0,
        sort_order: num(prevSub && prevSub.sort_order) - 1
      })
    );
    return trans;
  });
}

export function updateTransaction(transactions, transaction) {
  return replaceTransactions(transactions, transaction.id, trans => {
    if (trans.is_parent) {
      let parent = trans.id === transaction.id ? transaction : trans;
      let sub = trans.subtransactions.map(t => {
        // Make sure to update the children to reflect the updated
        // properties (if the parent updated)

        let child = t;
        if (trans.id === transaction.id) {
          child = {
            ...t,
            payee: t.payee === trans.payee ? transaction.payee : t.payee
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

export function deleteTransaction(transactions, id) {
  return replaceTransactions(transactions, id, trans => {
    if (trans.is_parent) {
      if (trans.id === id) {
        return null;
      } else if (trans.subtransactions.length === 1) {
        return {
          ...trans,
          subtransactions: null,
          is_parent: false,
          error: null
        };
      } else {
        let sub = trans.subtransactions.filter(t => t.id !== id);
        return recalculateSplit({ ...trans, subtransactions: sub });
      }
    } else {
      return null;
    }
  });
}

export function splitTransaction(transactions, id) {
  return replaceTransactions(transactions, id, trans => {
    if (trans.is_parent || trans.is_child) {
      return trans;
    }

    return {
      ...trans,
      is_parent: true,
      error: num(trans.amount) === 0 ? null : SplitTransactionError(0, trans),
      subtransactions: [makeChild(trans, { amount: 0, sort_order: -1 })]
    };
  });
}

export function realizeTempTransactions(transactions) {
  let parent = transactions.find(t => !t.is_child);
  parent = { ...parent, id: uuid.v4Sync() };

  let children = transactions.filter(t => t.is_child);
  return [
    parent,
    ...children.map(child => ({
      ...child,
      id: uuid.v4Sync(),
      parent_id: parent.id
    }))
  ];
}
