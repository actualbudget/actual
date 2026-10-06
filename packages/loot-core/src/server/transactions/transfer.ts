// @ts-strict-ignore
import { v4 as uuidv4 } from 'uuid';

import * as db from '#server/db';
import { findBatchedRow } from '#server/sync';
import type { TransactionEntity } from '#types/models';

import {
  isExchangeRow,
  isForeignAccount,
  preflightTransactionWrites,
  queuedAccount,
} from './foreign-guard';
import { runRules } from './transaction-rules';

async function getPayee(acct) {
  return db.first<db.DbPayee>('SELECT * FROM payees WHERE transfer_acct = ?', [
    acct,
  ]);
}

async function getTransferredAccount(transaction) {
  if (transaction.payee) {
    const result = await db.first<Pick<db.DbViewPayee, 'transfer_acct'>>(
      'SELECT transfer_acct FROM v_payees WHERE id = ?',
      [transaction.payee],
    );

    return result?.transfer_acct || null;
  }
  return null;
}

/** An account's offbudget flag, including an account queued in a batch. */
async function offBudgetOf(id: string) {
  const stored = await db.first<Pick<db.DbAccount, 'offbudget'>>(
    'SELECT offbudget FROM accounts WHERE id = ?',
    [id],
  );
  return (stored ?? queuedAccount(id))?.offbudget ?? 0;
}

/** An account's transfer payee, including one queued in a batch. */
async function transferPayeeId(account: string) {
  const stored = await db.first<Pick<db.DbPayee, 'id'>>(
    'SELECT id FROM payees WHERE transfer_acct = ?',
    [account],
  );
  return stored?.id ?? findBatchedRow('payees', 'transfer_acct', account);
}

async function clearCategory(transaction, transferAcct) {
  const fromOffBudget = await offBudgetOf(transaction.account);
  const toOffBudget = await offBudgetOf(transferAcct);

  // If the transfer is between two on budget or two off budget accounts,
  // we should clear the category, because the category is not relevant
  if (fromOffBudget === toOffBudget) {
    await db.updateTransaction({ id: transaction.id, category: null });
    if (transaction.transfer_id) {
      await db.updateTransaction({
        id: transaction.transfer_id,
        category: null,
      });
    }
    return true;
  }
  return false;
}

/**
 * The counterpart leg a transfer gets, with the results of rules run on it,
 * not yet written. Rules may name payees through `stagePayee`.
 */
export async function transferCounterpart(
  transaction,
  transferredAccount,
  stagePayee?: (name: string) => Promise<string>,
) {
  const fromPayee = await transferPayeeId(transaction.account);

  const transferTransaction = {
    account: transferredAccount,
    amount: -transaction.amount,
    // A same-encoding foreign transfer keeps native amounts on both legs.
    ...(transaction.transaction_amount != null && {
      transaction_amount: -transaction.transaction_amount,
    }),
    payee: fromPayee,
    date: transaction.date,
    transfer_id: transaction.id,
    notes: transaction.notes || null,
    schedule: transaction.schedule,
    cleared: false,
  };
  const { notes, cleared, schedule } = await runRules(
    transferTransaction,
    undefined,
    undefined,
    stagePayee,
  );
  const matchedSchedule = schedule ?? transaction.schedule;
  return {
    row: { ...transferTransaction, notes, cleared, schedule: matchedSchedule },
    schedule: matchedSchedule,
  };
}

/**
 * Validates the transfers a batch will create in foreign accounts, with the
 * counterparts their hooks will write, before anything is written: a failed
 * counterpart must not leave its source behind. Scheduled transfers in other
 * currencies arrive with MC-4.3.
 */
export async function preflightNewForeignTransfers(
  added: Array<Partial<TransactionEntity>>,
  updated: Array<Partial<TransactionEntity>>,
) {
  const sources: Array<Partial<TransactionEntity>> = [];
  const updates: Array<Partial<TransactionEntity>> = [];
  const counterparts: Array<Partial<TransactionEntity>> = [];
  const consider = async (
    transaction: Partial<TransactionEntity>,
    patch?: Partial<TransactionEntity>,
  ) => {
    if (transaction.is_parent || transaction.transfer_id) return;
    const target = await getTransferredAccount(transaction);
    if (!target || target === transaction.account) return;
    if (
      !(await isForeignAccount(transaction.account)) &&
      !(await isForeignAccount(target))
    ) {
      return;
    }
    const built = await transferCounterpart(transaction, target, async () =>
      uuidv4(),
    );
    if (transaction.schedule || built.schedule) {
      throw new Error('multicurrency-transfer-unavailable');
    }
    const id = uuidv4();
    counterparts.push({ ...built.row, id });
    if (patch) {
      updates.push({ ...patch, transfer_id: id });
    } else {
      sources.push({ ...transaction, transfer_id: id });
    }
  };
  // Updates to rows added in the same batch apply before their hooks run, so
  // those rows are judged in their final state.
  const addedIds = new Set(added.map(row => row.id));
  const finalAdded = added.map(row =>
    updated
      .filter(patch => patch.id === row.id)
      .reduce((merged, patch) => ({ ...merged, ...patch }), row),
  );
  for (const transaction of finalAdded) {
    await consider(transaction);
  }
  for (const patch of updated) {
    if (patch.payee === undefined || !patch.id || addedIds.has(patch.id)) {
      continue;
    }
    const stored = await db.getTransaction(patch.id);
    // An update of a row that is not stored inserts it.
    await (stored ? consider({ ...stored, ...patch }, patch) : consider(patch));
  }
  if (counterparts.length > 0) {
    await preflightTransactionWrites({
      added: [...sources, ...counterparts],
      updated: updates,
    });
  }
}

export async function addTransfer(transaction, transferredAccount) {
  if (transaction.is_parent) {
    // For split transactions, we should create transfers using child transactions.
    // This is to ensure that the amounts received by the transferred account
    // reflects the amounts in the child transactions and not the parent transaction
    // amount which is the total amount.
    return null;
  }

  const { row, schedule: matchedSchedule } = await transferCounterpart(
    transaction,
    transferredAccount,
  );

  const id = await db.insertTransaction(row);

  await db.updateTransaction({
    id: transaction.id,
    transfer_id: id,
    ...(matchedSchedule ? { schedule: matchedSchedule } : {}),
  });
  const categoryCleared = await clearCategory(transaction, transferredAccount);

  return {
    id: transaction.id,
    transfer_id: id,
    ...(categoryCleared ? { category: null } : {}),
  };
}

export async function removeTransfer(transaction) {
  const transferTrans = await db.getTransaction(transaction.transfer_id);

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
        payee: null,
      });
    } else {
      await db.deleteTransaction({ id: transaction.transfer_id });
    }
  }
  await db.updateTransaction({ id: transaction.id, transfer_id: null });
  return { id: transaction.id, transfer_id: null };
}

export async function updateTransfer(transaction, transferredAccount) {
  // An exchange's legs share one valuation and are frozen until MC-5; a
  // schedule belongs to one account's encoding. Only notes follow.
  if (await isExchangeRow(transaction.id)) {
    await db.updateTransaction({
      id: transaction.transfer_id,
      notes: transaction.notes,
    });
    return;
  }

  const payee = await getPayee(transaction.account);

  await db.updateTransaction({
    id: transaction.transfer_id,
    account: transferredAccount,
    // Make sure to update the payee on the other side in case the
    // user moved this transaction into another account
    payee: payee.id,
    notes: transaction.notes,
    amount: -transaction.amount,
    ...(transaction.transaction_amount != null && {
      transaction_amount: -transaction.transaction_amount,
    }),
    schedule: transaction.schedule,
  });

  const categoryCleared = await clearCategory(transaction, transferredAccount);
  if (categoryCleared) {
    return { id: transaction.id, category: null };
  }
}

export async function onInsert(transaction) {
  const transferredAccount = await getTransferredAccount(transaction);

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

  if (transaction.is_parent) {
    return removeTransfer(transaction);
  }

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
