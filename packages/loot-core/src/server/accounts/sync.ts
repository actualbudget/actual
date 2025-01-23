// @ts-strict-ignore
import * as dateFns from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import * as asyncStorage from '../../platform/server/asyncStorage';
import * as monthUtils from '../../shared/months';
import { q } from '../../shared/query';
import {
  makeChild as makeChildTransaction,
  recalculateSplit,
} from '../../shared/transactions';
import {
  hasFieldsChanged,
  amountToInteger,
  integerToAmount,
} from '../../shared/util';
import {
  AccountEntity,
  BankSyncResponse,
  SimpleFinBatchSyncResponse,
  TransactionEntity,
} from '../../types/models';
import { runQuery } from '../aql';
import * as db from '../db';
import { runMutator } from '../mutators';
import { post } from '../post';
import { getServer } from '../server-config';
import { batchMessages } from '../sync';
import { batchUpdateTransactions } from '../transactions';
import { runRules } from '../transactions/transaction-rules';

import { getStartingBalancePayee } from './payees';
import { title } from './title';

function BankSyncError(type: string, code: string, details?: object) {
  return { type: 'BankSyncError', category: type, code, details };
}

function makeSplitTransaction(trans, subtransactions) {
  // We need to calculate the final state of split transactions
  const { subtransactions: sub, ...parent } = recalculateSplit({
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

async function getAccountOldestTransaction(id): Promise<TransactionEntity> {
  return (
    await runQuery(
      q('transactions')
        .filter({
          account: id,
          date: { $lte: monthUtils.currentDay() },
        })
        .select('date')
        .orderBy('date')
        .limit(1),
    )
  ).data?.[0];
}

async function getAccountSyncStartDate(id) {
  // Many GoCardless integrations do not support getting more than 90 days
  // worth of data, so make that the earliest possible limit.
  const dates = [monthUtils.subDays(monthUtils.currentDay(), 90)];

  const oldestTransaction = await getAccountOldestTransaction(id);

  if (oldestTransaction) dates.push(oldestTransaction.date);

  return monthUtils.dayFromDate(
    dateFns.max(dates.map(d => monthUtils.parseDate(d))),
  );
}

export async function getGoCardlessAccounts(userId, userKey, id) {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) return;

  const res = await post(
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

  const { accounts } = res;

  accounts.forEach(acct => {
    acct.balances.current = getAccountBalance(acct);
  });

  return accounts;
}

async function downloadGoCardlessTransactions(
  userId,
  userKey,
  acctId,
  bankId,
  since,
  includeBalance = true,
) {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) return;

  console.log('Pulling transactions from GoCardless');

  const res = await post(
    getServer().GOCARDLESS_SERVER + '/transactions',
    {
      userId,
      key: userKey,
      requisitionId: bankId,
      accountId: acctId,
      startDate: since,
      includeBalance,
    },
    {
      'X-ACTUAL-TOKEN': userToken,
    },
  );

  if (res.error_code) {
    const errorDetails = {
      rateLimitHeaders: res.rateLimitHeaders,
    };

    throw BankSyncError(res.error_type, res.error_code, errorDetails);
  }

  if (includeBalance) {
    const {
      transactions: { all },
      balances,
      startingBalance,
    } = res;

    console.log('Response:', res);

    return {
      transactions: all,
      accountBalance: balances,
      startingBalance,
    };
  } else {
    console.log('Response:', res);

    return {
      transactions: res.transactions.all,
    };
  }
}

async function downloadSimpleFinTransactions(
  acctId: AccountEntity['id'] | AccountEntity['id'][],
  since: string | string[],
) {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) return;

  const batchSync = Array.isArray(acctId);

  console.log('Pulling transactions from SimpleFin');

  const res = await post(
    getServer().SIMPLEFIN_SERVER + '/transactions',
    {
      accountId: acctId,
      startDate: since,
    },
    {
      'X-ACTUAL-TOKEN': userToken,
    },
    60000,
  );

  if (Object.keys(res).length === 0) {
    throw BankSyncError('NO_DATA', 'NO_DATA');
  }
  if (res.error_code) {
    throw BankSyncError(res.error_type, res.error_code);
  }

  let retVal = {};
  if (batchSync) {
    for (const [accountId, data] of Object.entries(
      res as SimpleFinBatchSyncResponse,
    )) {
      if (accountId === 'errors') continue;

      const error = res?.errors?.[accountId]?.[0];

      retVal[accountId] = {
        transactions: data?.transactions?.all,
        accountBalance: data?.balances,
        startingBalance: data?.startingBalance,
      };

      if (error) {
        retVal[accountId].error_type = error.error_type;
        retVal[accountId].error_code = error.error_code;
      }
    }
  } else {
    const singleRes = res as BankSyncResponse;
    retVal = {
      transactions: singleRes.transactions.all,
      accountBalance: singleRes.balances,
      startingBalance: singleRes.startingBalance,
    };
  }

  console.log('Response:', retVal);
  return retVal;
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
      const newPayee = { id: uuidv4(), name: payeeName };
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
  const payeesToCreate = new Map();

  const normalized = [];
  for (let trans of transactions) {
    // Validate the date because we do some stuff with it. The db
    // layer does better validation, but this will give nicer errors
    if (trans.date == null) {
      throw new Error('`date` is required when adding a transaction');
    }

    // Strip off the irregular properties
    const { payee_name: originalPayeeName, subtransactions, ...rest } = trans;
    trans = rest;

    let payee_name = originalPayeeName;
    if (payee_name) {
      const trimmed = payee_name.trim();
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

    trans.category = trans.category ?? null;

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

async function normalizeBankSyncTransactions(transactions, acctId) {
  const payeesToCreate = new Map();

  const normalized = [];
  for (const trans of transactions) {
    if (!trans.amount) {
      trans.amount = trans.transactionAmount.amount;
    }

    // Validate the date because we do some stuff with it. The db
    // layer does better validation, but this will give nicer errors
    if (trans.date == null) {
      throw new Error('`date` is required when adding a transaction');
    }

    if (trans.payeeName == null) {
      throw new Error('`payeeName` is required when adding a transaction');
    }

    trans.imported_payee = trans.imported_payee || trans.payeeName;
    if (trans.imported_payee) {
      trans.imported_payee = trans.imported_payee.trim();
    }

    // It's important to resolve both the account and payee early so
    // when rules are run, they have the right data. Resolving payees
    // also simplifies the payee creation process
    trans.account = acctId;
    trans.payee = await resolvePayee(trans, trans.payeeName, payeesToCreate);

    trans.cleared = Boolean(trans.booked);

    const notes =
      trans.remittanceInformationUnstructured ||
      (trans.remittanceInformationUnstructuredArray || []).join(', ');

    normalized.push({
      payee_name: trans.payeeName,
      trans: {
        amount: amountToInteger(trans.amount),
        payee: trans.payee,
        account: trans.account,
        date: trans.date,
        notes: notes.trim().replace('#', '##'),
        category: trans.category ?? null,
        imported_id: trans.transactionId,
        imported_payee: trans.imported_payee,
        cleared: trans.cleared,
      },
    });
  }

  return { normalized, payeesToCreate };
}

async function createNewPayees(payeesToCreate, addsAndUpdates) {
  const usedPayeeIds = new Set(addsAndUpdates.map(t => t.payee));

  await batchMessages(async () => {
    for (const payee of payeesToCreate.values()) {
      // Only create the payee if it ended up being used
      if (usedPayeeIds.has(payee.id)) {
        await db.insertPayee(payee);
      }
    }
  });
}

export async function reconcileTransactions(
  acctId,
  transactions,
  isBankSyncAccount = false,
  strictIdChecking = true,
  isPreview = false,
  defaultCleared = true,
) {
  console.log('Performing transaction reconciliation');

  const updated = [];
  const added = [];
  const updatedPreview = [];
  const existingPayeeMap = new Map<string, string>();

  const {
    payeesToCreate,
    transactionsStep1,
    transactionsStep2,
    transactionsStep3,
  } = await matchTransactions(
    acctId,
    transactions,
    isBankSyncAccount,
    strictIdChecking,
  );

  // Finally, generate & commit the changes
  for (const { trans, subtransactions, match } of transactionsStep3) {
    if (match && !trans.forceAddTransaction) {
      // Skip updating already reconciled (locked) transactions
      if (match.reconciled) {
        updatedPreview.push({ transaction: trans, ignored: true });
        continue;
      }

      // TODO: change the above sql query to use aql
      const existing = {
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
        cleared: trans.cleared ?? existing.cleared,
      };

      if (hasFieldsChanged(existing, updates, Object.keys(updates))) {
        updated.push({ id: existing.id, ...updates });
        if (!existingPayeeMap.has(existing.payee)) {
          const payee = await db.getPayee(existing.payee);
          existingPayeeMap.set(existing.payee, payee?.name);
        }
        existing.payee_name = existingPayeeMap.get(existing.payee);
        existing.amount = integerToAmount(existing.amount);
        updatedPreview.push({ transaction: trans, existing });
      } else {
        updatedPreview.push({ transaction: trans, ignored: true });
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
      const { forceAddTransaction, ...newTrans } = trans;
      const finalTransaction = {
        ...newTrans,
        id: uuidv4(),
        category: trans.category || null,
        cleared: trans.cleared ?? defaultCleared,
      };

      if (subtransactions && subtransactions.length > 0) {
        added.push(...makeSplitTransaction(finalTransaction, subtransactions));
      } else {
        added.push(finalTransaction);
      }
    }
  }

  // Maintain the sort order of the server
  const now = Date.now();
  added.forEach((t, index) => {
    t.sort_order ??= now - index;
  });

  if (!isPreview) {
    await createNewPayees(payeesToCreate, [...added, ...updated]);
    await batchUpdateTransactions({ added, updated });
  }

  console.log('Debug data for the operations:', {
    transactionsStep1,
    transactionsStep2,
    transactionsStep3,
    added,
    updated,
    updatedPreview,
  });

  return {
    added: added.map(trans => trans.id),
    updated: updated.map(trans => trans.id),
    updatedPreview,
  };
}

export async function matchTransactions(
  acctId,
  transactions,
  isBankSyncAccount = false,
  strictIdChecking = true,
) {
  console.log('Performing transaction reconciliation matching');

  const hasMatched = new Set();

  const transactionNormalization = isBankSyncAccount
    ? normalizeBankSyncTransactions
    : normalizeTransactions;

  const { normalized, payeesToCreate } = await transactionNormalization(
    transactions,
    acctId,
  );

  // The first pass runs the rules, and preps data for fuzzy matching
  const accounts: AccountEntity[] = await db.getAccounts();
  const accountsMap = new Map(accounts.map(account => [account.id, account]));

  const transactionsStep1 = [];
  for (const {
    payee_name,
    trans: originalTrans,
    subtransactions,
  } of normalized) {
    // Run the rules
    const trans = await runRules(originalTrans, accountsMap);

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
      // Fuzzy matching looks 7 days ahead and 7 days back. This
      // needs to select all fields that need to be read from the
      // matched transaction. See the final pass below for the needed
      // fields.
      const sevenDaysBefore = db.toDateRepr(monthUtils.subDays(trans.date, 7));
      const sevenDaysAfter = db.toDateRepr(monthUtils.addDays(trans.date, 7));
      // strictIdChecking has the added behaviour of only matching on transactions with no import ID
      // if the transaction being imported has an import ID.
      if (strictIdChecking) {
        fuzzyDataset = await db.all(
          `SELECT id, is_parent, date, imported_id, payee, imported_payee, category, notes, reconciled, cleared, amount
          FROM v_transactions
          WHERE
            -- If both ids are set, and we didn't match earlier then skip dedup
            (imported_id IS NULL OR ? IS NULL)
            AND date >= ? AND date <= ? AND amount = ?
            AND account = ?`,
          [
            trans.imported_id || null,
            sevenDaysBefore,
            sevenDaysAfter,
            trans.amount || 0,
            acctId,
          ],
        );
      } else {
        fuzzyDataset = await db.all(
          `SELECT id, is_parent, date, imported_id, payee, imported_payee, category, notes, reconciled, cleared, amount
          FROM v_transactions
          WHERE date >= ? AND date <= ? AND amount = ? AND account = ?`,
          [sevenDaysBefore, sevenDaysAfter, trans.amount || 0, acctId],
        );
      }

      // Sort the matched transactions according to the distance from the original
      // transactions date. i.e. if the original transaction is in 21-02-2024 and
      // the matched transactions are: 20-02-2024, 21-02-2024, 29-02-2024 then
      // the resulting data-set should be: 21-02-2024, 20-02-2024, 29-02-2024.
      fuzzyDataset = fuzzyDataset.sort((a, b) => {
        const aDistance = Math.abs(
          dateFns.differenceInMilliseconds(
            dateFns.parseISO(trans.date),
            dateFns.parseISO(db.fromDateRepr(a.date)),
          ),
        );
        const bDistance = Math.abs(
          dateFns.differenceInMilliseconds(
            dateFns.parseISO(trans.date),
            dateFns.parseISO(db.fromDateRepr(b.date)),
          ),
        );
        return aDistance > bDistance ? 1 : -1;
      });
    }

    transactionsStep1.push({
      payee_name,
      trans,
      subtransactions: trans.subtransactions || subtransactions,
      match,
      fuzzyDataset,
    });
  }

  // Next, do the fuzzy matching. This first pass matches based on the
  // payee id. We do this in multiple passes so that higher fidelity
  // matching always happens first, i.e. a transaction should match
  // match with low fidelity if a later transaction is going to match
  // the same one with high fidelity.
  const transactionsStep2 = transactionsStep1.map(data => {
    if (!data.match && data.fuzzyDataset) {
      // Try to find one where the payees match.
      const match = data.fuzzyDataset.find(
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
  // matched yet. Remember the dataset only contains transactions
  // around the same date with the same amount.
  const transactionsStep3 = transactionsStep2.map(data => {
    if (!data.match && data.fuzzyDataset) {
      const match = data.fuzzyDataset.find(row => !hasMatched.has(row.id));
      if (match) {
        hasMatched.add(match.id);
        return { ...data, match };
      }
    }
    return data;
  });

  return {
    payeesToCreate,
    transactionsStep1,
    transactionsStep2,
    transactionsStep3,
  };
}

// This is similar to `reconcileTransactions` except much simpler: it
// does not try to match any transactions. It just adds them
export async function addTransactions(
  acctId,
  transactions,
  { runTransfers = true, learnCategories = false } = {},
) {
  const added = [];

  const { normalized, payeesToCreate } = await normalizeTransactions(
    transactions,
    acctId,
    { rawPayeeName: true },
  );

  const accounts: AccountEntity[] = await db.getAccounts();
  const accountsMap = new Map(accounts.map(account => [account.id, account]));

  for (const { trans: originalTrans, subtransactions } of normalized) {
    // Run the rules
    const trans = await runRules(originalTrans, accountsMap);

    const finalTransaction = {
      id: uuidv4(),
      ...trans,
      account: acctId,
      cleared: trans.cleared != null ? trans.cleared : true,
    };

    // Add split transactions if they are given
    const updatedSubtransactions =
      finalTransaction.subtransactions || subtransactions;
    if (updatedSubtransactions && updatedSubtransactions.length > 0) {
      added.push(
        ...makeSplitTransaction(finalTransaction, updatedSubtransactions),
      );
    } else {
      added.push(finalTransaction);
    }
  }

  await createNewPayees(payeesToCreate, added);

  let newTransactions;
  if (runTransfers || learnCategories) {
    const res = await batchUpdateTransactions({
      added,
      learnCategories,
      runTransfers,
    });
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

async function processBankSyncDownload(
  download,
  id,
  acctRow,
  initialSync = false,
) {
  // If syncing an account from sync source it must not use strictIdChecking. This allows
  // the fuzzy search to match transactions where the import IDs are different. It is a known quirk
  // that account sync sources can give two different transaction IDs even though it's the same transaction.
  const useStrictIdChecking = !acctRow.account_sync_source;

  if (initialSync) {
    const { transactions } = download;
    let balanceToUse = download.startingBalance;

    if (acctRow.account_sync_source === 'simpleFin') {
      const currentBalance = download.startingBalance;
      const previousBalance = transactions.reduce((total, trans) => {
        return (
          total - parseInt(trans.transactionAmount.amount.replace('.', ''))
        );
      }, currentBalance);
      balanceToUse = previousBalance;
    }

    const oldestTransaction = transactions[transactions.length - 1];

    const oldestDate =
      transactions.length > 0
        ? oldestTransaction.date
        : monthUtils.currentDay();

    const payee = await getStartingBalancePayee();

    return runMutator(async () => {
      const initialId = await db.insertTransaction({
        account: id,
        amount: balanceToUse,
        category: acctRow.offbudget === 0 ? payee.category : null,
        payee: payee.id,
        date: oldestDate,
        cleared: true,
        starting_balance_flag: true,
      });

      const result = await reconcileTransactions(
        id,
        transactions,
        true,
        useStrictIdChecking,
      );
      return {
        ...result,
        added: [initialId, ...result.added],
      };
    });
  }

  const { transactions: originalTransactions, accountBalance } = download;

  if (originalTransactions.length === 0) {
    return { added: [], updated: [] };
  }

  const transactions = originalTransactions.map(trans => ({
    ...trans,
    account: id,
  }));

  return runMutator(async () => {
    const result = await reconcileTransactions(
      id,
      transactions,
      true,
      useStrictIdChecking,
    );

    if (accountBalance) await updateAccountBalance(id, accountBalance);

    return result;
  });
}

export async function syncAccount(
  userId: string | undefined,
  userKey: string | undefined,
  id: string,
  acctId: string,
  bankId: string,
) {
  const acctRow = await db.select('accounts', id);

  const syncStartDate = await getAccountSyncStartDate(id);
  const oldestTransaction = await getAccountOldestTransaction(id);
  const newAccount = oldestTransaction == null;

  let download;
  if (acctRow.account_sync_source === 'simpleFin') {
    download = await downloadSimpleFinTransactions(acctId, syncStartDate);
  } else if (acctRow.account_sync_source === 'goCardless') {
    download = await downloadGoCardlessTransactions(
      userId,
      userKey,
      acctId,
      bankId,
      syncStartDate,
      newAccount,
    );
  } else {
    throw new Error(
      `Unrecognized bank-sync provider: ${acctRow.account_sync_source}`,
    );
  }

  return processBankSyncDownload(download, id, acctRow, newAccount);
}

export async function simpleFinBatchSync(
  accounts: Array<Pick<AccountEntity, 'id' | 'account_id'>>,
) {
  const startDates = await Promise.all(
    accounts.map(async a => getAccountSyncStartDate(a.id)),
  );

  const res = await downloadSimpleFinTransactions(
    accounts.map(a => a.account_id),
    startDates,
  );

  const promises = [];
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const download = res[account.account_id];

    const acctRow = await db.select('accounts', account.id);
    const oldestTransaction = await getAccountOldestTransaction(account.id);
    const newAccount = oldestTransaction == null;

    if (download.error_code) {
      promises.push(
        Promise.resolve({
          accountId: account.id,
          res: download,
        }),
      );

      continue;
    }

    promises.push(
      processBankSyncDownload(download, account.id, acctRow, newAccount).then(
        res => ({
          accountId: account.id,
          res,
        }),
      ),
    );
  }

  return await Promise.all(promises);
}
