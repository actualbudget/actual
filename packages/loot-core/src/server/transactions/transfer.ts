// @ts-strict-ignore
import * as db from '#server/db';
import { getEffectiveCurrency } from '#shared/fx/currency';
import {
  convertBetweenCurrencies,
  getSqlDefaultCurrencyCode,
  isSqlConversionEnabled,
} from '#shared/fx/sql';
import { MAX_SAFE_NUMBER } from '#shared/util';
import type { IntegerAmount } from '#shared/util';
import type { TransactionEntity } from '#types/models';

import { runRules } from './transaction-rules';

// Amounts the user entered for the other side of transfers between
// accounts in different currencies, keyed by the id of the side they edited
export type TransferAmounts = Record<string, IntegerAmount>;

// What the transfers of one batch of changes share
export type TransferBatch = {
  // The amount entered for the other side of a transaction's transfer
  getEnteredAmount: (id: string) => IntegerAmount | undefined;
  // Transactions updated in the same batch, by id
  updatedById: ReadonlyMap<string, TransactionEntity>;
  // The currency of an account; all of them are read once per batch, and
  // only when a transfer needs one
  getCurrency: (accountId: string) => Promise<string>;
};

export function createTransferBatch({
  transferAmounts,
  updated = [],
}: {
  transferAmounts?: TransferAmounts;
  updated?: readonly TransactionEntity[];
} = {}): TransferBatch {
  let currencies: Promise<Map<string, string | null>> | undefined;
  return {
    getEnteredAmount: id => {
      // Sent by the client, so anything but a whole amount that is safe to
      // add up is ignored
      const amount: unknown = transferAmounts?.[id];
      return typeof amount === 'number' &&
        Number.isSafeInteger(amount) &&
        Math.abs(amount) <= MAX_SAFE_NUMBER
        ? amount
        : undefined;
    },
    updatedById: new Map(
      updated.map(transaction => [transaction.id, transaction]),
    ),
    getCurrency: async accountId => {
      currencies ??= db
        .all<Pick<db.DbAccount, 'id' | 'currency'>>(
          'SELECT id, currency FROM accounts',
        )
        .then(rows => new Map(rows.map(row => [row.id, row.currency])));
      return getEffectiveCurrency(
        (await currencies).get(accountId),
        getSqlDefaultCurrencyCode(),
      );
    },
  };
}

type TransferCurrencies = { from: string; to: string };

// The currencies of both sides of a transfer, or null when they are the
// same or multiple currencies are off: the other side then mirrors the
// amount. Each side of a transfer between currencies keeps what actually
// left or arrived in its own account, so its amount is never mirrored.
async function getTransferCurrencies(
  fromAccount: string,
  toAccount: string,
  batch: TransferBatch,
): Promise<TransferCurrencies | null> {
  if (!isSqlConversionEnabled()) {
    return null;
  }
  const from = await batch.getCurrency(fromAccount);
  const to = await batch.getCurrency(toAccount);
  return from && to && from !== to ? { from, to } : null;
}

// The amount of the other side: the opposite amount within one currency.
// Between currencies it is the amount the user entered, or else the
// amount converted with the rate of the transaction's date.
function getCounterpartAmount(
  transaction,
  currencies: TransferCurrencies | null,
  enteredAmount: IntegerAmount | undefined,
): IntegerAmount {
  if (!currencies) {
    return -transaction.amount;
  }
  if (enteredAmount != null) {
    const magnitude = Math.abs(enteredAmount);
    return transaction.amount > 0 ? -magnitude : magnitude;
  }
  return convertBetweenCurrencies(
    -transaction.amount,
    currencies.from,
    currencies.to,
    transaction.date,
  );
}

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

async function clearCategory(transaction, transferAcct) {
  const { offbudget: fromOffBudget } = await db.first<
    Pick<db.DbAccount, 'offbudget'>
  >('SELECT offbudget FROM accounts WHERE id = ?', [transaction.account]);
  const { offbudget: toOffBudget } = await db.first<
    Pick<db.DbAccount, 'offbudget'>
  >('SELECT offbudget FROM accounts WHERE id = ?', [transferAcct]);

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

export async function addTransfer(
  transaction,
  transferredAccount,
  batch = createTransferBatch(),
) {
  if (transaction.is_parent) {
    // For split transactions, we should create transfers using child transactions.
    // This is to ensure that the amounts received by the transferred account
    // reflects the amounts in the child transactions and not the parent transaction
    // amount which is the total amount.
    return null;
  }

  const { id: fromPayee } = await db.first<Pick<db.DbPayee, 'id'>>(
    'SELECT id FROM payees WHERE transfer_acct = ?',
    [transaction.account],
  );

  const currencies = await getTransferCurrencies(
    transaction.account,
    transferredAccount,
    batch,
  );
  const transferTransaction = {
    account: transferredAccount,
    amount: getCounterpartAmount(
      transaction,
      currencies,
      batch.getEnteredAmount(transaction.id),
    ),
    payee: fromPayee,
    date: transaction.date,
    transfer_id: transaction.id,
    notes: transaction.notes || null,
    schedule: transaction.schedule,
    cleared: false,
  };
  const { notes, cleared, schedule } = await runRules(transferTransaction);
  const matchedSchedule = schedule ?? transaction.schedule;

  const id = await db.insertTransaction({
    ...transferTransaction,
    notes,
    cleared,
    schedule: matchedSchedule,
  });

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

// Between currencies the other side keeps its own amount, only following
// a change of sign: what arrived doesn't change when the side that left is
// edited or moved, nor when the transfer goes to another account in the
// same currency. Unless the user entered it, it is converted again when
// the transfer now goes to another currency, or when it never had an
// amount.
async function getUpdatedCounterpartAmount(
  transaction,
  transferredAccount,
  batch: TransferBatch,
): Promise<IntegerAmount> {
  const currencies = await getTransferCurrencies(
    transaction.account,
    transferredAccount,
    batch,
  );
  const enteredAmount = batch.getEnteredAmount(transaction.id);
  if (!currencies || enteredAmount != null) {
    return getCounterpartAmount(transaction, currencies, enteredAmount);
  }

  const counterpart = await db.first<Pick<db.DbTransaction, 'acct' | 'amount'>>(
    'SELECT acct, amount FROM transactions WHERE id = ?',
    [transaction.transfer_id],
  );
  if (
    !counterpart ||
    (await batch.getCurrency(counterpart.acct)) !== currencies.to ||
    (counterpart.amount === 0 && transaction.amount !== 0)
  ) {
    return getCounterpartAmount(transaction, currencies, undefined);
  }
  // Zeroing this side leaves the other one alone, so the amount is still
  // there when this side gets one again
  if (transaction.amount === 0) {
    return counterpart.amount;
  }
  const magnitude = Math.abs(counterpart.amount);
  return transaction.amount > 0 ? -magnitude : magnitude;
}

export async function updateTransfer(
  transaction,
  transferredAccount,
  batch = createTransferBatch(),
) {
  const payee = await getPayee(transaction.account);

  // When both sides are updated in the same batch, each keeps its own
  // changes: both run at once, each reading the other before it is
  // written, so mirroring them could e.g. give both sides the same sign
  const batchCounterpart = batch.updatedById.get(transaction.transfer_id);
  const isUpdatedInBatch =
    batchCounterpart?.account === transferredAccount &&
    batchCounterpart.payee === payee.id;

  if (!isUpdatedInBatch) {
    const amount = await getUpdatedCounterpartAmount(
      transaction,
      transferredAccount,
      batch,
    );

    await db.updateTransaction({
      id: transaction.transfer_id,
      account: transferredAccount,
      // Make sure to update the payee on the other side in case the
      // user moved this transaction into another account
      payee: payee.id,
      notes: transaction.notes,
      amount,
      schedule: transaction.schedule,
    });
  }

  const categoryCleared = await clearCategory(transaction, transferredAccount);
  if (categoryCleared) {
    return { id: transaction.id, category: null };
  }
}

export async function onInsert(transaction, batch = createTransferBatch()) {
  const transferredAccount = await getTransferredAccount(transaction);

  if (transferredAccount) {
    return addTransfer(transaction, transferredAccount, batch);
  }
}

export async function onDelete(transaction) {
  if (transaction.transfer_id) {
    await removeTransfer(transaction);
  }
}

export async function onUpdate(transaction, batch = createTransferBatch()) {
  const transferredAccount = await getTransferredAccount(transaction);

  if (transaction.is_parent) {
    return removeTransfer(transaction);
  }

  if (transferredAccount && !transaction.transfer_id) {
    return addTransfer(transaction, transferredAccount, batch);
  }

  if (!transferredAccount && transaction.transfer_id) {
    return removeTransfer(transaction);
  }

  if (transferredAccount && transaction.transfer_id) {
    return updateTransfer(transaction, transferredAccount, batch);
  }
}
