// @ts-strict-ignore
import * as dateFns from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import * as asyncStorage from '#platform/server/asyncStorage';
import { logger } from '#platform/server/log';
import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { TRANSACTION_SORT_INCREMENT } from '#server/db/sort';
import { TransactionError } from '#server/errors';
import { computeEntryPair } from '#server/exchange-rates/app';
import { runMutator } from '#server/mutators';
import { post } from '#server/post';
import { getServer } from '#server/server-config';
import { batchMessages } from '#server/sync';
import { effectiveEncoding } from '#server/sync/coupled-cells';
import { batchUpdateTransactions } from '#server/transactions';
import {
  exchangeFamilyReconciled,
  foreignAccountCurrency,
  isExchangeRow,
  isReplaceableExchangeLeg,
  preflightTransactionWrites,
  queuedAccount,
  replaceExchangeTotal,
} from '#server/transactions/foreign-guard';
import { runRules } from '#server/transactions/transaction-rules';
import { getRecordedAmountPrecision } from '#server/util/currency';
import {
  defaultMappings,
  mappingsFromString,
} from '#server/util/custom-sync-mapping';
import { rescaleDecimalAmount } from '#shared/amount-rescale';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import {
  makeChild as makeChildTransaction,
  recalculateSplit,
} from '#shared/transactions';
import {
  hasFieldsChanged,
  integerToAmount,
  MAX_SAFE_NUMBER,
} from '#shared/util';
import type {
  AccountEntity,
  BankSyncResponse,
  TransactionEntity,
} from '#types/models';

import { findScheduledExchange } from './exchange-import';
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

/** The encoding an account's integers are read in, as stored now. */
async function storedEncoding(id: AccountEntity['id']) {
  const row = await db.first<
    Pick<db.DbAccount, 'encoding' | 'currency' | 'currency_precision'>
  >(
    'SELECT encoding, currency, currency_precision FROM accounts WHERE id = ?',
    [id],
  );
  return effectiveEncoding(
    row?.encoding,
    row?.currency ?? null,
    row?.currency_precision ?? null,
  );
}

/**
 * Caches a provider balance, stamped with the encoding it was decoded in:
 * if a correction changed the account since, it derives to null instead of
 * being read in the new encoding.
 */
async function updateAccountBalance(
  id: AccountEntity['id'],
  balance: number | null,
  decodedIn: string,
) {
  const changes = { balance_current: balance };
  await db.update('accounts', {
    id,
    ...changes,
    ...(await db.balanceSpecFields(id, { ...changes, encoding: decodedIn })),
  });
}

async function getAccountOldestTransaction(id): Promise<TransactionEntity> {
  return (
    await aqlQuery(
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
  // 89 days ago until today inclusive is 90 days.
  const dates = [monthUtils.subDays(monthUtils.currentDay(), 89)];

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

  logger.log('Pulling transactions from GoCardless');

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
      startingBalanceCurrency,
    } = res;

    logger.log('Response:', res);

    return {
      transactions: all,
      accountBalance: balances,
      startingBalance,
      startingBalanceCurrency,
    };
  } else {
    logger.log('Response:', res);

    return {
      transactions: res.transactions.all,
    };
  }
}

async function downloadSimpleFinTransactions(
  acctId: AccountEntity['id'] | AccountEntity['id'][],
  since: string | string[],
  fileId?: string,
) {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) return;

  const batchSync = Array.isArray(acctId);

  logger.log('Pulling transactions from SimpleFin');

  let res;
  try {
    res = await post(
      getServer().SIMPLEFIN_SERVER + '/transactions',
      {
        accountId: acctId,
        startDate: since,
      },
      {
        'X-ACTUAL-TOKEN': userToken,
        ...(fileId ? { 'X-Actual-File-Id': fileId } : {}),
      },
      // 5 minute timeout for batch sync, one minute for individual accounts
      Array.isArray(acctId) ? 300000 : 60000,
    );
  } catch (error) {
    logger.error('Suspected timeout during bank sync:', error);
    throw BankSyncError('TIMED_OUT', 'TIMED_OUT');
  }

  if (Object.keys(res).length === 0) {
    throw BankSyncError('NO_DATA', 'NO_DATA');
  }
  if (res.error_code) {
    throw BankSyncError(res.error_type, res.error_code);
  }

  let retVal = {};
  if (batchSync) {
    const batchErrors = res.errors;
    for (const accountId of Object.keys(res)) {
      if (accountId === 'errors') continue;

      const data = res[accountId];
      const error = batchErrors?.[accountId]?.[0];

      retVal[accountId] = {
        transactions: data?.transactions?.all,
        accountBalance: data?.balances,
        startingBalance: data?.startingBalance,
        startingBalanceCurrency: data?.startingBalanceCurrency,
      };

      if (error) {
        retVal[accountId].error_type = error.error_type;
        retVal[accountId].error_code = error.error_code;
      }
    }

    // Add entries for accounts that only have errors (no data in the response)
    if (batchErrors) {
      for (const [accountId, errorList] of Object.entries(batchErrors)) {
        if (
          !retVal[accountId] &&
          Array.isArray(errorList) &&
          errorList.length > 0
        ) {
          const error = errorList[0];
          retVal[accountId] = {
            transactions: [],
            accountBalance: [],
            startingBalance: '0',
            error_type: error.error_type,
            error_code: error.error_code,
          };
        }
      }
    }
  } else {
    retVal = {
      transactions: res.transactions.all,
      accountBalance: res.balances,
      startingBalance: res.startingBalance,
      startingBalanceCurrency: res.startingBalanceCurrency,
    };
  }

  logger.log('Response:', retVal);
  return retVal;
}

async function downloadPluggyAiTransactions(
  acctId: AccountEntity['id'],
  since: string,
  fileId?: string,
) {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) return;

  logger.log('Pulling transactions from Pluggy.ai');

  const res = await post(
    getServer().PLUGGYAI_SERVER + '/transactions',
    {
      accountId: acctId,
      startDate: since,
    },
    {
      'X-ACTUAL-TOKEN': userToken,
      ...(fileId ? { 'X-Actual-File-Id': fileId } : {}),
    },
    60000,
  );

  if (res.error_code) {
    throw BankSyncError(res.error_type, res.error_code);
  } else if ('error' in res) {
    throw BankSyncError('Connection', res.error);
  }

  let retVal = {};
  const singleRes = res as BankSyncResponse;
  retVal = {
    transactions: singleRes.transactions.all,
    accountBalance: singleRes.balances,
    startingBalance: singleRes.startingBalance,
    startingBalanceCurrency: singleRes.startingBalanceCurrency,
  };

  logger.log('Response:', retVal);
  return retVal;
}

async function downloadAkahuTransactions(
  acctId: AccountEntity['id'],
  since: string,
) {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) return;

  logger.log('Pulling transactions from Akahu');

  const res = await post(
    getServer().AKAHU_SERVER + '/transactions',
    {
      accountId: acctId,
      startDate: since,
    },
    {
      'X-ACTUAL-TOKEN': userToken,
    },
    60000,
  );

  if (res.error_code) {
    throw BankSyncError(res.error_type, res.error_code);
  } else if ('error' in res) {
    throw BankSyncError('Connection', res.error);
  }

  let retVal = {};
  const singleRes = res as BankSyncResponse;
  retVal = {
    transactions: singleRes.transactions.all,
    accountBalance: singleRes.balances,
    startingBalance: singleRes.startingBalance,
    startingBalanceCurrency: singleRes.startingBalanceCurrency,
  };

  logger.log('Response:', retVal);
  return retVal;
}

async function downloadEnableBankingTransactions(
  acctId: string,
  since: string,
  aspspName?: string,
) {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) return;

  logger.log('Pulling transactions from Enable Banking');

  const res = await post(
    getServer().ENABLEBANKING_SERVER + '/transactions',
    {
      accountId: acctId,
      startDate: since,
      aspspName,
    },
    {
      'X-ACTUAL-TOKEN': userToken,
    },
    60000,
  );

  if (res.error_code) {
    throw BankSyncError(res.error_type, res.error_code);
  }

  const {
    transactions: { all },
    balances,
    startingBalance,
    startingBalanceCurrency,
  } = res;

  return {
    transactions: all,
    accountBalance: balances,
    startingBalance,
    startingBalanceCurrency,
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
      const newPayee = { id: uuidv4(), name: payeeName };
      payeesToCreate.set(payeeName.toLowerCase(), newPayee);
      return newPayee.id;
    }
  }

  return trans.payee;
}

export const PAYEE_NAME_NORMALIZATIONS = ['original', 'title-case'] as const;
export type PayeeNameNormalization = (typeof PAYEE_NAME_NORMALIZATIONS)[number];

function normalizePayeeName(
  payeeName: string,
  normalization: PayeeNameNormalization,
): string {
  switch (normalization) {
    case 'original':
      return payeeName;
    case 'title-case':
      return title(payeeName);
    default:
      normalization satisfies never;
      throw new Error(
        `Unknown payee name normalization: ${String(normalization)}`,
      );
  }
}

async function normalizeTransactions(
  transactions,
  acctId,
  {
    payeeNameNormalization = 'title-case',
  }: {
    payeeNameNormalization?: PayeeNameNormalization;
  } = {},
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

    if (trans.amount != null && !Number.isInteger(trans.amount)) {
      throw new TransactionError(
        `Amount is invalid, must be an integer: ${trans.amount}`,
      );
    }

    if (subtransactions) {
      for (const sub of subtransactions) {
        if (sub.amount != null && !Number.isInteger(sub.amount)) {
          throw new TransactionError(
            `Subtransaction amount is invalid, must be an integer: ${sub.amount}`,
          );
        }
      }
    }

    let payee_name = originalPayeeName;
    if (payee_name) {
      const trimmed = payee_name.trim();
      if (trimmed === '') {
        payee_name = null;
      } else {
        payee_name = normalizePayeeName(trimmed, payeeNameNormalization);
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

async function normalizeBankSyncTransactions(
  transactions,
  acctId,
  amountPrecision: number,
  isForeign: boolean,
) {
  const payeesToCreate = new Map();

  const [customMappingsRaw, importPending, importNotes] = await Promise.all([
    aqlQuery(
      q('preferences')
        .filter({ id: `custom-sync-mappings-${acctId}` })
        .select('value'),
    ).then(data => data?.data?.[0]?.value),
    aqlQuery(
      q('preferences')
        .filter({ id: `sync-import-pending-${acctId}` })
        .select('value'),
    ).then(data => String(data?.data?.[0]?.value ?? 'true') === 'true'),
    aqlQuery(
      q('preferences')
        .filter({ id: `sync-import-notes-${acctId}` })
        .select('value'),
    ).then(data => String(data?.data?.[0]?.value ?? 'true') === 'true'),
  ]);

  const mappings = customMappingsRaw
    ? mappingsFromString(customMappingsRaw)
    : defaultMappings;

  const categoryIds = new Set((await db.getCategories()).map(c => c.id));
  const normalized = [];
  for (const trans of transactions) {
    trans.cleared = Boolean(trans.booked);

    if (!importPending && !trans.cleared) continue;

    trans.amount = trans.transactionAmount.amount;

    const mapping = mappings.get(trans.amount <= 0 ? 'payment' : 'deposit');

    const date = trans[mapping.get('date')] ?? trans.date;
    const payeeName = trans[mapping.get('payee')] ?? trans.payeeName;
    const notes = trans[mapping.get('notes')];

    // Validate the date because we do some stuff with it. The db
    // layer does better validation, but this will give nicer errors
    if (date == null) {
      throw new Error('`date` is required when adding a transaction');
    }

    if (payeeName == null) {
      throw new Error('`payeeName` is required when adding a transaction');
    }

    trans.imported_payee = trans.imported_payee || payeeName;
    if (trans.imported_payee) {
      trans.imported_payee = trans.imported_payee.trim();
    }

    let imported_id = trans.transactionId;
    if (trans.cleared && !trans.transactionId && trans.internalTransactionId) {
      imported_id = `${trans.account}-${trans.internalTransactionId}`;
    }

    // It's important to resolve both the account and payee early so
    // when rules are run, they have the right data. Resolving payees
    // also simplifies the payee creation process
    trans.account = acctId;
    trans.payee = await resolvePayee(trans, payeeName, payeesToCreate);

    const encodedAmount = encodeBankAmount(trans.amount, amountPrecision);
    normalized.push({
      payee_name: payeeName,
      trans: {
        // A foreign account's provider amounts are native; the base is
        // completed after rules.
        ...(isForeign
          ? { transaction_amount: encodedAmount }
          : { amount: encodedAmount }),
        payee: trans.payee,
        account: trans.account,
        date,
        notes: importNotes && notes ? notes.trim().replace(/#/g, '##') : null,
        category: categoryIds.has(trans.category) ? trans.category : null,
        imported_id,
        imported_payee: trans.imported_payee,
        cleared: trans.cleared,
        raw_synced_data: JSON.stringify(trans),
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

export type MatchTransactionsOptions = {
  isBankSyncAccount?: boolean;
  strictIdChecking?: boolean;
  reimportDeleted?: boolean;
  payeeNameNormalization?: PayeeNameNormalization;
  amountPrecision?: number;
  /** The import account's currency when it is a foreign account. */
  foreign?: { currencyCode: string; precision: number } | null;
};

export type ReconcileTransactionsOptions = MatchTransactionsOptions & {
  isPreview?: boolean;
  defaultCleared?: boolean;
  updateDates?: boolean;
};

export type ReconcileTransactionsResult = {
  added: string[];
  updated: string[];
  /** Base amounts resolved for new rows of a foreign account (preview). */
  previewBases?: Array<{ transaction: TransactionEntity; baseAmount: number }>;
  /** Preview rows of a foreign account with no rate for their final date. */
  missingRates?: Array<{ transaction: TransactionEntity; date: string }>;
  updatedPreview: Array<{
    transaction: TransactionEntity;
    existing?: TransactionEntity;
    ignored?: boolean;
    tombstone?: boolean;
  }>;
};

export async function reconcileTransactions(
  acctId,
  transactions,
  {
    isBankSyncAccount = false,
    strictIdChecking = true,
    isPreview = false,
    defaultCleared = true,
    updateDates = false,
    reimportDeleted,
    payeeNameNormalization,
    amountPrecision,
  }: ReconcileTransactionsOptions = {},
): Promise<ReconcileTransactionsResult> {
  logger.log('Performing transaction reconciliation');
  const foreign = await foreignAccountCurrency(acctId);
  // Bank sync rows are provider records, encoded natively when normalized.
  if (foreign && !isBankSyncAccount) {
    validateForeignImportRows(transactions);
  }

  const updated = [];
  const added = [];
  const updatedPreview = [];
  // Scheduled exchange legs whose amount the import replaces.
  const exchangeReplacements = new Set<string>();
  const existingPayeeMap = new Map<string, string>();

  const {
    payeesToCreate,
    transactionsStep1,
    transactionsStep2,
    transactionsStep3,
  } = await matchTransactions(acctId, transactions, {
    isBankSyncAccount,
    strictIdChecking,
    reimportDeleted,
    payeeNameNormalization,
    amountPrecision,
    foreign,
  });

  // Finally, generate & commit the changes
  for (const step of transactionsStep3) {
    const { trans, subtransactions } = step;
    let { match } = step;
    // A skipped transaction still takes part in the matching above, so the
    // other transactions match the same way as in the import preview. It is
    // not imported or merged.
    if (trans.skipTransaction) {
      continue;
    }

    // Exchange rows (legs and fee rows) keep their date, payee, category and
    // notes whichever pass matched them, and a family with a reconciled row
    // is left alone. A different amount on a fee-free scheduled exchange's
    // leg replaces its estimate; one it cannot take leaves the row unmatched.
    const exchangeRow =
      match && !trans.forceAddTransaction && !match.reconciled
        ? await isExchangeRow(match.id)
        : false;
    // A reconciled family is left alone before any replacement is tried.
    if (exchangeRow && (await exchangeFamilyReconciled(match.id))) {
      updatedPreview.push({ transaction: trans, ignored: true });
      continue;
    }
    let replacement = null;
    if (exchangeRow) {
      const native = foreign ? trans.transaction_amount : trans.amount;
      const stored = foreign ? match.transaction_amount : match.amount;
      if (native != null && native !== stored) {
        replacement = await replaceExchangeTotal(match.id, native);
        if (!replacement && (await isReplaceableExchangeLeg(match.id))) {
          match = null;
        }
      }
    }
    if (match && !trans.forceAddTransaction) {
      // Skip updating already reconciled (locked) transactions
      if (match.reconciled) {
        updatedPreview.push({ transaction: trans, ignored: true });
        continue;
      }
      const keepsDate = exchangeRow;

      // TODO: change the above sql query to use aql
      const existing = {
        ...match,
        cleared: match.cleared === 1,
        date: db.fromDateRepr(match.date),
      };

      // Update the transaction
      const updates = {
        ...(replacement?.status === 'ok' && {
          amount: replacement.write.amount,
          ...(replacement.write.transaction_amount !== undefined && {
            transaction_amount: replacement.write.transaction_amount,
          }),
        }),
        imported_id: trans.imported_id || null,
        payee: exchangeRow
          ? existing.payee
          : existing.payee || trans.payee || null,
        category: exchangeRow
          ? existing.category
          : existing.category || trans.category || null,
        imported_payee: trans.imported_payee || null,
        notes: exchangeRow
          ? existing.notes
          : existing.notes || trans.notes || null,
        cleared: existing.cleared || trans.cleared || false,
        raw_synced_data:
          existing.raw_synced_data ?? trans.raw_synced_data ?? null,
      };

      if (updateDates && trans.date && !keepsDate) {
        updates['date'] = trans.date;
      }

      const fieldsToMarkUpdated = Object.keys(updates).filter(k => {
        // do not mark raw_synced_data if it's gone from falsy to falsy
        if (!existing.raw_synced_data && !trans.raw_synced_data) {
          return k !== 'raw_synced_data';
        }

        return true;
      });

      if (hasFieldsChanged(existing, updates, fieldsToMarkUpdated)) {
        updated.push({ id: existing.id, ...updates });
        if (replacement?.status === 'ok') {
          exchangeReplacements.add(existing.id);
        }
        if (!existingPayeeMap.has(existing.payee)) {
          const payee = await db.getPayee(existing.payee);
          existingPayeeMap.set(existing.payee, payee?.name);
        }
        existing.payee_name = existingPayeeMap.get(existing.payee);
        // The preview shows a foreign account's matched rows in its own units,
        // as the stored native integer (the dialog formats integers at the
        // account's precision).
        existing.amount = foreign
          ? (existing.transaction_amount ?? 0)
          : integerToAmount(existing.amount, getRecordedAmountPrecision());
        updatedPreview.push({ transaction: trans, existing });
      } else {
        updatedPreview.push({ transaction: trans, ignored: true });
      }

      const clearedUpdated = existing.cleared !== updates.cleared;
      const dateUpdated =
        updateDates && trans.date && !keepsDate && existing.date !== trans.date;

      if (existing.is_parent && (clearedUpdated || dateUpdated)) {
        const children = await db.all<Pick<db.DbViewTransaction, 'id'>>(
          'SELECT id FROM v_transactions WHERE parent_id = ?',
          [existing.id],
        );
        const childUpdates = {};

        if (clearedUpdated) {
          childUpdates['cleared'] = updates.cleared;
        }

        if (dateUpdated) {
          childUpdates['date'] = trans.date;
        }

        for (const child of children) {
          updated.push({ id: child.id, ...childUpdates });
        }
      }
    } else if (trans.tombstone) {
      if (isPreview) {
        updatedPreview.push({
          transaction: trans,
          existing: false,
          tombstone: true,
        });
      }
    } else {
      // Insert a new transaction
      const { forceAddTransaction: _forceAddTransaction, ...newTrans } = trans;
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

  // A foreign row without a supplied base gets one from the rate for its
  // final date; any missing rate fails the whole request before writes.
  const previewBases: ReconcileTransactionsResult['previewBases'] = [];
  const missingRates: ReconcileTransactionsResult['missingRates'] = [];
  if (foreign) {
    const missingDates = new Set<string>();
    for (const trans of added) {
      if (trans.amount != null) continue;
      const pair = await computeEntryPair({
        quoteCurrency: foreign.currencyCode,
        nativePrecision: foreign.precision,
        date: trans.date,
        nativeAmount: trans.transaction_amount,
      });
      if (pair.status !== 'ok') {
        missingDates.add(trans.date);
        missingRates.push({ transaction: trans, date: trans.date });
        continue;
      }
      trans.amount = pair.baseAmount;
      previewBases.push({ transaction: trans, baseAmount: pair.baseAmount });
    }
    // A preview reports which rows need a rate (dates after rules).
    if (missingDates.size > 0 && !isPreview) {
      throw new TransactionError(
        `rate-unavailable: ${[...missingDates].sort().join(', ')}`,
      );
    }
  }

  // Maintain the sort order of the server
  const now = Date.now();
  added.forEach((t, index) => {
    t.sort_order ??= now - index * TRANSACTION_SORT_INCREMENT;
  });

  if (!isPreview) {
    // Validate the whole request before creating payees or transactions.
    await preflightTransactionWrites(
      { added, updated },
      { exchangeReplacements },
    );
    await createNewPayees(payeesToCreate, [...added, ...updated]);
    await batchUpdateTransactions({ added, updated, exchangeReplacements });
  }

  logger.log('Debug data for the operations:', {
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
    ...(foreign && { previewBases, missingRates }),
  };
}

/**
 * A foreign account's import rows carry native amounts in
 * `transaction_amount`; a supplied `amount` is the base, kept as given.
 */
function validateForeignImportRows(transactions: TransactionEntity[]) {
  for (const trans of transactions) {
    if (trans.subtransactions?.length || trans.is_parent || trans.is_child) {
      throw new TransactionError('foreign-split-unavailable');
    }
    if (!Number.isSafeInteger(trans.transaction_amount)) {
      // A lone amount is ambiguous: base or native.
      throw new TransactionError('foreign-pair-required');
    }
  }
}

// Ranks fuzzy-match candidates by distance from transaction date, nearest first.
// On a same-distance tie, a candidate that already carries its own imported_id
// (from a previous, unrelated sync) ranks after one that doesn't. Without this
// tie-break, picking the already-imported one would lead the fuzzy match merge
// to silently overwrite imported_id/payee/notes with this transaction's data.
export function compareFuzzyMatchCandidates(
  transactionDate: string,
  a: Pick<db.DbViewTransaction, 'date' | 'imported_id'>,
  b: Pick<db.DbViewTransaction, 'date' | 'imported_id'>,
): number {
  const aDistance = Math.abs(
    dateFns.differenceInMilliseconds(
      dateFns.parseISO(transactionDate),
      dateFns.parseISO(db.fromDateRepr(a.date)),
    ),
  );
  const bDistance = Math.abs(
    dateFns.differenceInMilliseconds(
      dateFns.parseISO(transactionDate),
      dateFns.parseISO(db.fromDateRepr(b.date)),
    ),
  );
  const aHasImportedId = Number(a.imported_id != null);
  const bHasImportedId = Number(b.imported_id != null);
  return aDistance - bDistance || aHasImportedId - bHasImportedId;
}

export async function matchTransactions(
  acctId,
  transactions,
  {
    isBankSyncAccount = false,
    strictIdChecking = true,
    reimportDeleted: reimportDeletedOverride,
    payeeNameNormalization,
    amountPrecision,
    foreign = null,
  }: MatchTransactionsOptions = {},
) {
  logger.log('Performing transaction reconciliation matching');

  const reimportDeleted =
    reimportDeletedOverride !== undefined
      ? reimportDeletedOverride
      : await aqlQuery(
          q('preferences')
            .filter({ id: `sync-reimport-deleted-${acctId}` })
            .select('value'),
        ).then(data => String(data?.data?.[0]?.value ?? 'true') === 'true');

  const hasMatched = new Set();
  const exactMatchedParentIds = new Set<db.DbViewTransaction['id']>();

  const { normalized, payeesToCreate } = isBankSyncAccount
    ? await normalizeBankSyncTransactions(
        transactions,
        acctId,
        foreign?.precision ?? amountPrecision ?? getRecordedAmountPrecision(),
        foreign !== null,
      )
    : await normalizeTransactions(transactions, acctId, {
        payeeNameNormalization,
      });

  // The first pass runs the rules, and preps data for fuzzy matching
  const accounts: db.DbAccount[] = await db.getAccounts();
  const accountsMap = new Map(accounts.map(account => [account.id, account]));
  // An account linked in this batch is not stored yet; rules still need its
  // name, budget status and currency.
  const queued = accountsMap.has(acctId) ? null : queuedAccount(acctId);
  if (queued) {
    accountsMap.set(acctId, queued);
  }

  const transactionsStep1 = [];
  for (const {
    payee_name,
    trans: originalTrans,
    subtransactions,
  } of normalized) {
    // Run the rules
    const trans = await runRules(
      originalTrans,
      accountsMap,
      amountPrecision,
      name => resolvePayee({ payee: null }, name, payeesToCreate),
    );

    // Foreign rows match in their final account (rules may move them within
    // the same encoding) on native amounts.
    const matchAccount = foreign ? trans.account || acctId : acctId;
    if (foreign && matchAccount !== acctId) {
      const moved = accountsMap.get(matchAccount);
      if (
        moved?.currency !== foreign.currencyCode ||
        moved?.currency_precision !== foreign.precision
      ) {
        throw new TransactionError('rule-account-incompatible');
      }
    }
    const matchAmountColumn = foreign ? 'transaction_amount' : 'amount';
    const matchAmount =
      (foreign ? trans.transaction_amount : trans.amount) || 0;

    let match = null;
    let fuzzyDataset = null;

    // First, match with an existing transaction's imported_id. This
    // is the highest fidelity match and should always be attempted
    // first.
    if (trans.imported_id) {
      const table = reimportDeleted
        ? 'v_transactions'
        : 'v_transactions_internal';
      // A live row wins over a deleted one sharing its id, such as a
      // removed exchange fee parent whose id moved to its leg.
      match = await db.first<db.DbTransaction>(
        `SELECT * FROM ${table} WHERE imported_id = ? AND account = ?
           ${reimportDeleted ? '' : 'ORDER BY tombstone'}`,
        [trans.imported_id, matchAccount],
      );

      if (match) {
        hasMatched.add(match.id);

        if (isBankSyncAccount && match.is_parent) {
          exactMatchedParentIds.add(match.id);
        }
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
        fuzzyDataset = await db.all<
          Pick<
            db.DbViewTransaction,
            | 'id'
            | 'is_parent'
            | 'parent_id'
            | 'date'
            | 'imported_id'
            | 'payee'
            | 'imported_payee'
            | 'category'
            | 'notes'
            | 'reconciled'
            | 'cleared'
            | 'amount'
            | 'transaction_amount'
          >
        >(
          `SELECT id, is_parent, parent_id, date, imported_id, payee, imported_payee, category, notes, reconciled, cleared, amount, transaction_amount
          FROM v_transactions
          WHERE
            -- If both ids are set, and we didn't match earlier then skip dedup
            (imported_id IS NULL OR ? IS NULL)
            AND date >= ? AND date <= ? AND ${matchAmountColumn} = ?
            AND account = ?`,
          [
            trans.imported_id || null,
            sevenDaysBefore,
            sevenDaysAfter,
            matchAmount,
            matchAccount,
          ],
        );
      } else {
        fuzzyDataset = await db.all<
          Pick<
            db.DbViewTransaction,
            | 'id'
            | 'is_parent'
            | 'parent_id'
            | 'date'
            | 'imported_id'
            | 'payee'
            | 'imported_payee'
            | 'category'
            | 'notes'
            | 'reconciled'
            | 'cleared'
            | 'amount'
            | 'transaction_amount'
          >
        >(
          `SELECT id, is_parent, parent_id, date, imported_id, payee, imported_payee, category, notes, reconciled, cleared, amount, transaction_amount
          FROM v_transactions
          WHERE date >= ? AND date <= ? AND ${matchAmountColumn} = ? AND account = ?`,
          [sevenDaysBefore, sevenDaysAfter, matchAmount, matchAccount],
        );
      }

      // Sort the matched transactions according to the distance from the original
      // transactions date. i.e. if the original transaction is in 21-02-2024 and
      // the matched transactions are: 20-02-2024, 21-02-2024, 29-02-2024 then
      // the resulting data-set should be: 21-02-2024, 20-02-2024, 29-02-2024.
      fuzzyDataset = fuzzyDataset.sort((a, b) =>
        compareFuzzyMatchCandidates(trans.date, a, b),
      );
    }

    transactionsStep1.push({
      payee_name,
      trans,
      subtransactions: trans.subtransactions || subtransactions,
      match,
      fuzzyDataset,
      matchAccount,
      matchAmount,
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
        row =>
          !hasMatched.has(row.id) &&
          !exactMatchedParentIds.has(row.parent_id) &&
          data.trans.payee === row.payee,
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
  const transactionsStep3Ordinary = transactionsStep2.map(data => {
    if (!data.match && data.fuzzyDataset) {
      const match = data.fuzzyDataset.find(
        row =>
          !hasMatched.has(row.id) && !exactMatchedParentIds.has(row.parent_id),
      );
      if (match) {
        hasMatched.add(match.id);
        return { ...data, match };
      }
    }
    return data;
  });

  // A row still unmatched may confirm the estimate of a scheduled exchange
  // (replaced in reconcileTransactions). Its whole family is reserved.
  const transactionsStep3 = [];
  for (const data of transactionsStep3Ordinary) {
    const found =
      !data.match && !data.trans.tombstone
        ? await findScheduledExchange({
            account: data.matchAccount,
            date: data.trans.date,
            native: data.matchAmount,
            schedule: data.trans.schedule,
            payee: data.trans.payee,
            reserved: hasMatched,
          })
        : null;
    if (found) {
      hasMatched.add(found.legId);
      hasMatched.add(found.otherId);
      const match = await db.first<db.DbViewTransaction>(
        'SELECT * FROM v_transactions WHERE id = ?',
        [found.legId],
      );
      transactionsStep3.push({ ...data, match });
    } else {
      transactionsStep3.push(data);
    }
  }

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
    { payeeNameNormalization: 'original' },
  );

  const accounts: db.DbAccount[] = await db.getAccounts();
  const accountsMap = new Map(accounts.map(account => [account.id, account]));

  for (const { trans: originalTrans, subtransactions } of normalized) {
    // Run the rules; payees they name are staged, not created yet.
    const trans = await runRules(originalTrans, accountsMap, undefined, name =>
      resolvePayee({ payee: null }, name, payeesToCreate),
    );

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

  // Validate the whole request before creating payees or transactions.
  await preflightTransactionWrites({ added });
  await createNewPayees(payeesToCreate, added);

  // Assign decreasing sort_order values to preserve import file order.
  // Transactions are displayed in sort_order DESC order, so first transaction
  // in the file should have the highest sort_order.
  const now = Date.now();
  added.forEach((t, index) => {
    t.sort_order ??= now - index * TRANSACTION_SORT_INCREMENT;
  });

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

export function encodeBankAmount(
  value: string,
  amountPrecision: number,
): number {
  if (typeof value !== 'string' || value.length > 32) {
    throw new Error('Invalid bank amount');
  }
  let encoded: number;
  try {
    encoded = rescaleDecimalAmount(value, amountPrecision);
  } catch {
    throw new Error('Invalid bank amount');
  }
  if (!Number.isSafeInteger(encoded) || Math.abs(encoded) > MAX_SAFE_NUMBER) {
    throw new Error('Invalid bank amount');
  }
  return encoded;
}

export function encodeStartingBalance(
  currentBalance: string,
  transactions: Array<{ transactionAmount: { amount: string } }>,
  amountPrecision: number,
): number {
  const previousBalance = transactions.reduce(
    (total, trans) =>
      total -
      BigInt(encodeBankAmount(trans.transactionAmount.amount, amountPrecision)),
    BigInt(encodeBankAmount(currentBalance, amountPrecision)),
  );
  const result = Number(previousBalance);
  if (!Number.isSafeInteger(result) || Math.abs(result) > MAX_SAFE_NUMBER) {
    throw new Error('Invalid bank balance');
  }
  return result;
}

/** Dates listed by a `rate-unavailable` failure, or null for other errors. */
export function rateUnavailableDates(err: unknown): string[] | null {
  const prefix = 'rate-unavailable: ';
  if (!(err instanceof TransactionError) || !err.message.startsWith(prefix)) {
    return null;
  }
  return err.message.slice(prefix.length).split(', ');
}

export async function processBankSyncDownload(
  download,
  id,
  acctRow,
  initialSync = false,
  customStartingBalance?: number,
  customStartingDate?: string,
  /** Set when the caller already holds the mutator and an open batch. */
  { inMutator = false }: { inMutator?: boolean } = {},
) {
  // Read before any wait: the balance is decoded in this encoding.
  const decodedIn = await storedEncoding(id);
  const foreign = await foreignAccountCurrency(id);
  if (foreign) {
    return processForeignBankSyncDownload(
      download,
      id,
      acctRow,
      foreign,
      decodedIn,
      customStartingBalance,
      customStartingDate,
      inMutator,
    );
  }
  const amountPrecision = getRecordedAmountPrecision();
  // If syncing an account from sync source it must not use strictIdChecking. This allows
  // the fuzzy search to match transactions where the import IDs are different. It is a known quirk
  // that account sync sources can give two different transaction IDs even though it's the same transaction.
  const useStrictIdChecking = !acctRow.account_sync_source;

  const importTransactions = await aqlQuery(
    q('preferences')
      .filter({ id: `sync-import-transactions-${id}` })
      .select('value'),
  ).then(data => String(data?.data?.[0]?.value ?? 'true') === 'true');

  const updateDates = await aqlQuery(
    q('preferences')
      .filter({ id: `sync-update-dates-${id}` })
      .select('value'),
  ).then(data => String(data?.data?.[0]?.value ?? 'false') === 'true');

  /** Starting balance is actually the current balance of the account. */
  const {
    transactions: originalTransactions,
    startingBalance: currentBalance,
  } = download;

  if (initialSync) {
    const { transactions } = download;
    let balanceToUse = encodeStartingBalance(
      currentBalance,
      [],
      amountPrecision,
    );

    // Use custom starting balance if provided, otherwise calculate it
    if (customStartingBalance !== undefined) {
      balanceToUse = customStartingBalance;
    } else if (acctRow.account_sync_source === 'simpleFin') {
      balanceToUse = encodeStartingBalance(
        currentBalance,
        transactions,
        amountPrecision,
      );
    } else if (acctRow.account_sync_source === 'pluggyai') {
      balanceToUse = encodeStartingBalance(
        currentBalance,
        transactions,
        amountPrecision,
      );
    } else if (acctRow.account_sync_source === 'enableBanking') {
      const importPending = await aqlQuery(
        q('preferences')
          .filter({ id: `sync-import-pending-${id}` })
          .select('value'),
      ).then(data => String(data?.data?.[0]?.value ?? 'true') === 'true');
      const importable = importPending
        ? transactions
        : transactions.filter(trans => Boolean(trans.booked));
      balanceToUse = encodeStartingBalance(
        currentBalance,
        importable,
        amountPrecision,
      );
    } else if (acctRow.account_sync_source === 'akahu') {
      balanceToUse = encodeStartingBalance(
        currentBalance,
        transactions,
        amountPrecision,
      );
    }

    const oldestTransaction = transactions[transactions.length - 1];

    // Use custom starting date if provided, otherwise use oldest transaction date or current day
    let startingBalanceDate: string;
    if (customStartingDate) {
      startingBalanceDate = customStartingDate;
    } else if (transactions.length > 0) {
      startingBalanceDate = oldestTransaction.date;
    } else {
      startingBalanceDate = monthUtils.currentDay();
    }

    return runMutator(async () => {
      // Created under the mutator so it never joins a foreign sync's batch.
      const payee = await getStartingBalancePayee();
      const initialId = await db.insertTransaction({
        account: id,
        amount: balanceToUse,
        category: acctRow.offbudget === 0 ? payee.category : null,
        payee: payee.id,
        date: startingBalanceDate,
        cleared: true,
        starting_balance_flag: true,
      });

      const result = await reconcileTransactions(id, transactions, {
        isBankSyncAccount: true,
        strictIdChecking: useStrictIdChecking,
        updateDates,
        amountPrecision,
      });
      return {
        ...result,
        added: [initialId, ...result.added],
      };
    });
  }

  const transactions = originalTransactions.map(trans => ({
    ...trans,
    account: id,
  }));

  return runMutator(async () => {
    const result = await reconcileTransactions(
      id,
      importTransactions ? transactions : [],
      {
        isBankSyncAccount: true,
        strictIdChecking: useStrictIdChecking,
        updateDates,
      },
    );

    if (currentBalance != null) {
      await updateAccountBalance(
        id,
        encodeBankAmount(currentBalance, amountPrecision),
        decodedIn,
      );
    }

    return result;
  });
}

async function readSyncPreference(
  id: AccountEntity['id'],
  name: string,
  defaultValue: 'true' | 'false',
) {
  const data = await aqlQuery(
    q('preferences')
      .filter({ id: `${name}-${id}` })
      .select('value'),
  );
  return String(data?.data?.[0]?.value ?? defaultValue) === 'true';
}

/**
 * A foreign account's download is written in one batch: provider rows in
 * another currency are skipped, amounts are native at the account's
 * precision, and a missing rate or starting balance writes nothing.
 */
async function processForeignBankSyncDownload(
  download,
  id: AccountEntity['id'],
  acctRow,
  foreign: { currencyCode: string; precision: number },
  decodedIn: string,
  customStartingBalance?: number,
  customStartingDate?: string,
  inMutator = false,
) {
  const { currencyCode, precision } = foreign;
  const useStrictIdChecking = !acctRow.account_sync_source;
  const importTransactions = await readSyncPreference(
    id,
    'sync-import-transactions',
    'true',
  );
  const updateDates = await readSyncPreference(
    id,
    'sync-update-dates',
    'false',
  );

  const downloaded = download.transactions ?? [];
  const transactions = downloaded
    .filter(trans => {
      const currency = trans.transactionAmount?.currency;
      return !currency || currency === currencyCode;
    })
    .map(trans => ({ ...trans, account: id }));
  const currencyMismatches = downloaded.length - transactions.length;
  // Opening-balance arithmetic uses the rows that will be imported.
  const importPending = await readSyncPreference(
    id,
    'sync-import-pending',
    'true',
  );
  const importable = importPending
    ? transactions
    : transactions.filter(trans => Boolean(trans.booked));
  const currentBalance = providerCurrentBalance(
    download,
    acctRow,
    currencyCode,
  );

  const run = inMutator
    ? (func: () => Promise<void>) => func()
    : (func: () => Promise<void>) => runMutator(func);
  let result: ReconcileTransactionsResult;
  await run(() =>
    batchMessages(async () => {
      // Decided under the mutator: an earlier link or sync may have written
      // the opening balance since the download.
      // Any stored row counts, including a future-dated opening balance.
      const initialSync =
        (
          await aqlQuery(
            q('transactions').filter({ account: id }).select('id').limit(1),
          )
        ).data.length === 0;
      if (!initialSync) {
        result = await reconcileTransactions(
          id,
          importTransactions ? transactions : [],
          {
            isBankSyncAccount: true,
            strictIdChecking: useStrictIdChecking,
            updateDates,
          },
        );
        if (download.startingBalance != null || download.accountBalance) {
          // A balance in another currency is never cached.
          await updateAccountBalance(
            id,
            currentBalance !== null
              ? encodeBankAmount(currentBalance, precision)
              : null,
            decodedIn,
          );
        }
        return;
      }

      const balance = foreignStartingBalance(
        download,
        acctRow,
        importable,
        foreign,
        customStartingBalance,
      );
      const startingBalanceDate =
        customStartingDate ??
        oldestRow(importable)?.date ??
        monthUtils.currentDay();

      const missingDates = new Set<string>();
      let initialId = null;
      const pair = await computeEntryPair({
        quoteCurrency: currencyCode,
        nativePrecision: precision,
        date: startingBalanceDate,
        nativeAmount: balance,
      });
      if (pair.status === 'ok') {
        const payee = await getStartingBalancePayee();
        initialId = await db.insertTransaction({
          account: id,
          amount: pair.baseAmount,
          transaction_amount: pair.nativeAmount,
          category: acctRow.offbudget === 0 ? payee.category : null,
          payee: payee.id,
          date: startingBalanceDate,
          cleared: true,
          starting_balance_flag: true,
        });
      } else {
        missingDates.add(startingBalanceDate);
      }

      let reconciled: ReconcileTransactionsResult = {
        added: [],
        updated: [],
        updatedPreview: [],
      };
      try {
        reconciled = await reconcileTransactions(id, transactions, {
          isBankSyncAccount: true,
          strictIdChecking: useStrictIdChecking,
          updateDates,
        });
      } catch (err) {
        const dates = rateUnavailableDates(err);
        if (!dates) throw err;
        dates.forEach(date => missingDates.add(date));
      }
      if (missingDates.size > 0) {
        throw new TransactionError(
          `rate-unavailable: ${[...missingDates].sort().join(', ')}`,
        );
      }
      result = { ...reconciled, added: [initialId, ...reconciled.added] };
    }),
  );
  return { ...result, currencyMismatches };
}

// ponytail: fixed preference order across providers' balance types; make it
// per provider if a bank reports several usable balances in one currency.
const BALANCE_TYPE_PREFERENCE = [
  'CLAV',
  'closingBooked',
  'expected',
  'interimBooked',
  'interimAvailable',
  'forwardAvailable',
];

/**
 * The provider's current balance in the account currency: the reported
 * balance when labelled with that currency (GoCardless reports an opening
 * balance there instead), or a listed balance in it.
 */
function providerCurrentBalance(
  download,
  acctRow,
  currencyCode: string,
): string | null {
  if (
    acctRow.account_sync_source !== 'goCardless' &&
    download.startingBalance != null &&
    download.startingBalanceCurrency === currencyCode
  ) {
    return download.startingBalance;
  }
  const balances: Array<{
    balanceType?: string;
    balanceAmount?: { amount?: string; currency?: string | null };
  }> = download.accountBalance ?? [];
  const matching = balances
    .filter(
      balance =>
        balance.balanceAmount?.amount != null &&
        balance.balanceAmount.currency === currencyCode,
    )
    .sort(
      (a, b) =>
        rank(BALANCE_TYPE_PREFERENCE.indexOf(a.balanceType ?? '')) -
        rank(BALANCE_TYPE_PREFERENCE.indexOf(b.balanceType ?? '')),
    );
  if (matching.length > 0) {
    return matching[0].balanceAmount.amount;
  }
  return null;
}

/**
 * The earliest provider row by date. Providers differ in order (Enable
 * Banking keeps page order), so the position in the list is not used; on a
 * tie the later row in the list is taken, matching newest-first providers.
 */
function oldestRow(rows) {
  return rows.reduce(
    (oldest, row) =>
      oldest === undefined || (row.date ?? '') <= (oldest.date ?? '')
        ? row
        : oldest,
    undefined,
  );
}

function rank(index: number) {
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

/**
 * The first sync's native starting balance: the dialog's value, a provider
 * balance in the account currency, or the oldest imported transaction's
 * balance-after value in the account currency.
 */
function foreignStartingBalance(
  download,
  acctRow,
  importable,
  { currencyCode, precision }: { currencyCode: string; precision: number },
  customStartingBalance?: number,
): number {
  if (customStartingBalance !== undefined) {
    return customStartingBalance;
  }
  // GoCardless reports the opening balance itself when its balances agree.
  if (
    acctRow.account_sync_source === 'goCardless' &&
    download.startingBalance != null &&
    download.startingBalanceCurrency === currencyCode
  ) {
    return encodeBankAmount(download.startingBalance, precision);
  }
  // Otherwise the imported rows are subtracted from the current balance.
  const current = providerCurrentBalance(download, acctRow, currencyCode);
  if (current !== null) {
    return encodeStartingBalance(current, importable, precision);
  }
  const oldest = earliestByBalance(importable, currencyCode, precision);
  const after = oldest?.balanceAfterTransaction?.balanceAmount;
  if (after?.amount != null && after.currency === currencyCode) {
    return encodeStartingBalance(after.amount, [oldest], precision);
  }
  throw new TransactionError('balance-unavailable');
}

/**
 * The first row of the earliest day, by balance-after continuity: providers
 * differ in order, so within a day the first row is the one whose balance
 * before it is no other same-day row's balance after. Ambiguous days yield
 * nothing rather than a guess.
 */
function earliestByBalance(rows, currencyCode: string, precision: number) {
  const first = oldestRow(rows);
  if (!first) return undefined;
  const sameDay = rows.filter(row => row.date === first.date);
  if (sameDay.length === 1) return first;
  const after = row => {
    const balance = row.balanceAfterTransaction?.balanceAmount;
    return balance?.amount != null && balance.currency === currencyCode
      ? encodeBankAmount(balance.amount, precision)
      : null;
  };
  if (sameDay.some(row => after(row) === null)) return undefined;
  const afters = new Set(sameDay.map(after));
  const starts = sameDay.filter(
    row =>
      !afters.has(
        after(row) - encodeBankAmount(row.transactionAmount.amount, precision),
      ),
  );
  return starts.length === 1 ? starts[0] : undefined;
}

/** Downloads an account's provider data; the account may not be stored yet. */
export async function downloadBankSyncAccount(
  syncSource: AccountEntity['account_sync_source'],
  {
    userId,
    userKey,
    id,
    acctId,
    bankId,
    customStartingDate,
    fileId,
  }: {
    userId: string | undefined;
    userKey: string | undefined;
    id: AccountEntity['id'];
    acctId: string;
    bankId: string | undefined;
    customStartingDate?: string;
    fileId?: string;
  },
) {
  const syncStartDate =
    customStartingDate ?? (await getAccountSyncStartDate(id));
  const oldestTransaction = await getAccountOldestTransaction(id);
  const newAccount = oldestTransaction == null;

  let download;
  if (syncSource === 'simpleFin') {
    download = await downloadSimpleFinTransactions(
      acctId,
      syncStartDate,
      fileId,
    );
  } else if (syncSource === 'pluggyai') {
    download = await downloadPluggyAiTransactions(
      acctId,
      syncStartDate,
      fileId,
    );
  } else if (syncSource === 'akahu') {
    download = await downloadAkahuTransactions(acctId, syncStartDate);
  } else if (syncSource === 'goCardless') {
    download = await downloadGoCardlessTransactions(
      userId,
      userKey,
      acctId,
      bankId,
      syncStartDate,
      newAccount,
    );
  } else if (syncSource === 'enableBanking') {
    // A stored account names its bank row; a new link only has the bank id.
    const acctRow = await db.first<Pick<db.DbAccount, 'bank'>>(
      'SELECT bank FROM accounts WHERE id = ?',
      [id],
    );
    const bankRow = acctRow?.bank
      ? await db.first<Pick<db.DbBank, 'name'>>(
          'SELECT name FROM banks WHERE id = ?',
          [acctRow.bank],
        )
      : bankId
        ? await db.first<Pick<db.DbBank, 'name'>>(
            'SELECT name FROM banks WHERE bank_id = ? AND tombstone = 0',
            [bankId],
          )
        : null;
    download = await downloadEnableBankingTransactions(
      acctId,
      syncStartDate,
      bankRow?.name,
    );
  } else {
    throw new Error(`Unrecognized bank-sync provider: ${String(syncSource)}`);
  }
  return { download, newAccount };
}

export async function syncAccount(
  userId: string | undefined,
  userKey: string | undefined,
  id: string,
  acctId: string,
  bankId: string,
  customStartingDate?: string,
  customStartingBalance?: number,
  fileId?: string,
) {
  const acctRow = await db.select('accounts', id);
  const { download, newAccount } = await downloadBankSyncAccount(
    acctRow.account_sync_source,
    { userId, userKey, id, acctId, bankId, customStartingDate, fileId },
  );

  return processBankSyncDownload(
    download,
    id,
    acctRow,
    newAccount,
    customStartingBalance,
    customStartingDate,
  );
}

export async function simpleFinBatchSync(
  accounts: Array<Pick<AccountEntity, 'id' | 'account_id'>>,
  fileId?: string,
) {
  const startDates = await Promise.all(
    accounts.map(async a => getAccountSyncStartDate(a.id)),
  );

  const res = await downloadSimpleFinTransactions(
    accounts.map(a => a.account_id),
    startDates,
    fileId,
  );

  if (!res) {
    return accounts.map(account => ({
      accountId: account.id,
      res: {
        error_type: 'NO_DATA',
        error_code: 'NO_DATA',
      },
    }));
  }

  const promises = [];
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const download = res[account.account_id];

    if (!download || Object.keys(download).length === 0) {
      promises.push(
        Promise.resolve({
          accountId: account.id,
          res: {
            error_type: 'ACCOUNT_MISSING',
            error_code: 'ACCOUNT_MISSING',
          },
        }),
      );
      continue;
    }

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

    if (!download.transactions) {
      promises.push(
        Promise.resolve({
          accountId: account.id,
          res: {
            error_type: 'ACCOUNT_MISSING',
            error_code: 'ACCOUNT_MISSING',
          },
        }),
      );
      continue;
    }

    promises.push(
      processBankSyncDownload(download, account.id, acctRow, newAccount)
        .then(res => ({
          accountId: account.id,
          res,
        }))
        .catch(err => ({
          accountId: account.id,
          res: {
            error_type: err?.category || 'INTERNAL_ERROR',
            error_code: err?.code || 'INTERNAL_ERROR',
            // Typed failures (a missing rate or balance) keep their details.
            ...(err instanceof TransactionError && { error: err }),
          },
        })),
    );
  }

  return await Promise.all(promises);
}
