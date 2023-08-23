import * as dateFns from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import * as asyncStorage from '../../platform/server/asyncStorage';
import * as monthUtils from '../../shared/months';
import {
  makeChild as makeChildTransaction,
  recalculateSplit,
} from '../../shared/transactions';
import { hasFieldsChanged, amountToInteger } from '../../shared/util';
import * as db from '../db';
import { runMutator } from '../mutators';
import { post } from '../post';
import { getServer } from '../server-config';
import { batchMessages } from '../sync';

import { getStartingBalancePayee } from './payees';
import title from './title';
import { runRules } from './transaction-rules';
import { batchUpdateTransactions } from './transactions';

// Plaid article about API options:
// https://support.plaid.com/customer/en/portal/articles/2612155-transactions-returned-per-request

function BankSyncError(type: string, code: string) {
  return { type: 'BankSyncError', category: type, code };
}

function makeSplitTransaction(trans, subtransactions) {
  // We need to calculate the final state of split transactions
  let { subtransactions: sub, ...parent } = recalculateSplit({
    ...trans,
    is_parent: true,
    subtransactions: subtransactions.map((transaction, idx) =>
      makeChildTransaction(trans, {
        ...transaction,
        sort_order: 0 - idx,
      }),
    ),
  });
  return [parent, ...sub];
}

function getAccountBalance(account) {
  // Debt account types need their balance reversed
  switch (account.type) {
    case 'credit':
    case 'loan':
      return -account.balances.current;
    default:
      return account.balances.current;
  }
}

async function updateAccountBalance(id, balance) {
  await db.runQuery('UPDATE accounts SET balance_current = ? WHERE id = ?', [
    amountToInteger(balance),
    id,
  ]);
}

export async function getAccounts(userId, userKey, id) {
  let res = await post(getServer().PLAID_SERVER + '/accounts', {
    userId,
    key: userKey,
    item_id: id,
  });

  let { accounts } = res;

  accounts.forEach(acct => {
    acct.balances.current = getAccountBalance(acct);
  });

  return accounts;
}

export async function getGoCardlessAccounts(userId, userKey, id) {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) return;

  let res = await post(
    getServer().GOCARDLESS_SERVER + '/accounts',
    {
      userId,
      key: userKey,
      item_id: id,
    },
    {
      'X-ACTUAL-TOKEN': userToken,
    },
  );

  let { accounts } = res;

  accounts.forEach(acct => {
    acct.balances.current = getAccountBalance(acct);
  });

  return accounts;
}

export function fromPlaid(trans) {
  return {
    imported_id: trans.transaction_id,
    payee_name: trans.name,
    imported_payee: trans.name,
    amount: -amountToInteger(trans.amount),
    date: trans.date,
  };
}

async function downloadTransactions(
  userId,
  userKey,
  acctId,
  bankId,
  since,
  count?: number,
) {
  let allTransactions = [];
  let accountBalance = null;
  let pageSize = 100;
  let offset = 0;
  let numDownloaded = 0;

  while (1) {
    const endDate = monthUtils.currentDay();

    const res = await post(getServer().PLAID_SERVER + '/transactions', {
      userId: userId,
      key: userKey,
      item_id: '' + bankId,
      account_id: acctId,
      start_date: since,
      end_date: endDate,
      count: pageSize,
      offset,
    });

    if (res.error_code) {
      throw BankSyncError(res.error_type, res.error_code);
    }

    if (res.transactions.length === 0) {
      break;
    }

    numDownloaded += res.transactions.length;

    // Remove pending transactions for now - we will handle them in
    // the future.
    allTransactions = allTransactions.concat(
      res.transactions.filter(t => !t.pending),
    );
    accountBalance = getAccountBalance(res.accounts[0]);

    if (
      numDownloaded === res.total_transactions ||
      (count != null && allTransactions.length >= count)
    ) {
      break;
    }

    offset += pageSize;
  }

  allTransactions =
    count != null ? allTransactions.slice(0, count) : allTransactions;

  return {
    transactions: allTransactions.map(fromPlaid),
    accountBalance,
  };
}

async function downloadGoCardlessTransactions(
  userId,
  userKey,
  acctId,
  bankId,
  since,
) {
  let userToken = await asyncStorage.getItem('user-token');
  if (!userToken) return;

  const res = await post(
    getServer().GOCARDLESS_SERVER + '/transactions',
    {
      userId: userId,
      key: userKey,
      requisitionId: bankId,
      accountId: acctId,
      startDate: since,
    },
    {
      'X-ACTUAL-TOKEN': userToken,
    },
  );

  if (res.error_code) {
    throw BankSyncError(res.error_type, res.error_code);
  }

  const {
    transactions: { all },
    balances,
    startingBalance,
  } = res;

  return {
    transactions: all,
    accountBalance: balances,
    startingBalance,
  };
}

async function resolvePayee(trans, payeeName, payeesToCreate) {
  if (trans.payee == null && payeeName) {
    // First check our registry of new payees (to avoid a db access)
    // then check the db for existing payees
    let payee = payeesToCreate.get(payeeName.toLowerCase());
    payee = payee || (await db.getPayeeByName(payeeName));

    if (payee != null) {
      return payee.id;
    } else {
      // Otherwise we're going to create a new one
      let newPayee = { id: uuidv4(), name: payeeName };
      payeesToCreate.set(payeeName.toLowerCase(), newPayee);
      return newPayee.id;
    }
  }

  return trans.payee;
}

async function normalizeTransactions(
  transactions,
  acctId,
  { rawPayeeName = false } = {},
) {
  let payeesToCreate = new Map();

  let normalized = [];
  for (let trans of transactions) {
    // Validate the date because we do some stuff with it. The db
    // layer does better validation, but this will give nicer errors
    if (trans.date == null) {
      throw new Error('`date` is required when adding a transaction');
    }

    // Strip off the irregular properties
    let { payee_name, subtransactions, ...rest } = trans;
    trans = rest;

    if (payee_name) {
      let trimmed = payee_name.trim();
      if (trimmed === '') {
        payee_name = null;
      } else {
        payee_name = rawPayeeName ? trimmed : title(trimmed);
      }
    }

    trans.imported_payee = trans.imported_payee || payee_name;
    if (trans.imported_payee) {
      trans.imported_payee = trans.imported_payee.trim();
    }

    // It's important to resolve both the account and payee early so
    // when rules are run, they have the right data. Resolving payees
    // also simplifies the payee creation process
    trans.account = acctId;
    trans.payee = await resolvePayee(trans, payee_name, payeesToCreate);

    normalized.push({
      payee_name,
      subtransactions: subtransactions
        ? subtransactions.map(t => ({ ...t, account: acctId }))
        : null,
      trans,
    });
  }

  return { normalized, payeesToCreate };
}

async function normalizeGoCardlessTransactions(transactions, acctId) {
  let payeesToCreate = new Map();

  let normalized = [];
  for (let trans of transactions) {
    if (!trans.amount) {
      trans.amount = trans.transactionAmount.amount;
    }

    // Validate the date because we do some stuff with it. The db
    // layer does better validation, but this will give nicer errors
    if (trans.date == null) {
      throw new Error('`date` is required when adding a transaction');
    }

    let payee_name;
    // When the amount is equal to 0, we need to determine
    // if this is a "Credited" or "Debited" transaction. This means
    // that it matters whether the amount is a positive or negative zero.
    if (trans.amount > 0 || Object.is(Number(trans.amount), 0)) {
      const nameParts = [];
      nameParts.push(
        title(
          trans.debtorName ||
            trans.remittanceInformationUnstructured ||
            (trans.remittanceInformationUnstructuredArray || []).join(', '),
        ),
      );
      if (trans.debtorAccount && trans.debtorAccount.iban) {
        nameParts.push(
          '(' +
            trans.debtorAccount.iban.slice(0, 4) +
            ' XXX ' +
            trans.debtorAccount.iban.slice(-4) +
            ')',
        );
      }
      payee_name = nameParts.join(' ');
    } else {
      const nameParts = [];
      nameParts.push(
        title(
          trans.creditorName ||
            trans.remittanceInformationUnstructured ||
            (trans.remittanceInformationUnstructuredArray || []).join(', '),
        ),
      );
      if (trans.creditorAccount && trans.creditorAccount.iban) {
        nameParts.push(
          '(' +
            trans.creditorAccount.iban.slice(0, 4) +
            ' XXX ' +
            trans.creditorAccount.iban.slice(-4) +
            ')',
        );
      }
      payee_name = nameParts.join(' ');
    }

    trans.imported_payee = trans.imported_payee || payee_name;
    if (trans.imported_payee) {
      trans.imported_payee = trans.imported_payee.trim();
    }

    // It's important to resolve both the account and payee early so
    // when rules are run, they have the right data. Resolving payees
    // also simplifies the payee creation process
    trans.account = acctId;
    trans.payee = await resolvePayee(trans, payee_name, payeesToCreate);

    trans.cleared = Boolean(trans.booked);

    normalized.push({
      payee_name,
      trans: {
        amount: amountToInteger(trans.amount),
        payee: trans.payee,
        account: trans.account,
        date: trans.date,
        notes:
          trans.remittanceInformationUnstructured ||
          (trans.remittanceInformationUnstructuredArray || []).join(', '),
        imported_id: trans.transactionId,
        imported_payee: trans.imported_payee,
        cleared: trans.cleared,
      },
    });
  }

  return { normalized, payeesToCreate };
}

async function createNewPayees(payeesToCreate, addsAndUpdates) {
  let usedPayeeIds = new Set(addsAndUpdates.map(t => t.payee));

  await batchMessages(async () => {
    for (let payee of payeesToCreate.values()) {
      // Only create the payee if it ended up being used
      if (usedPayeeIds.has(payee.id)) {
        await db.insertPayee(payee);
      }
    }
  });
}

export async function reconcileGoCardlessTransactions(acctId, transactions) {
  const hasMatched = new Set();
  const updated = [];
  const added = [];

  let { normalized, payeesToCreate } = await normalizeGoCardlessTransactions(
    transactions,
    acctId,
  );

  // The first pass runs the rules, and preps data for fuzzy matching
  let transactionsStep1 = [];
  for (let { payee_name, trans, subtransactions } of normalized) {
    // Run the rules
    trans = runRules(trans);

    let match = null;
    let fuzzyDataset = null;

    // First, match with an existing transaction's imported_id. This
    // is the highest fidelity match and should always be attempted
    // first.
    if (trans.imported_id) {
      match = await db.first(
        'SELECT * FROM v_transactions WHERE imported_id = ? AND account = ?',
        [trans.imported_id, acctId],
      );

      if (match) {
        hasMatched.add(match.id);
      }
    }

    // If it didn't match, query data needed for fuzzy matching
    if (!match) {
      // Look 1 day ahead and 4 days back when fuzzy matching. This
      // needs to select all fields that need to be read from the
      // matched transaction. See the final pass below for the needed
      // fields.
      fuzzyDataset = await db.all(
        `SELECT id, is_parent, date, imported_id, payee, category, notes FROM v_transactions
           WHERE date >= ? AND date <= ? AND amount = ? AND account = ? AND is_child = 0`,
        [
          db.toDateRepr(monthUtils.subDays(trans.date, 4)),
          db.toDateRepr(monthUtils.addDays(trans.date, 1)),
          trans.amount || 0,
          acctId,
        ],
      );
    }

    transactionsStep1.push({
      payee_name,
      trans,
      subtransactions,
      match,
      fuzzyDataset,
    });
  }

  // Next, do the fuzzy matching. This first pass matches based on the
  // payee id. We do this in multiple passes so that higher fidelity
  // matching always happens first, i.e. a transaction should match
  // match with low fidelity if a later transaction is going to match
  // the same one with high fidelity.
  let transactionsStep2 = transactionsStep1.map(data => {
    if (!data.match && data.fuzzyDataset) {
      // Try to find one where the payees match.
      let match = data.fuzzyDataset.find(
        row => !hasMatched.has(row.id) && data.trans.payee === row.payee,
      );

      if (match) {
        hasMatched.add(match.id);
        return { ...data, match };
      }
    }
    return data;
  });

  // The final fuzzy matching pass. This is the lowest fidelity
  // matching: it just find the first transaction that hasn't been
  // matched yet. Remember the the dataset only contains transactions
  // around the same date with the same amount.
  let transactionsStep3 = transactionsStep2.map(data => {
    if (!data.match && data.fuzzyDataset) {
      let match = data.fuzzyDataset.find(row => !hasMatched.has(row.id));
      if (match) {
        hasMatched.add(match.id);
        return { ...data, match };
      }
    }
    return data;
  });

  // Finally, generate & commit the changes
  for (let { trans, subtransactions, match } of transactionsStep3) {
    if (match) {
      // TODO: change the above sql query to use aql
      let existing = {
        ...match,
        cleared: match.cleared === 1,
        date: db.fromDateRepr(match.date),
      };

      // Update the transaction
      const updates = {
        imported_id: trans.imported_id || null,
        payee: existing.payee || trans.payee || null,
        category: existing.category || trans.category || null,
        imported_payee: trans.imported_payee || null,
        notes: existing.notes || trans.notes || null,
        cleared: trans.cleared != null ? trans.cleared : true,
      };

      if (hasFieldsChanged(existing, updates, Object.keys(updates))) {
        updated.push({ id: existing.id, ...updates });
      }

      if (existing.is_parent && existing.cleared !== updates.cleared) {
        const children = await db.all(
          'SELECT id FROM v_transactions WHERE parent_id = ?',
          [existing.id],
        );
        for (const child of children) {
          updated.push({ id: child.id, cleared: updates.cleared });
        }
      }
    } else {
      // Insert a new transaction
      let finalTransaction = {
        ...trans,
        id: uuidv4(),
        category: trans.category || null,
        cleared: trans.cleared != null ? trans.cleared : true,
      };

      if (subtransactions && subtransactions.length > 0) {
        added.push(...makeSplitTransaction(finalTransaction, subtransactions));
      } else {
        added.push(finalTransaction);
      }
    }
  }

  await createNewPayees(payeesToCreate, [...added, ...updated]);
  await batchUpdateTransactions({ added, updated });

  return {
    added: added.map(trans => trans.id),
    updated: updated.map(trans => trans.id),
  };
}

export async function reconcileTransactions(acctId, transactions) {
  const hasMatched = new Set();
  const updated = [];
  const added = [];

  let { normalized, payeesToCreate } = await normalizeTransactions(
    transactions,
    acctId,
  );

  // The first pass runs the rules, and preps data for fuzzy matching
  let transactionsStep1 = [];
  for (let { payee_name, trans, subtransactions } of normalized) {
    // Run the rules
    trans = runRules(trans);

    let match = null;
    let fuzzyDataset = null;

    // First, match with an existing transaction's imported_id. This
    // is the highest fidelity match and should always be attempted
    // first.
    if (trans.imported_id) {
      match = await db.first(
        'SELECT * FROM v_transactions WHERE imported_id = ? AND account = ?',
        [trans.imported_id, acctId],
      );

      if (match) {
        hasMatched.add(match.id);
      }
    }

    // If it didn't match, query data needed for fuzzy matching
    if (!match) {
      // Look 1 day ahead and 4 days back when fuzzy matching. This
      // needs to select all fields that need to be read from the
      // matched transaction. See the final pass below for the needed
      // fields.
      fuzzyDataset = await db.all(
        `SELECT id, is_parent, date, imported_id, payee, category, notes FROM v_transactions
           WHERE date >= ? AND date <= ? AND amount = ? AND account = ? AND is_child = 0`,
        [
          db.toDateRepr(monthUtils.subDays(trans.date, 4)),
          db.toDateRepr(monthUtils.addDays(trans.date, 1)),
          trans.amount || 0,
          acctId,
        ],
      );
    }

    transactionsStep1.push({
      payee_name,
      trans,
      subtransactions,
      match,
      fuzzyDataset,
    });
  }

  // Next, do the fuzzy matching. This first pass matches based on the
  // payee id. We do this in multiple passes so that higher fidelity
  // matching always happens first, i.e. a transaction should match
  // match with low fidelity if a later transaction is going to match
  // the same one with high fidelity.
  let transactionsStep2 = transactionsStep1.map(data => {
    if (!data.match && data.fuzzyDataset) {
      // Try to find one where the payees match.
      let match = data.fuzzyDataset.find(
        row => !hasMatched.has(row.id) && data.trans.payee === row.payee,
      );

      if (match) {
        hasMatched.add(match.id);
        return { ...data, match };
      }
    }
    return data;
  });

  // The final fuzzy matching pass. This is the lowest fidelity
  // matching: it just find the first transaction that hasn't been
  // matched yet. Remember the the dataset only contains transactions
  // around the same date with the same amount.
  let transactionsStep3 = transactionsStep2.map(data => {
    if (!data.match && data.fuzzyDataset) {
      let match = data.fuzzyDataset.find(row => !hasMatched.has(row.id));
      if (match) {
        hasMatched.add(match.id);
        return { ...data, match };
      }
    }
    return data;
  });

  // Finally, generate & commit the changes
  for (let { trans, subtransactions, match } of transactionsStep3) {
    if (match) {
      // TODO: change the above sql query to use aql
      let existing = {
        ...match,
        cleared: match.cleared === 1,
        date: db.fromDateRepr(match.date),
      };

      // Update the transaction
      const updates = {
        date: trans.date,
        imported_id: trans.imported_id || null,
        payee: existing.payee || trans.payee || null,
        category: existing.category || trans.category || null,
        imported_payee: trans.imported_payee || null,
        notes: existing.notes || trans.notes || null,
        cleared: trans.cleared != null ? trans.cleared : true,
      };

      if (hasFieldsChanged(existing, updates, Object.keys(updates))) {
        updated.push({ id: existing.id, ...updates });
      }

      if (existing.is_parent && existing.cleared !== updates.cleared) {
        const children = await db.all(
          'SELECT id FROM v_transactions WHERE parent_id = ?',
          [existing.id],
        );
        for (const child of children) {
          updated.push({ id: child.id, cleared: updates.cleared });
        }
      }
    } else {
      // Insert a new transaction
      let finalTransaction = {
        ...trans,
        id: uuidv4(),
        category: trans.category || null,
        cleared: trans.cleared != null ? trans.cleared : true,
      };

      if (subtransactions && subtransactions.length > 0) {
        added.push(...makeSplitTransaction(finalTransaction, subtransactions));
      } else {
        added.push(finalTransaction);
      }
    }
  }

  await createNewPayees(payeesToCreate, [...added, ...updated]);
  await batchUpdateTransactions({ added, updated });

  return {
    added: added.map(trans => trans.id),
    updated: updated.map(trans => trans.id),
  };
}

// This is similar to `reconcileTransactions` except much simpler: it
// does not try to match any transactions. It just adds them
export async function addTransactions(
  acctId,
  transactions,
  { runTransfers = true } = {},
) {
  const added = [];

  let { normalized, payeesToCreate } = await normalizeTransactions(
    transactions,
    acctId,
    { rawPayeeName: true },
  );

  for (let { trans, subtransactions } of normalized) {
    // Run the rules
    trans = runRules(trans);

    let finalTransaction = {
      id: uuidv4(),
      ...trans,
      account: acctId,
      cleared: trans.cleared != null ? trans.cleared : true,
    };

    // Add split transactions if they are given
    if (subtransactions && subtransactions.length > 0) {
      added.push(...makeSplitTransaction(finalTransaction, subtransactions));
    } else {
      added.push(finalTransaction);
    }
  }

  await createNewPayees(payeesToCreate, added);

  let newTransactions;
  if (runTransfers) {
    let res = await batchUpdateTransactions({ added });
    newTransactions = res.added.map(t => t.id);
  } else {
    await batchMessages(async () => {
      newTransactions = await Promise.all(
        added.map(async trans => db.insertTransaction(trans)),
      );
    });
  }
  return newTransactions;
}

export async function syncGoCardlessAccount(
  userId,
  userKey,
  id,
  acctId,
  bankId,
) {
  // TODO: Handle the case where transactions exist in the future
  // (that will make start date after end date)
  const latestTransaction = await db.first(
    'SELECT * FROM v_transactions WHERE account = ? ORDER BY date DESC LIMIT 1',
    [id],
  );

  const acctRow = await db.select('accounts', id);

  if (latestTransaction) {
    const startingTransaction = await db.first(
      'SELECT date FROM v_transactions WHERE account = ? ORDER BY date ASC LIMIT 1',
      [id],
    );
    const startingDate = monthUtils.parseDate(
      db.fromDateRepr(startingTransaction.date),
    );

    const startDate = monthUtils.dayFromDate(
      dateFns.max([
        // Many GoCardless integrations do not support getting more than 90 days
        // worth of data, so make that the earliest possible limit.
        monthUtils.parseDate(monthUtils.subDays(monthUtils.currentDay(), 90)),

        // Never download transactions before the starting date.
        startingDate,
      ]),
    );

    let { transactions, accountBalance } = await downloadGoCardlessTransactions(
      userId,
      userKey,
      acctId,
      bankId,
      startDate,
    );

    if (transactions.length === 0) {
      return { added: [], updated: [] };
    }

    transactions = transactions.map(trans => ({ ...trans, account: id }));

    return runMutator(async () => {
      const result = await reconcileGoCardlessTransactions(id, transactions);
      await updateAccountBalance(id, accountBalance);
      return result;
    });
  } else {
    // Otherwise, download transaction for the past 90 days
    const startingDay = monthUtils.subDays(monthUtils.currentDay(), 90);

    const { transactions, startingBalance } =
      await downloadGoCardlessTransactions(
        userId,
        userKey,
        acctId,
        bankId,
        startingDay,
      );

    // We need to add a transaction that represents the starting
    // balance for everything to balance out. In order to get balance
    // before the first imported transaction, we need to get the
    // current balance from the accounts table and subtract all the
    // imported transactions.

    const oldestTransaction = transactions[transactions.length - 1];

    const oldestDate =
      transactions.length > 0
        ? oldestTransaction.date
        : monthUtils.currentDay();

    const payee = await getStartingBalancePayee();

    return runMutator(async () => {
      let initialId = await db.insertTransaction({
        account: id,
        amount: startingBalance,
        category: acctRow.offbudget === 0 ? payee.category : null,
        payee: payee.id,
        date: oldestDate,
        cleared: true,
        starting_balance_flag: true,
      });

      let result = await reconcileGoCardlessTransactions(id, transactions);
      return {
        ...result,
        added: [initialId, ...result.added],
      };
    });
  }
}

export async function syncAccount(userId, userKey, id, acctId, bankId) {
  // TODO: Handle the case where transactions exist in the future
  // (that will make start date after end date)
  const latestTransaction = await db.first(
    'SELECT * FROM v_transactions WHERE account = ? ORDER BY date DESC LIMIT 1',
    [id],
  );

  if (latestTransaction) {
    const startingTransaction = await db.first(
      'SELECT date FROM v_transactions WHERE account = ? ORDER BY date ASC LIMIT 1',
      [id],
    );
    const startingDate = db.fromDateRepr(startingTransaction.date);
    // assert(startingTransaction)

    // Get all transactions since the latest transaction, plus any 5
    // days before the latest transaction. This gives us a chance to
    // resolve any transactions that were entered manually.
    //
    // TODO: What this really should do is query the last imported_id
    // and since then
    let date = monthUtils.subDays(db.fromDateRepr(latestTransaction.date), 31);

    // Never download transactions before the starting date. This was
    // when the account was added to the system.
    if (date < startingDate) {
      date = startingDate;
    }

    let { transactions, accountBalance } = await downloadTransactions(
      userId,
      userKey,
      acctId,
      bankId,
      date,
    );
    if (transactions.length === 0) {
      return { added: [], updated: [] };
    }

    transactions = transactions.map(trans => ({ ...trans, account: id }));

    return runMutator(async () => {
      const result = await reconcileTransactions(id, transactions);
      await updateAccountBalance(id, accountBalance);
      return result;
    });
  } else {
    const acctRow = await db.select('accounts', id);

    // Otherwise, download transaction for the last few days if it's an
    // on-budget account, or for the past 30 days if off-budget
    const startingDay = monthUtils.subDays(
      monthUtils.currentDay(),
      acctRow.offbudget === 0 ? 1 : 30,
    );

    const { transactions } = await downloadTransactions(
      userId,
      userKey,
      acctId,
      bankId,
      dateFns.format(dateFns.parseISO(startingDay), 'yyyy-MM-dd'),
    );

    // We need to add a transaction that represents the starting
    // balance for everything to balance out. In order to get balance
    // before the first imported transaction, we need to get the
    // current balance from the accounts table and subtract all the
    // imported transactions.
    let currentBalance = acctRow.balance_current;

    const previousBalance = transactions.reduce((total, trans) => {
      return total - trans.amount;
    }, currentBalance);

    const oldestDate =
      transactions.length > 0
        ? transactions[transactions.length - 1].date
        : monthUtils.currentDay();

    let payee = await getStartingBalancePayee();

    return runMutator(async () => {
      let initialId = await db.insertTransaction({
        account: id,
        amount: previousBalance,
        category: acctRow.offbudget === 0 ? payee.category : null,
        payee: payee.id,
        date: oldestDate,
        cleared: true,
        starting_balance_flag: true,
      });

      let result = await reconcileTransactions(id, transactions);
      return {
        ...result,
        added: [initialId, ...result.added],
      };
    });
  }
}
