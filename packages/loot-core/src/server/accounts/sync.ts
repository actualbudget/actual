// @ts-strict-ignore
import * as dateFns from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import * as asyncStorage from '#platform/server/asyncStorage';
import { logger } from '#platform/server/log';
import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { TRANSACTION_SORT_INCREMENT } from '#server/db/sort';
import { TransactionError } from '#server/errors';
import { runMutator } from '#server/mutators';
import { post } from '#server/post';
import { getServer } from '#server/server-config';
import { batchMessages } from '#server/sync';
import { batchUpdateTransactions } from '#server/transactions';
import { runRules } from '#server/transactions/transaction-rules';
import {
  defaultMappings,
  mappingsFromString,
} from '#server/util/custom-sync-mapping';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import {
  makeChild as makeChildTransaction,
  recalculateSplit,
} from '#shared/transactions';
import {
  amountToInteger,
  hasFieldsChanged,
  integerToAmount,
} from '#shared/util';
import type {
  AccountEntity,
  BankSyncResponse,
  TransactionEntity,
} from '#types/models';

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

export function deduplicateSubsourceTransactions<
  T extends {
    date?: string;
    payeeName?: string;
    payee?: string;
    amount?: number | string;
    transactionAmount?: { amount: number | string };
  },
>(transactions: T[]): T[] {
  if (!transactions || transactions.length === 0) return [];

  // Group transactions by date and payee
  const groups = new Map<string, T[]>();

  for (const trans of transactions) {
    const date = trans.date || '';
    const payee = (trans.payeeName || trans.payee || '').trim().toLowerCase();
    const key = `${date}___${payee}`;

    const list = groups.get(key);
    if (list) {
      list.push(trans);
    } else {
      groups.set(key, [trans]);
    }
  }

  const toDrop = new Set<T>();

  for (const [, group] of groups) {
    if (group.length <= 1) continue;

    // Parse amounts in cents
    const parsed = group.map(t => {
      const raw = t.amount ?? t.transactionAmount?.amount ?? 0;
      const num = amountToInteger(
        typeof raw === 'number' ? raw : Number(raw) || 0,
      );
      return { trans: t, intAmount: num };
    });

    const allPositive = parsed.every(p => p.intAmount > 0);
    if (!allPositive) continue;

    // Find the maximum amount in this group
    let maxItem = parsed[0];
    for (const p of parsed) {
      if (p.intAmount > maxItem.intAmount) {
        maxItem = p;
      }
    }

    const hasSmallerSubsources = parsed.some(
      p => p.intAmount < maxItem.intAmount,
    );
    const hasDuplicateAmounts = parsed.some((p, i) =>
      parsed.some((other, j) => i !== j && p.intAmount === other.intAmount),
    );

    if (hasSmallerSubsources || hasDuplicateAmounts) {
      let keptMax = false;
      for (const p of parsed) {
        if (p.intAmount === maxItem.intAmount && !keptMax) {
          keptMax = true;
        } else {
          toDrop.add(p.trans);
        }
      }
    }
  }

  return transactions.filter(t => !toDrop.has(t));
}

async function updateAccountBalance(id: AccountEntity['id'], balance: number) {
  await db.update('accounts', { id, balance_current: balance });
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
    } = res;

    logger.log('Response:', res);

    return {
      transactions: all,
      accountBalance: balances,
      startingBalance,
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
      },
      // 5 minute timeout for batch sync, one minute for individual accounts
      Array.isArray(acctId) ? 300000 : 60000,
    );
  } catch (error) {
    logger.error('Suspected timeout during bank sync:', error);
    throw BankSyncError('TIMED_OUT', 'TIMED_OUT');
  }

  logger.log('SimpleFin Response:', JSON.stringify(res, null, 2));

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
            startingBalance: 0,
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
  };

  logger.log('Response:', retVal);
  return retVal;
}

async function downloadEnableBankingTransactions(
  acctId: string,
  since: string,
) {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) return;

  logger.log('Pulling transactions from Enable Banking');

  const res = await post(
    getServer().ENABLEBANKING_SERVER + '/transactions',
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

async function downloadAutohubAssetValue(id: string, acctId: string) {
  if (!acctId) {
    throw BankSyncError('ACCOUNT_MISSING', 'ACCOUNT_MISSING');
  }

  let vin = acctId;
  let mileage: string | null = null;

  // Fallback to legacy format: check if account_id contains a pipe
  if (acctId.includes('|')) {
    const parts = acctId.split('|');
    vin = parts[0];
    mileage = parts[1];
  }

  // Retrieve the latest mileage from notes table
  const noteRow = await db.first<{ note: string }>(
    'SELECT note FROM notes WHERE id = ?',
    [`mileage-${id}`],
  );
  if (noteRow?.note) {
    const parts = noteRow.note.split('|');
    const parsedMileage = parseInt(parts[0], 10);
    if (!isNaN(parsedMileage)) {
      mileage = String(parsedMileage);
    }
  }

  if (!vin) {
    throw BankSyncError(
      'Configuration',
      'Invalid asset configuration: Missing VIN',
    );
  }
  if (!mileage) {
    throw BankSyncError(
      'Configuration',
      'Invalid asset configuration: Missing Mileage. Please set mileage on the account page first.',
    );
  }

  const apiKeyRow = await db.first<{ value: string }>(
    'SELECT value FROM preferences WHERE id = ?',
    ['autohubApiKey'],
  );
  const apiKey = apiKeyRow?.value;

  if (!apiKey) {
    throw BankSyncError('Configuration', 'Autohub API key is not configured');
  }

  logger.log(`Pulling asset value from Autohub for VIN ${vin}`);

  const serverConfig = getServer();
  let url: string;

  if (serverConfig) {
    url = `${serverConfig.BASE_SERVER}/autohub/depreciation?vin=${encodeURIComponent(vin)}&mileage=${encodeURIComponent(mileage)}`;
  } else {
    // Note: Calling RapidAPI directly in the browser will likely fail due to CORS and multiple endpoints.
    // We require a sync server for this integration.
    throw BankSyncError(
      'Configuration',
      'A Sync Server is required to securely fetch Autohub data',
    );
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
      },
    });

    if (!res.ok) {
      throw BankSyncError('API_ERROR', `Autohub returned ${res.status}`);
    }

    const data = await res.json();

    // Autohub proxy returns: body: { depreciation_data: [ { private_party_value: 12345 } ] }
    const depreciationData = data?.body?.depreciation_data;
    if (!depreciationData || !depreciationData.length) {
      throw BankSyncError(
        'API_ERROR',
        'No depreciation data returned from Autohub',
      );
    }

    // Get the current year's private party value (first item in the array)
    const currentValue = depreciationData[0].private_party_value;
    if (typeof currentValue !== 'number') {
      throw BankSyncError('API_ERROR', 'Invalid value returned from Autohub');
    }

    // Convert to cents for Actual Budget
    const currentResaleValue = Math.round(currentValue * 100);

    const balanceResult = await db.first<{ balance: number }>(
      'SELECT sum(amount) as balance FROM transactions WHERE acct = ? AND isParent = 0 AND tombstone = 0',
      [id],
    );
    const currentBalance = balanceResult?.balance || 0;

    const adjustment = currentResaleValue - currentBalance;

    const transactions = [];

    // If there is an existing balance, create an adjustment transaction
    if (currentBalance !== 0 && adjustment !== 0) {
      transactions.push({
        date: monthUtils.currentDay(),
        payeeName: 'Autohub Value Adjustment',
        amount: integerToAmount(adjustment),
        cleared: true,
      });
    }

    return {
      transactions,
      accountBalance: [],
      startingBalance: currentResaleValue,
    };
  } catch (error) {
    logger.error('Failed to pull from Autohub', error);
    throw BankSyncError('Connection', 'Failed to connect to Autohub API');
  }
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

async function normalizeBankSyncTransactions(transactions, acctId) {
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

    if (!trans.amount) {
      trans.amount = trans.transactionAmount.amount;
    }

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

    normalized.push({
      payee_name: payeeName,
      trans: {
        amount: amountToInteger(trans.amount),
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
};

export type ReconcileTransactionsOptions = MatchTransactionsOptions & {
  isPreview?: boolean;
  defaultCleared?: boolean;
  updateDates?: boolean;
};

export type ReconcileTransactionsResult = {
  added: string[];
  updated: string[];
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
  }: ReconcileTransactionsOptions = {},
): Promise<ReconcileTransactionsResult> {
  logger.log('Performing transaction reconciliation');

  const updated = [];
  const added = [];
  const updatedPreview = [];
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
  });

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
        cleared: existing.cleared || trans.cleared || false,
        raw_synced_data:
          existing.raw_synced_data ?? trans.raw_synced_data ?? null,
      };

      if (updateDates && trans.date) {
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

      const clearedUpdated = existing.cleared !== updates.cleared;
      const dateUpdated =
        updateDates && trans.date && existing.date !== trans.date;

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

  // Maintain the sort order of the server
  const now = Date.now();
  added.forEach((t, index) => {
    t.sort_order ??= now - index * TRANSACTION_SORT_INCREMENT;
  });

  if (!isPreview) {
    await createNewPayees(payeesToCreate, [...added, ...updated]);
    await batchUpdateTransactions({ added, updated });
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
  };
}

export async function matchTransactions(
  acctId,
  transactions,
  {
    isBankSyncAccount = false,
    strictIdChecking = true,
    reimportDeleted: reimportDeletedOverride,
    payeeNameNormalization,
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

  const { normalized, payeesToCreate } = isBankSyncAccount
    ? await normalizeBankSyncTransactions(transactions, acctId)
    : await normalizeTransactions(transactions, acctId, {
        payeeNameNormalization,
      });

  // The first pass runs the rules, and preps data for fuzzy matching
  const accounts: db.DbAccount[] = await db.getAccounts();
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
      const table = reimportDeleted
        ? 'v_transactions'
        : 'v_transactions_internal';
      match = await db.first<db.DbTransaction>(
        `SELECT * FROM ${table} WHERE imported_id = ? AND account = ?`,
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
        fuzzyDataset = await db.all<
          Pick<
            db.DbViewTransaction,
            | 'id'
            | 'is_parent'
            | 'date'
            | 'imported_id'
            | 'payee'
            | 'imported_payee'
            | 'category'
            | 'notes'
            | 'reconciled'
            | 'cleared'
            | 'amount'
          >
        >(
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
        fuzzyDataset = await db.all<
          Pick<
            db.DbViewTransaction,
            | 'id'
            | 'is_parent'
            | 'date'
            | 'imported_id'
            | 'payee'
            | 'imported_payee'
            | 'category'
            | 'notes'
            | 'reconciled'
            | 'cleared'
            | 'amount'
          >
        >(
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
    { payeeNameNormalization: 'original' },
  );

  const accounts: db.DbAccount[] = await db.getAccounts();
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

async function processBankSyncDownload(
  download,
  id,
  acctRow,
  initialSync = false,
  customStartingBalance?: number,
  customStartingDate?: string,
) {
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

  const dedupSubsources = await aqlQuery(
    q('preferences')
      .filter({ id: `sync-dedup-subsources-${id}` })
      .select('value'),
  ).then(data => String(data?.data?.[0]?.value ?? 'false') === 'true');

  const autoReconcile = await aqlQuery(
    q('preferences')
      .filter({ id: `sync-auto-reconcile-${id}` })
      .select('value'),
  ).then(data => String(data?.data?.[0]?.value ?? 'false') === 'true');

  /** Starting balance is actually the current balance of the account. */
  const { startingBalance: currentBalance } = download;
  let originalTransactions = download.transactions;

  if (dedupSubsources && originalTransactions) {
    originalTransactions =
      deduplicateSubsourceTransactions(originalTransactions);
  }

  if (initialSync) {
    const transactions =
      dedupSubsources && download.transactions
        ? deduplicateSubsourceTransactions(download.transactions)
        : download.transactions;
    let balanceToUse = currentBalance;

    // Use custom starting balance if provided, otherwise calculate it
    if (customStartingBalance !== undefined) {
      balanceToUse = customStartingBalance;
    } else if (acctRow.account_sync_source === 'simpleFin') {
      const previousBalance = transactions.reduce((total, trans) => {
        return (
          total - parseInt(trans.transactionAmount.amount.replace('.', ''))
        );
      }, currentBalance);
      balanceToUse = previousBalance;
    } else if (acctRow.account_sync_source === 'pluggyai') {
      const currentBalance = download.startingBalance;
      const previousBalance = transactions.reduce(
        (total, trans) => total - trans.transactionAmount.amount * 100,
        currentBalance,
      );
      balanceToUse = Math.round(previousBalance);
    } else if (acctRow.account_sync_source === 'enableBanking') {
      const importPending = await aqlQuery(
        q('preferences')
          .filter({ id: `sync-import-pending-${id}` })
          .select('value'),
      ).then(data => String(data?.data?.[0]?.value ?? 'true') === 'true');
      const importable = importPending
        ? transactions
        : transactions.filter(trans => Boolean(trans.booked));
      const previousBalance = importable.reduce((total, trans) => {
        return total - amountToInteger(trans.transactionAmount.amount);
      }, currentBalance);
      balanceToUse = previousBalance;
    } else if (acctRow.account_sync_source === 'akahu') {
      const currentBalance = download.startingBalance;
      const previousBalance = transactions.reduce(
        (total, trans) =>
          total - amountToInteger(trans.transactionAmount.amount),
        currentBalance,
      );
      balanceToUse = Math.round(previousBalance);
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

    const payee = await getStartingBalancePayee();

    return runMutator(async () => {
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

    if (autoReconcile && currentBalance != null) {
      const balanceRow = await db.first<{ balance: number | null }>(
        'SELECT SUM(amount) as balance FROM v_transactions_internal_alive WHERE account = ?',
        [id],
      );
      const currentLedgerBalance = balanceRow?.balance ?? 0;
      const diff = currentBalance - currentLedgerBalance;

      // Safety check: do not auto-reconcile if bank reports 0 on an account with balance > $1,000
      const isGlitch = currentBalance === 0 && currentLedgerBalance > 100000;

      if (!isGlitch && diff !== 0) {
        let payee = await db.first<db.DbPayee>(
          'SELECT * FROM payees WHERE name = ? AND tombstone = 0',
          ['Market Fluctuation'],
        );
        if (!payee) {
          const payeeId = await db.insertPayee({ name: 'Market Fluctuation' });
          payee = { id: payeeId, name: 'Market Fluctuation' } as db.DbPayee;
        }

        const adjustmentId = await db.insertTransaction({
          account: id,
          amount: diff,
          date: monthUtils.currentDay(),
          payee: payee.id,
          notes: 'Automatic market value adjustment from bank sync',
          cleared: true,
          reconciled: true,
        });

        result.added = [adjustmentId, ...result.added];
      }
    }

    if (currentBalance != null) {
      await updateAccountBalance(id, currentBalance);
    }

    return result;
  });
}

export async function syncAccount(
  userId: string | undefined,
  userKey: string | undefined,
  id: string,
  acctId: string,
  bankId?: string | null,
  customStartingDate?: string,
  customStartingBalance?: number,
  fileId?: string,
) {
  const acctRow = await db.select('accounts', id);

  const syncStartDate =
    customStartingDate ?? (await getAccountSyncStartDate(id));
  const oldestTransaction = await getAccountOldestTransaction(id);
  const newAccount = oldestTransaction == null;

  let download;
  if (acctRow.account_sync_source === 'simpleFin') {
    download = await downloadSimpleFinTransactions(acctId, syncStartDate);
  } else if (acctRow.account_sync_source === 'pluggyai') {
    download = await downloadPluggyAiTransactions(
      acctId,
      syncStartDate,
      fileId,
    );
  } else if (acctRow.account_sync_source === 'akahu') {
    download = await downloadAkahuTransactions(acctId, syncStartDate);
  } else if (acctRow.account_sync_source === 'goCardless') {
    download = await downloadGoCardlessTransactions(
      userId,
      userKey,
      acctId,
      bankId,
      syncStartDate,
      newAccount,
    );
  } else if (acctRow.account_sync_source === 'enableBanking') {
    download = await downloadEnableBankingTransactions(acctId, syncStartDate);
  } else if (acctRow.account_sync_source === 'autohub') {
    download = await downloadAutohubAssetValue(id, acctId);
  } else {
    throw new Error(
      `Unrecognized bank-sync provider: ${acctRow.account_sync_source}`,
    );
  }

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
) {
  const startDates = await Promise.all(
    accounts.map(async a => getAccountSyncStartDate(a.id)),
  );

  const res = await downloadSimpleFinTransactions(
    accounts.map(a => a.account_id),
    startDates,
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
          },
        })),
    );
  }

  return await Promise.all(promises);
}
