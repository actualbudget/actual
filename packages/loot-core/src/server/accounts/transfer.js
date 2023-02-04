import * as db from '../db';

async function getPayee(acct) {
  return db.first('SELECT * FROM payees WHERE transfer_acct = ?', [acct]);
}

async function getTransferredAccount(transaction) {
  if (transaction.payee) {
    let { transfer_acct } = await db.first(
      'SELECT id, transfer_acct FROM v_payees WHERE id = ?',
      [transaction.payee]
    );
    return transfer_acct;
  }
  return null;
}

async function clearCategory(transaction, transferAcct) {
  const { offbudget: fromOffBudget } = await db.first(
    'SELECT offbudget FROM accounts WHERE id = ?',
    [transaction.account]
  );
  const { offbudget: toOffBudget } = await db.first(
    'SELECT offbudget FROM accounts WHERE id = ?',
    [transferAcct]
  );

  // We should clear the category to make sure it's not being
  // accounted for in the budget, unless it should be in the case of
  // transferring from an on-budget to off-budget account
  if (fromOffBudget === toOffBudget) {
    await db.updateTransaction({ id: transaction.id, category: null });
    return true;
  }
  return false;
}

export async function addTransfer(transaction, transferredAccount) {
  let { id: fromPayee } = await db.first(
    'SELECT id FROM payees WHERE transfer_acct = ?',
    [transaction.account]
  );

  // We need to enforce certain constraints with child transaction transfers
  if (transaction.parent_id) {
    let row = await db.first(
      `
        SELECT p.id, p.transfer_acct FROM v_transactions t
        LEFT JOIN payees p ON p.id = t.payee
        WHERE t.id = ?
      `,
      [transaction.parent_id]
    );

    if (row.transfer_acct) {
      if (row.id !== transaction.payee) {
        // This child transaction is trying to use a transfer payee,
        // but the parent is already using a different transfer payee.
        // This is not allowed, so not only do we do nothing, we clear
        // the payee of the child transaction to make it clear
        await db.updateTransaction({ id: transaction.id, payee: null });
        return { id: transaction.id, payee: null };
      }

      // The parent has the same transfer payee, so it "owns" the
      // transfer logic
      return null;
    }
  }

  const id = await db.insertTransaction({
    account: transferredAccount,
    amount: -transaction.amount,
    payee: fromPayee,
    date: transaction.date,
    transfer_id: transaction.id,
    notes: transaction.notes || null,
    cleared: false
  });

  await db.updateTransaction({ id: transaction.id, transfer_id: id });
  const categoryCleared = await clearCategory(transaction, transferredAccount);

  return {
    id: transaction.id,
    transfer_id: id,
    ...(categoryCleared ? { category: null } : {})
  };
}

export async function removeTransfer(transaction) {
  let transferTrans = await db.getTransaction(transaction.transfer_id);

  // Perform operations on the transfer transaction only
  // if it is found. For example: when users delete both
  // (in & out) transfer transactions at the same time -
  // transfer transaction will not be found.
  if (transferTrans) {
    if (transferTrans.is_child) {
      // If it's a child transaction, we don't delete it because that
      // would invalidate the whole split transaction. Instead of turn
      // it into a normal transaction
      await db.updateTransaction({
        id: transaction.transfer_id,
        transfer_id: null,
        payee: null
      });
    } else {
      await db.deleteTransaction({ id: transaction.transfer_id });
    }
  }
  await db.updateTransaction({ id: transaction.id, transfer_id: null });
  return { id: transaction.id, transfer_id: null };
}

export async function updateTransfer(transaction, transferredAccount) {
  let payee = await getPayee(transaction.account);

  await db.updateTransaction({
    id: transaction.transfer_id,
    account: transferredAccount,
    // Make sure to update the payee on the other side in case the
    // user moved this transaction into another account
    payee: payee.id,
    date: transaction.date,
    notes: transaction.notes,
    amount: -transaction.amount
  });

  const categoryCleared = await clearCategory(transaction, transferredAccount);
  if (categoryCleared) {
    return { id: transaction.id, category: null };
  }
}

export async function onInsert(transaction) {
  let transferredAccount = await getTransferredAccount(transaction);

  if (transferredAccount) {
    return addTransfer(transaction, transferredAccount);
  }
}

export async function onDelete(transaction) {
  if (transaction.transfer_id) {
    await removeTransfer(transaction);
  }
}

export async function onUpdate(transaction) {
  const transferredAccount = await getTransferredAccount(transaction);

  if (transferredAccount && !transaction.transfer_id) {
    return addTransfer(transaction, transferredAccount);
  }

  if (!transferredAccount && transaction.transfer_id) {
    return removeTransfer(transaction);
  }

  if (transferredAccount && transaction.transfer_id) {
    return updateTransfer(transaction, transferredAccount);
  }
}
