import { v4 as uuidv4 } from 'uuid';

import { captureException } from '#platform/exceptions';
import * as asyncStorage from '#platform/server/asyncStorage';
import * as connection from '#platform/server/connection';
import { logger } from '#platform/server/log';
import { createApp } from '#server/app';
import * as db from '#server/db';
import {
  APIError,
  BankSyncError,
  PostError,
  TransactionError,
} from '#server/errors';
import { computeEntryPair } from '#server/exchange-rates/app';
import { app as mainApp } from '#server/main-app';
import { mutator, runMutator } from '#server/mutators';
import { del, get, post } from '#server/post';
import { getPrefs } from '#server/prefs';
import { getServer } from '#server/server-config';
import { batchMessages } from '#server/sync';
import { isForeignAccount } from '#server/transactions/foreign-guard';
import { undoable, withUndo } from '#server/undo';
import {
  accountCurrencyFields,
  getDefaultCurrencyCode,
  getRecordedAmountPrecision,
  isMulticurrencyAvailable,
  resolveAccountCurrencyInput,
} from '#server/util/currency';
import {
  isReviewedCurrency,
  reviewedAmountEncoding,
} from '#shared/amount-encoding';
import { isNonProductionEnvironment } from '#shared/environment';
import { dayFromDate } from '#shared/months';
import * as monthUtils from '#shared/months';
import { amountToInteger } from '#shared/util';
import type { ImportTransactionsOpts } from '#types/api-handlers';
import type {
  AccountEntity,
  AccountGroupEntity,
  BankSyncProviderStatus,
  BankSyncStatus,
  CategoryEntity,
  GoCardlessToken,
  ImportTransactionEntity,
  SyncServerAkahuAccount,
  SyncServerEnableBankingAccount,
  SyncServerGoCardlessAccount,
  SyncServerPluggyAiAccount,
  SyncServerSimpleFinAccount,
  TransactionEntity,
} from '#types/models';

import * as link from './link';
import { getStartingBalancePayee } from './payees';
import * as bankSync from './sync';

// Shared base type for link account parameters
type LinkAccountBaseParams = {
  upgradingId?: AccountEntity['id'];
  offBudget?: boolean;
  startingDate?: string;
  startingBalance?: number;
};

export type AccountHandlers = {
  'account-update': typeof updateAccount;
  'accounts-get': typeof getAccounts;
  'account-balance': typeof getAccountBalance;
  'account-properties': typeof getAccountProperties;
  'gocardless-accounts-link': typeof linkGoCardlessAccount;
  'simplefin-accounts-link': typeof linkSimpleFinAccount;
  'pluggyai-accounts-link': typeof linkPluggyAiAccount;
  'akahu-accounts-link': typeof linkAkahuAccount;
  'enablebanking-accounts-link': typeof linkEnableBankingAccount;
  'account-create': typeof createAccount;
  'account-close': typeof closeAccount;
  'account-reopen': typeof reopenAccount;
  'account-move': typeof moveAccount;
  'secret-set': typeof setSecret;
  'secret-check': typeof checkSecret;
  'gocardless-poll-web-token': typeof pollGoCardlessWebToken;
  'gocardless-poll-web-token-stop': typeof stopGoCardlessWebTokenPolling;
  'gocardless-status': typeof goCardlessStatus;
  'simplefin-status': typeof simpleFinStatus;
  'pluggyai-status': typeof pluggyAiStatus;
  'akahu-status': typeof akahuStatus;
  'enablebanking-status': typeof enableBankingStatus;
  'enablebanking-aspsps': typeof enableBankingAspsps;
  'enablebanking-start-auth': typeof enableBankingStartAuth;
  'enablebanking-complete-auth': typeof enableBankingCompleteAuth;
  'enablebanking-poll-auth': typeof enableBankingPollAuth;
  'enablebanking-poll-auth-stop': typeof stopEnableBankingPollAuth;
  'enablebanking-configure': typeof enableBankingConfigure;
  'simplefin-accounts': typeof simpleFinAccounts;
  'pluggyai-accounts': typeof pluggyAiAccounts;
  'akahu-accounts': typeof akahuAccounts;
  'gocardless-get-banks': typeof getGoCardlessBanks;
  'gocardless-create-web-token': typeof createGoCardlessWebToken;
  'accounts-bank-sync': typeof accountsBankSync;
  'simplefin-batch-sync': typeof simpleFinBatchSync;
  'transactions-import': typeof importTransactions;
  'account-unlink': typeof unlinkAccount;
};

async function updateAccount({
  id,
  name,
  last_reconciled,
  account_group_id,
  currency,
}: Pick<AccountEntity, 'id'> &
  Partial<
    Pick<
      AccountEntity,
      'name' | 'last_reconciled' | 'account_group_id' | 'currency'
    >
  >) {
  const resolvedCurrency = await resolveAccountCurrencyInput(currency, id);
  await batchMessages(async () => {
    await db.update('accounts', {
      id,
      ...(name !== undefined && { name }),
      ...(last_reconciled && { last_reconciled }),
      ...(account_group_id !== undefined && { account_group_id }),
      ...(resolvedCurrency !== undefined &&
        (await accountCurrencyFields(resolvedCurrency))),
    });
  });
  return {};
}

async function getAccounts(): Promise<AccountEntity[]> {
  const dbAccounts = await db.getAccounts();
  return dbAccounts.map(
    dbAccount =>
      ({
        id: dbAccount.id,
        name: dbAccount.name,
        offbudget: dbAccount.offbudget,
        closed: dbAccount.closed,
        sort_order: dbAccount.sort_order,
        last_reconciled: dbAccount.last_reconciled ?? null,
        tombstone: dbAccount.tombstone,
        account_id: dbAccount.account_id ?? null,
        bank: dbAccount.bank ?? null,
        bankName: dbAccount.bankName ?? null,
        bankId: dbAccount.bankId ?? null,
        mask: dbAccount.mask ?? null,
        official_name: dbAccount.official_name ?? null,
        balance_current: dbAccount.balance_current ?? null,
        balance_available: dbAccount.balance_available ?? null,
        balance_limit: dbAccount.balance_limit ?? null,
        account_sync_source: dbAccount.account_sync_source ?? null,
        last_sync: dbAccount.last_sync ?? null,
        bank_sync_status: dbAccount.bank_sync_status ?? null,
        account_group_id: dbAccount.account_group_id ?? null,
        currency: dbAccount.currency ?? null,
        currency_precision: dbAccount.currency_precision ?? null,
      }) satisfies AccountEntity,
  );
}

async function getAccountBalance({
  id,
  cutoff,
}: {
  id: string;
  cutoff: string | Date;
}) {
  // Foreign accounts report native units; base totals use amount.
  const column = (await isForeignAccount(id)) ? 'transaction_amount' : 'amount';
  const result = await db.first<{ balance: number }>(
    `SELECT sum(${column}) as balance FROM transactions WHERE acct = ? AND isParent = 0 AND tombstone = 0 AND date <= ?`,
    [id, db.toDateRepr(dayFromDate(cutoff))],
  );
  return result?.balance ? result.balance : 0;
}

async function getAccountProperties({ id }: { id: AccountEntity['id'] }) {
  const column = (await isForeignAccount(id)) ? 'transaction_amount' : 'amount';
  const balanceResult = await db.first<{ balance: number }>(
    `SELECT sum(${column}) as balance FROM transactions WHERE acct = ? AND isParent = 0 AND tombstone = 0`,
    [id],
  );
  const countResult = await db.first<{ count: number }>(
    'SELECT count(id) as count FROM transactions WHERE acct = ? AND tombstone = 0',
    [id],
  );

  return {
    balance: balanceResult?.balance || 0,
    numTransactions: countResult?.count || 0,
  };
}

export type LinkAccountResult =
  | {
      type: 'ok';
      /** Downloaded rows skipped because they are in another currency. */
      currencyMismatches: number;
    }
  | { type: 'rate-unavailable'; currency: string; dates: string[] }
  | { type: 'balance-unavailable' };

type ProviderAccount = {
  account_id: string;
  name: string;
  official_name?: string | null;
  mask?: string | null;
  currency?: string | null;
};

/**
 * The currency an account linked to this provider account will hold (null
 * for the budget currency), or a rejection before any write.
 */
async function linkDestinationCurrency(
  providerCurrency: string | null | undefined,
  upgradingId: AccountEntity['id'] | undefined,
): Promise<string | null> {
  const available = await isMulticurrencyAvailable();
  const budgetCurrency = await getDefaultCurrencyCode();
  const known = providerCurrency || null;
  if (upgradingId) {
    const account = await db.first<Pick<db.DbAccount, 'currency'>>(
      'SELECT currency FROM accounts WHERE id = ?',
      [upgradingId],
    );
    if (!account) {
      throw new Error(`Account with ID ${upgradingId} not found.`);
    }
    const destination = account.currency ?? null;
    // An unknown provider currency only links to base accounts.
    if (
      (available || destination !== null) &&
      (destination !== null || known !== null) &&
      (destination ?? budgetCurrency) !== known
    ) {
      throw new PostError('bank-account-currency-mismatch');
    }
    return destination;
  }
  if (!available || known === null || known === budgetCurrency) {
    return null;
  }
  if (!isReviewedCurrency(known)) {
    throw new PostError('bank-account-currency-unsupported');
  }
  return known;
}

/** A first link's typed failure, or null for other errors. */
function linkFailure(
  err: unknown,
  currency: string,
): Exclude<LinkAccountResult, { type: 'ok' }> | null {
  const dates = bankSync.rateUnavailableDates(err);
  if (dates) {
    return { type: 'rate-unavailable', currency, dates };
  }
  if (
    err instanceof TransactionError &&
    err.message === 'balance-unavailable'
  ) {
    return { type: 'balance-unavailable' };
  }
  return null;
}

async function linkBankAccount({
  syncSource,
  institution,
  bankId,
  account,
  upgradingId,
  offBudget = false,
  startingDate,
  startingBalance,
  fileId,
  tables = ['transactions', 'accounts'],
}: LinkAccountBaseParams & {
  syncSource: NonNullable<AccountEntity['account_sync_source']>;
  institution: { name: string | null } | string;
  bankId: string | undefined;
  account: ProviderAccount;
  fileId?: string;
  tables?: string[];
}): Promise<LinkAccountResult> {
  const currency = await linkDestinationCurrency(account.currency, upgradingId);
  const id = upgradingId ?? uuidv4();

  const writeLink = async () => {
    const bank = await link.findOrCreateBank(institution, bankId);
    if (upgradingId) {
      await db.update('accounts', {
        id,
        account_id: account.account_id,
        bank: bank.id,
        account_sync_source: syncSource,
      });
    } else {
      await db.insertWithUUID('accounts', {
        id,
        account_id: account.account_id,
        ...(account.mask != null && { mask: account.mask }),
        name: account.name,
        official_name: account.official_name ?? account.name,
        bank: bank.id,
        offbudget: offBudget ? 1 : 0,
        account_sync_source: syncSource,
        ...(currency !== null && (await accountCurrencyFields(currency))),
      });
      await db.insertPayee({
        name: '',
        transfer_acct: id,
      });
    }
    return bank;
  };

  let currencyMismatches = 0;
  if (currency === null) {
    // Base accounts link first, then sync. The link writes hold the mutator
    // so they never join another link's open batch.
    const bank = await runMutator(writeLink);
    const syncRes = await bankSync.syncAccount(
      undefined,
      undefined,
      id,
      account.account_id,
      bank.bank_id,
      startingDate,
      startingBalance,
      fileId,
    );
    await runMutator(() => handleSyncResponse(syncRes, id));
  } else {
    // A foreign link downloads and validates first, then writes the bank,
    // account, payees and transactions in one batch, or nothing.
    const { download, newAccount } = await bankSync.downloadBankSyncAccount(
      syncSource,
      {
        userId: undefined,
        userKey: undefined,
        id,
        acctId: account.account_id,
        bankId,
        customStartingDate: startingDate,
        fileId,
      },
    );
    try {
      // One mutator and one batch for the whole link, so concurrent links
      // and syncs cannot share or commit its queued writes.
      await runMutator(() =>
        batchMessages(async () => {
          // Earlier links may have changed the destination meanwhile.
          if (
            (await linkDestinationCurrency(account.currency, upgradingId)) !==
            currency
          ) {
            throw new PostError('bank-account-currency-mismatch');
          }
          await writeLink();
          const acctRow = upgradingId
            ? {
                ...(await db.select('accounts', id)),
                account_sync_source: syncSource,
              }
            : {
                id,
                offbudget: offBudget ? 1 : 0,
                account_sync_source: syncSource,
              };
          const syncRes = await bankSync.processBankSyncDownload(
            download,
            id,
            acctRow,
            newAccount,
            startingBalance,
            startingDate,
            { inMutator: true },
          );
          const response = await handleSyncResponse(syncRes, id);
          currencyMismatches = response.currencyMismatches ?? 0;
        }),
      );
    } catch (err) {
      const failure = linkFailure(err, currency);
      if (failure) {
        return failure;
      }
      throw err;
    }
  }

  connection.send('sync-event', { type: 'success', tables });
  return { type: 'ok', currencyMismatches };
}

async function linkGoCardlessAccount({
  requisitionId,
  account,
  ...params
}: LinkAccountBaseParams & {
  requisitionId: string;
  account: SyncServerGoCardlessAccount;
}) {
  return linkBankAccount({
    ...params,
    syncSource: 'goCardless',
    institution: account.institution,
    bankId: requisitionId,
    account,
  });
}

/**
 * Persist a null institution name when the provider doesn't report one, so
 * the desktop-client can render a localized fallback instead of baking an
 * English string into shared bank data.
 */
function providerInstitution(institution: string | null | undefined) {
  return { name: institution ?? null };
}

async function linkSimpleFinAccount({
  externalAccount,
  ...params
}: LinkAccountBaseParams & {
  externalAccount: SyncServerSimpleFinAccount;
}) {
  return linkBankAccount({
    ...params,
    syncSource: 'simpleFin',
    institution: providerInstitution(externalAccount.institution),
    bankId: externalAccount.orgDomain ?? externalAccount.orgId,
    account: externalAccount,
    fileId: getPrefs()?.cloudFileId,
  });
}

async function linkPluggyAiAccount({
  externalAccount,
  ...params
}: LinkAccountBaseParams & {
  externalAccount: SyncServerPluggyAiAccount;
}) {
  return linkBankAccount({
    ...params,
    syncSource: 'pluggyai',
    institution: providerInstitution(externalAccount.institution),
    bankId: externalAccount.orgDomain ?? externalAccount.orgId,
    account: externalAccount,
    fileId: getPrefs()?.cloudFileId,
  });
}

async function linkAkahuAccount({
  externalAccount,
  ...params
}: LinkAccountBaseParams & {
  externalAccount: SyncServerAkahuAccount;
}) {
  return linkBankAccount({
    ...params,
    syncSource: 'akahu',
    institution: providerInstitution(externalAccount.institution),
    bankId: externalAccount.orgDomain ?? externalAccount.orgId,
    account: externalAccount,
    tables: ['transactions'],
  });
}

async function linkEnableBankingAccount({
  externalAccount,
  ...params
}: LinkAccountBaseParams & {
  externalAccount: SyncServerEnableBankingAccount;
}) {
  // Enable Banking uses a session-per-account model, so we use the
  // account-level identifier (account_id) rather than institution-level
  // IDs. This creates one bank entry per Enable Banking account, unlike
  // GoCardless (requisitionId) or SimpleFin/PluggyAi (orgDomain/orgId).
  return linkBankAccount({
    ...params,
    syncSource: 'enableBanking',
    institution: providerInstitution(externalAccount.institution),
    bankId: externalAccount.account_id,
    account: externalAccount,
  });
}

async function createAccount({
  name,
  balance,
  balanceInteger,
  offBudget = false,
  closed = false,
  currency,
  startingBalanceBase,
}: {
  name: string;
  /**
   * Major units, parsed by the UI at the account's precision (the recorded
   * budget precision, or the currency's for a foreign account).
   */
  balance?: number | null | undefined;
  /** Already-encoded minor units; persisted without a floating-point trip. */
  balanceInteger?: number | undefined;
  offBudget?: boolean | undefined;
  closed?: boolean | undefined;
  currency?: string | null | undefined;
  /** Base amount for a foreign starting balance when no rate applies. */
  startingBalanceBase?: number | undefined;
}) {
  if (balanceInteger !== undefined && balance != null) {
    throw new Error('Supply either balance or balanceInteger');
  }
  const resolvedCurrency = await resolveAccountCurrencyInput(currency);
  const nativePrecision = resolvedCurrency
    ? reviewedAmountEncoding(resolvedCurrency).precision
    : null;
  const amount =
    balanceInteger !== undefined
      ? balanceInteger
      : balance != null && balance !== 0
        ? amountToInteger(
            balance,
            nativePrecision ?? getRecordedAmountPrecision(),
          )
        : 0;
  if (!Number.isSafeInteger(amount)) {
    throw new Error('Invalid starting balance');
  }
  // A foreign starting balance needs its base before anything is created.
  let startingPair: { amount: number; transaction_amount: number } | null =
    null;
  if (resolvedCurrency && nativePrecision !== null && amount !== 0) {
    const pair = await computeEntryPair({
      quoteCurrency: resolvedCurrency,
      nativePrecision,
      date: monthUtils.currentDay(),
      nativeAmount: amount,
      baseAmount: startingBalanceBase,
    });
    if (pair.status !== 'ok') {
      throw new Error(pair.status);
    }
    startingPair = {
      amount: pair.baseAmount,
      transaction_amount: pair.nativeAmount,
    };
  }

  const id: AccountEntity['id'] = await db.insertAccount({
    name,
    offbudget: offBudget ? 1 : 0,
    closed: closed ? 1 : 0,
    ...(resolvedCurrency !== undefined && { currency: resolvedCurrency }),
  });

  await db.insertPayee({
    name: '',
    transfer_acct: id,
  });

  if (amount !== 0) {
    const payee = await getStartingBalancePayee();
    await db.insertTransaction({
      account: id,
      ...(startingPair ?? { amount }),
      category: offBudget ? null : payee.category,
      payee: payee.id,
      date: monthUtils.currentDay(),
      cleared: true,
      starting_balance_flag: true,
    });
  }

  return id;
}

/** Closing with a balance writes a transfer, unsupported for foreign accounts. */
export async function assertClosureAllowed(
  id: AccountEntity['id'],
  transferAccountId?: AccountEntity['id'],
) {
  const { balance } = await getAccountProperties({ id });
  if (
    balance !== 0 &&
    ((await isForeignAccount(id)) ||
      (transferAccountId != null &&
        (await isForeignAccount(transferAccountId))))
  ) {
    throw new Error('multicurrency-transfer-unavailable');
  }
}

async function closeAccount({
  id,
  transferAccountId,
  categoryId,
  forced = false,
}: {
  id: AccountEntity['id'];
  transferAccountId?: AccountEntity['id'] | undefined;
  categoryId?: CategoryEntity['id'] | undefined;
  forced?: boolean | undefined;
}) {
  // Preflight unsupported foreign closure transfers before any side effect,
  // including unlinking.
  if (!forced) {
    await assertClosureAllowed(id, transferAccountId);
  }

  // Unlink the account if it's linked. This makes sure to remove it from
  // bank-sync providers. (This should not be undo-able, as it mutates the
  // remote server and the user will have to link the account again)
  await unlinkAccount({ id });

  return withUndo(async () => {
    const account = await db.first<db.DbAccount>(
      'SELECT * FROM accounts WHERE id = ? AND tombstone = 0',
      [id],
    );

    // Do nothing if the account doesn't exist or it's already been
    // closed
    if (!account || account.closed === 1) {
      return;
    }

    const { balance, numTransactions } = await getAccountProperties({ id });

    // If there are no transactions, we can simply delete the account
    if (numTransactions === 0) {
      await db.deleteAccount({ id });
    } else if (forced) {
      const rows = db.runQuery<
        Pick<db.DbViewTransaction, 'id' | 'transfer_id'>
      >(
        'SELECT id, transfer_id FROM v_transactions WHERE account = ?',
        [id],
        true,
      );

      const transferPayee = await db.first<Pick<db.DbPayee, 'id'>>(
        'SELECT id FROM payees WHERE transfer_acct = ?',
        [id],
      );

      if (!transferPayee) {
        throw new Error(`Transfer payee with account ID ${id} not found.`);
      }

      await batchMessages(async () => {
        // TODO: what this should really do is send a special message that
        // automatically marks the tombstone value for all transactions
        // within an account... or something? This is problematic
        // because another client could easily add new data that
        // should be marked as deleted.

        // Awaited so guarded writes finish inside this batch and undo scope.
        await Promise.all(
          rows.map(async row => {
            if (row.transfer_id) {
              await db.updateTransaction({
                id: row.transfer_id,
                payee: null,
                transfer_id: null,
              });
            }

            await db.deleteTransaction({ id: row.id });
          }),
        );

        await db.deleteAccount({ id });
        await db.deleteTransferPayee({ id: transferPayee.id });
      });
    } else {
      if (balance !== 0 && transferAccountId == null) {
        throw APIError('balance is non-zero: transferAccountId is required');
      }

      if (id === transferAccountId) {
        throw APIError('transfer account can not be the account being closed');
      }

      await db.update('accounts', { id, closed: 1 });

      // If there is a balance we need to transfer it to the specified
      // account (and possibly categorize it)
      if (balance !== 0 && transferAccountId) {
        const transferPayee = await db.first<Pick<db.DbPayee, 'id'>>(
          'SELECT id FROM payees WHERE transfer_acct = ?',
          [transferAccountId],
        );

        if (!transferPayee) {
          throw new Error(
            `Transfer payee with account ID ${transferAccountId} not found.`,
          );
        }

        await mainApp.handlers['transaction-add']({
          id: uuidv4(),
          payee: transferPayee.id,
          amount: -balance,
          account: id,
          date: monthUtils.currentDay(),
          notes: 'Closing account',
          category: categoryId,
        });
      }
    }
  });
}

async function reopenAccount({ id }: { id: AccountEntity['id'] }) {
  await db.update('accounts', { id, closed: 0 });
}

async function moveAccount({
  id,
  targetId,
  accountGroupId,
}: {
  id: AccountEntity['id'];
  targetId: AccountEntity['id'] | null;
  accountGroupId?: AccountGroupEntity['id'] | null;
}) {
  await db.moveAccount(id, targetId, accountGroupId);
}

async function setSecret({
  name,
  value,
  fileId = null,
}: {
  name: string;
  value: string | null;
  fileId?: string | null;
}) {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  const headers = {
    'X-ACTUAL-TOKEN': userToken,
    ...(fileId ? { 'X-Actual-File-Id': fileId } : {}),
  };

  try {
    if (value === null) {
      return await del(
        serverConfig.BASE_SERVER + '/secret/' + name,
        {},
        headers,
      );
    }

    return await post(
      serverConfig.BASE_SERVER + '/secret',
      {
        name,
        value,
      },
      headers,
    );
  } catch (error) {
    return {
      error: 'failed',
      reason: error instanceof PostError ? error.reason : undefined,
    };
  }
}
async function checkSecret(name: string) {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  try {
    return await get(serverConfig.BASE_SERVER + '/secret/' + name, {
      'X-ACTUAL-TOKEN': userToken,
    });
  } catch (error) {
    logger.error(error);
    return { error: 'failed' };
  }
}

let stopPolling = false;

async function pollGoCardlessWebToken({
  requisitionId,
}: {
  requisitionId: string;
}) {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) return { error: 'unknown' };

  const startTime = Date.now();
  stopPolling = false;

  async function getData(
    cb: (
      data:
        | { status: 'timeout' }
        | { status: 'unknown'; message?: string }
        | { status: 'success'; data: GoCardlessToken },
    ) => void,
  ) {
    if (stopPolling) {
      return;
    }

    if (Date.now() - startTime >= 1000 * 60 * 10) {
      cb({ status: 'timeout' });
      return;
    }

    const serverConfig = getServer();
    if (!serverConfig) {
      throw new Error('Failed to get server config.');
    }

    const data = await post(
      serverConfig.GOCARDLESS_SERVER + '/get-accounts',
      {
        requisitionId,
      },
      {
        'X-ACTUAL-TOKEN': userToken,
      },
    );

    if (data) {
      if (data.error_code) {
        logger.error('Failed linking gocardless account:', data);
        cb({ status: 'unknown', message: data.error_type });
      } else {
        cb({ status: 'success', data });
      }
    } else {
      setTimeout(() => getData(cb), 3000);
    }
  }

  return new Promise(resolve => {
    void getData(data => {
      if (data.status === 'success') {
        resolve({ data: data.data });
        return;
      }

      if (data.status === 'timeout') {
        resolve({ error: data.status });
        return;
      }

      resolve({
        error: data.status,
        message: data.message,
      });
    });
  });
}

async function stopGoCardlessWebTokenPolling() {
  stopPolling = true;
  return 'ok';
}

async function goCardlessStatus() {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  return post(
    serverConfig.GOCARDLESS_SERVER + '/status',
    {},
    {
      'X-ACTUAL-TOKEN': userToken,
    },
  );
}

async function simpleFinStatus(): Promise<BankSyncProviderStatus> {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  const fileId = getPrefs()?.cloudFileId;
  return post(
    serverConfig.SIMPLEFIN_SERVER + '/status',
    {},
    {
      'X-ACTUAL-TOKEN': userToken,
      ...(fileId ? { 'X-Actual-File-Id': fileId } : {}),
    },
  );
}

async function pluggyAiStatus(): Promise<BankSyncProviderStatus> {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  const fileId = getPrefs()?.cloudFileId;
  return post(
    serverConfig.PLUGGYAI_SERVER + '/status',
    {},
    {
      'X-ACTUAL-TOKEN': userToken,
      ...(fileId ? { 'X-Actual-File-Id': fileId } : {}),
    },
  );
}

async function akahuStatus() {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  return post(
    serverConfig.AKAHU_SERVER + '/status',
    {},
    {
      'X-ACTUAL-TOKEN': userToken,
    },
  );
}

async function simpleFinAccounts() {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  const fileId = getPrefs()?.cloudFileId;
  try {
    return await post(
      serverConfig.SIMPLEFIN_SERVER + '/accounts',
      {},
      {
        'X-ACTUAL-TOKEN': userToken,
        ...(fileId ? { 'X-Actual-File-Id': fileId } : {}),
      },
      60000,
    );
  } catch {
    return { error_code: 'TIMED_OUT' };
  }
}

async function pluggyAiAccounts() {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  try {
    const fileId = getPrefs()?.cloudFileId;
    return await post(
      serverConfig.PLUGGYAI_SERVER + '/accounts',
      {},
      {
        'X-ACTUAL-TOKEN': userToken,
        ...(fileId ? { 'X-Actual-File-Id': fileId } : {}),
      },
      60000,
    );
  } catch {
    return { error_code: 'TIMED_OUT' };
  }
}

async function akahuAccounts() {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  try {
    return await post(
      serverConfig.AKAHU_SERVER + '/accounts',
      {},
      {
        'X-ACTUAL-TOKEN': userToken,
      },
      60000,
    );
  } catch {
    return { error_code: 'TIMED_OUT' };
  }
}

async function enableBankingStatus() {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  return post(
    serverConfig.ENABLEBANKING_SERVER + '/status',
    {},
    {
      'X-ACTUAL-TOKEN': userToken,
    },
  );
}

async function enableBankingAspsps(country: string) {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  return post(
    serverConfig.ENABLEBANKING_SERVER + '/aspsps',
    { country },
    {
      'X-ACTUAL-TOKEN': userToken,
    },
  );
}

async function enableBankingStartAuth({
  aspspId,
  country,
  redirectUrl,
  maxConsentValidity,
  psuType = 'personal',
}: {
  aspspId: string;
  country: string;
  redirectUrl: string;
  maxConsentValidity?: number;
  psuType?: 'personal' | 'business';
}) {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  if (
    maxConsentValidity !== undefined &&
    (!Number.isFinite(maxConsentValidity) ||
      !Number.isInteger(maxConsentValidity) ||
      maxConsentValidity <= 0 ||
      maxConsentValidity > 315_360_000)
  ) {
    return { error: 'invalid_max_consent_validity' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  return post(
    serverConfig.ENABLEBANKING_SERVER + '/start-auth',
    {
      aspsp: { name: aspspId, country },
      redirectUrl,
      maxConsentValidity,
      psuType,
    },
    {
      'X-ACTUAL-TOKEN': userToken,
    },
  );
}

async function enableBankingCompleteAuth({
  code,
  state,
}: {
  code: string;
  state: string;
}) {
  if (!state) {
    return { error: 'missing-state' };
  }

  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  return post(
    serverConfig.ENABLEBANKING_SERVER + '/complete-auth',
    { code, state },
    {
      'X-ACTUAL-TOKEN': userToken,
    },
  );
}

const enableBankingPollControllers = new Map<string, AbortController>();

async function enableBankingPollAuth({ state }: { state: string }) {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  const controller = new AbortController();
  enableBankingPollControllers.set(state, controller);

  try {
    return await post(
      serverConfig.ENABLEBANKING_SERVER + '/poll-auth',
      { state },
      {
        'X-ACTUAL-TOKEN': userToken,
      },
      310000, // slightly longer than server's 5-minute poll timeout
      controller.signal,
    );
  } finally {
    if (enableBankingPollControllers.get(state) === controller) {
      enableBankingPollControllers.delete(state);
    }
  }
}

async function stopEnableBankingPollAuth({ state }: { state: string }) {
  const controller = enableBankingPollControllers.get(state);
  if (controller) {
    controller.abort();
    enableBankingPollControllers.delete(state);
  }
  return 'ok';
}

async function enableBankingConfigure(config: {
  applicationId: string;
  secretKey: string;
}) {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  return post(serverConfig.ENABLEBANKING_SERVER + '/configure', config, {
    'X-ACTUAL-TOKEN': userToken,
  });
}

async function getGoCardlessBanks(country: string) {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  return post(
    serverConfig.GOCARDLESS_SERVER + '/get-banks',
    { country, showDemo: isNonProductionEnvironment() },
    {
      'X-ACTUAL-TOKEN': userToken,
    },
  );
}

async function createGoCardlessWebToken({
  institutionId,
  accessValidForDays,
}: {
  institutionId: string;
  accessValidForDays: number;
}) {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  try {
    return await post(
      serverConfig.GOCARDLESS_SERVER + '/create-web-token',
      {
        institutionId,
        accessValidForDays,
      },
      {
        'X-ACTUAL-TOKEN': userToken,
      },
    );
  } catch (error) {
    logger.error(error);
    return { error: 'failed' };
  }
}

export type SyncResponse = {
  newTransactions: Array<TransactionEntity['id']>;
  matchedTransactions: Array<TransactionEntity['id']>;
  updatedAccounts: Array<AccountEntity['id']>;
  /** Downloaded rows skipped because they are in another currency. */
  currencyMismatches?: number;
};

async function handleSyncResponse(
  res: {
    added: Array<TransactionEntity['id']>;
    updated: Array<TransactionEntity['id']>;
    currencyMismatches?: number;
  },
  acctId: string,
): Promise<SyncResponse> {
  const { added, updated, currencyMismatches = 0 } = res;
  const newTransactions: Array<TransactionEntity['id']> = [];
  const matchedTransactions: Array<TransactionEntity['id']> = [];
  const updatedAccounts: Array<AccountEntity['id']> = [];

  newTransactions.push(...added);
  matchedTransactions.push(...updated);

  if (added.length > 0) {
    updatedAccounts.push(acctId);
  }

  const ts = new Date().getTime().toString();
  await db.update('accounts', {
    id: acctId,
    last_sync: ts,
    bank_sync_status: 'ok',
  });

  return {
    newTransactions,
    matchedTransactions,
    updatedAccounts,
    currencyMismatches,
  };
}

type SyncError =
  | {
      type: 'rate-unavailable';
      accountId: AccountEntity['id'];
      message: string;
      currency: string;
      dates: string[];
    }
  | {
      type: 'SyncError';
      accountId: AccountEntity['id'];
      message: string;
      category: string;
      code: string;
    }
  | {
      accountId: AccountEntity['id'];
      message: string;
      internal?: string;
    };

/**
 * Type guard to check if an error is a BankSyncError.
 * Handles both class instances and plain objects with the BankSyncError shape.
 */
function isBankSyncError(err: unknown): err is BankSyncError {
  return (
    err instanceof BankSyncError ||
    (typeof err === 'object' &&
      err !== null &&
      'type' in err &&
      err.type === 'BankSyncError')
  );
}

/**
 * Converts a sync error into a standardized SyncError response object.
 */
function handleSyncError(
  err: Error | PostError | BankSyncError,
  acct: db.DbAccount,
): SyncError {
  const dates = bankSync.rateUnavailableDates(err);
  if (dates && acct.currency) {
    return {
      type: 'rate-unavailable',
      accountId: acct.id,
      message: `Failed syncing account "${acct.name}": an exchange rate is needed for ${dates.join(', ')}.`,
      currency: acct.currency,
      dates,
    };
  }
  if (
    err instanceof TransactionError &&
    err.message === 'balance-unavailable'
  ) {
    return {
      accountId: acct.id,
      message: `Failed syncing account "${acct.name}": the bank did not report a starting balance in the account's currency.`,
    };
  }
  if (isBankSyncError(err)) {
    const syncError = {
      type: 'SyncError',
      accountId: acct.id,
      message: 'Failed syncing account "' + acct.name + '."',
      category: err.category,
      code: err.code,
    };

    if (err.category === 'RATE_LIMIT_EXCEEDED') {
      return {
        ...syncError,
        message: `Failed syncing account ${acct.name}. Rate limit exceeded. Please try again later.`,
      };
    }

    return syncError;
  }

  if (err instanceof PostError && err.reason !== 'internal') {
    return {
      accountId: acct.id,
      message: err.reason
        ? err.reason
        : `Account "${acct.name}" is not linked properly. Please link it again.`,
    };
  }

  return {
    accountId: acct.id,
    message:
      'There was an internal error. Please get in touch https://actualbudget.org/contact for support.',
    internal: err.stack,
  };
}

function getBankSyncStatusFromError(
  err: Error | PostError | BankSyncError,
): BankSyncStatus {
  if (isBankSyncError(err)) {
    if (
      (err.category === 'ITEM_ERROR' && err.code === 'ITEM_LOGIN_REQUIRED') ||
      (err.category === 'INVALID_INPUT' &&
        err.code === 'INVALID_ACCESS_TOKEN') ||
      err.category === 'INVALID_ACCESS_TOKEN'
    ) {
      return 'reauth-required';
    }

    if (err.category === 'ACCOUNT_NEEDS_ATTENTION') {
      return 'attention-required';
    }

    if (err.category === 'RATE_LIMIT_EXCEEDED') {
      return 'rate-limit-exceeded';
    }

    if (err.category === 'TIMED_OUT') {
      return 'timed-out';
    }

    if (err.category === 'SERVER_DOWN') {
      return 'server-down';
    }

    if (err.category === 'ACCOUNT_MISSING') {
      return 'account-missing';
    }

    if (
      err.category === 'GOCARDLESS_NOT_CONFIGURED' ||
      err.category === 'NOT_CONFIGURED' ||
      err.code === 'GOCARDLESS_NOT_CONFIGURED' ||
      err.code === 'NOT_CONFIGURED'
    ) {
      return 'not-configured';
    }
  }

  return 'failed';
}

/** Holds the mutator so the write never joins a foreign sync's open batch. */
function persistBankSyncError(
  accountId: AccountEntity['id'],
  err: Error | PostError | BankSyncError,
) {
  return runMutator(() =>
    db.update('accounts', {
      id: accountId,
      bank_sync_status: getBankSyncStatusFromError(err),
    }),
  );
}

export type SyncResponseWithErrors = SyncResponse & {
  errors: SyncError[];
};

async function accountsBankSync({
  ids = [],
}: {
  ids: Array<AccountEntity['id']>;
}): Promise<SyncResponseWithErrors> {
  const { 'user-id': userId, 'user-key': userKey } =
    await asyncStorage.multiGet(['user-id', 'user-key']);

  const accounts = db.runQuery<db.DbAccount & { bankId: db.DbBank['bank_id'] }>(
    `
    SELECT a.*, b.bank_id as bankId
    FROM accounts a
    LEFT JOIN banks b ON a.bank = b.id
    WHERE a.tombstone = 0 AND a.closed = 0
      ${ids.length ? `AND a.id IN (${ids.map(() => '?').join(', ')})` : ''}
    ORDER BY a.offbudget, a.sort_order
  `,
    ids,
    true,
  );

  const errors: ReturnType<typeof handleSyncError>[] = [];
  const newTransactions: Array<TransactionEntity['id']> = [];
  const matchedTransactions: Array<TransactionEntity['id']> = [];
  const updatedAccounts: Array<AccountEntity['id']> = [];
  let currencyMismatches = 0;
  const fileId = getPrefs()?.cloudFileId;

  for (const acct of accounts) {
    if (acct.bankId && acct.account_id) {
      try {
        logger.group('Bank Sync operation for account:', acct.name);
        const syncResponse = await bankSync.syncAccount(
          userId as string,
          userKey as string,
          acct.id,
          acct.account_id,
          acct.bankId,
          undefined,
          undefined,
          fileId,
        );

        const syncResponseData = await runMutator(() =>
          handleSyncResponse(syncResponse, acct.id),
        );

        newTransactions.push(...syncResponseData.newTransactions);
        matchedTransactions.push(...syncResponseData.matchedTransactions);
        updatedAccounts.push(...syncResponseData.updatedAccounts);
        currencyMismatches += syncResponseData.currencyMismatches ?? 0;
      } catch (err) {
        const error = err as Error;
        await persistBankSyncError(acct.id, error);
        errors.push(handleSyncError(error, acct));
        captureException({
          ...error,
          message: 'Failed syncing account "' + acct.name + '."',
        } as Error);
      } finally {
        logger.groupEnd();
      }
    }
  }

  if (updatedAccounts.length > 0) {
    connection.send('sync-event', {
      type: 'success',
      tables: ['transactions', 'accounts'],
    });
  }

  return {
    errors,
    newTransactions,
    matchedTransactions,
    updatedAccounts,
    currencyMismatches,
  };
}

async function simpleFinBatchSync({
  ids = [],
}: {
  ids: Array<AccountEntity['id']>;
}): Promise<
  Array<{ accountId: AccountEntity['id']; res: SyncResponseWithErrors }>
> {
  const accounts = db.runQuery<db.DbAccount & { bankId: db.DbBank['bank_id'] }>(
    `SELECT a.*, b.bank_id as bankId FROM accounts a
         LEFT JOIN banks b ON a.bank = b.id
         WHERE
          a.tombstone = 0
          AND a.closed = 0
          AND a.account_sync_source = 'simpleFin'
          ${ids.length ? `AND a.id IN (${ids.map(() => '?').join(', ')})` : ''}
         ORDER BY a.offbudget, a.sort_order`,
    ids.length ? ids : [],
    true,
  );

  const retVal: Array<{
    accountId: AccountEntity['id'];
    res: SyncResponseWithErrors;
  }> = [];

  logger.group('Bank Sync operation for all SimpleFin accounts');
  try {
    const syncResponses: Array<{
      accountId: AccountEntity['id'];
      res: {
        error_code: string;
        error_type: string;
        error?: TransactionError;
        added: Array<TransactionEntity['id']>;
        updated: Array<TransactionEntity['id']>;
      };
    }> = await bankSync.simpleFinBatchSync(
      accounts.map(a => ({
        id: a.id,
        account_id: a.account_id || null,
      })),
      getPrefs()?.cloudFileId,
    );
    for (const syncResponse of syncResponses) {
      const account = accounts.find(a => a.id === syncResponse.accountId);
      if (!account) {
        logger.error(
          `Invalid account ID found in response: ${syncResponse.accountId}. Proceeding to the next account...`,
        );
        continue;
      }

      const errors: ReturnType<typeof handleSyncError>[] = [];
      const newTransactions: Array<TransactionEntity['id']> = [];
      const matchedTransactions: Array<TransactionEntity['id']> = [];
      const updatedAccounts: Array<AccountEntity['id']> = [];
      let currencyMismatches = 0;

      if (syncResponse.res?.error) {
        await persistBankSyncError(account.id, syncResponse.res.error);
        errors.push(handleSyncError(syncResponse.res.error, account));
      } else if (syncResponse.res?.error_code) {
        const bankSyncError = {
          type: 'BankSyncError',
          reason: 'Failed syncing account "' + account.name + '."',
          category: syncResponse.res.error_type,
          code: syncResponse.res.error_code,
        } as BankSyncError;

        await persistBankSyncError(account.id, bankSyncError);
        errors.push(handleSyncError(bankSyncError, account));
      } else if (syncResponse.res) {
        const syncResponseData = await runMutator(() =>
          handleSyncResponse(syncResponse.res, account.id),
        );

        newTransactions.push(...syncResponseData.newTransactions);
        matchedTransactions.push(...syncResponseData.matchedTransactions);
        updatedAccounts.push(...syncResponseData.updatedAccounts);
        currencyMismatches += syncResponseData.currencyMismatches ?? 0;
      } else {
        const emptyResponseError = new Error(
          'Failed syncing account "' + account.name + '": empty response',
        );
        await persistBankSyncError(account.id, emptyResponseError);
        errors.push(handleSyncError(emptyResponseError, account));
      }

      retVal.push({
        accountId: syncResponse.accountId,
        res: {
          errors,
          newTransactions,
          matchedTransactions,
          updatedAccounts,
          currencyMismatches,
        },
      });
    }
  } catch (err) {
    for (const account of accounts) {
      const error = err as Error;
      await persistBankSyncError(account.id, error);
      retVal.push({
        accountId: account.id,
        res: {
          errors: [handleSyncError(error, account)],
          newTransactions: [],
          matchedTransactions: [],
          updatedAccounts: [],
        },
      });
    }
  }

  if (retVal.some(a => a.res.updatedAccounts.length > 0)) {
    connection.send('sync-event', {
      type: 'success',
      tables: ['transactions', 'accounts'],
    });
  }

  logger.groupEnd();

  return retVal;
}

export type ImportTransactionsResult = bankSync.ReconcileTransactionsResult & {
  errors: Array<{
    message: string;
  }>;
};

async function importTransactions({
  accountId,
  transactions,
  isPreview,
  opts,
}: {
  accountId: AccountEntity['id'];
  transactions: ImportTransactionEntity[];
  isPreview: boolean;
  opts?: ImportTransactionsOpts;
}): Promise<ImportTransactionsResult> {
  if (typeof accountId !== 'string') {
    throw APIError('transactions-import: accountId must be an id');
  }

  const payeeNameNormalization = opts?.payeeNameNormalization ?? 'title-case';
  if (!bankSync.PAYEE_NAME_NORMALIZATIONS.includes(payeeNameNormalization)) {
    throw APIError(
      `transactions-import: payeeNameNormalization must be one of ${bankSync.PAYEE_NAME_NORMALIZATIONS.join(
        ', ',
      )}, got '${String(payeeNameNormalization)}'`,
    );
  }

  try {
    const reconciled = await bankSync.reconcileTransactions(
      accountId,
      transactions,
      {
        isPreview,
        defaultCleared: opts?.defaultCleared,
        reimportDeleted: opts?.reimportDeleted,
        payeeNameNormalization,
      },
    );
    const missingDates = [
      ...new Set(reconciled.missingRates?.map(({ date }) => date)),
    ].sort();
    return {
      errors:
        missingDates.length > 0
          ? [{ message: `rate-unavailable: ${missingDates.join(', ')}` }]
          : [],
      added: reconciled.added,
      updated: reconciled.updated,
      updatedPreview: reconciled.updatedPreview,
      ...(reconciled.previewBases && {
        previewBases: reconciled.previewBases,
      }),
      ...(missingDates.length > 0 && { missingRates: reconciled.missingRates }),
    };
  } catch (err) {
    if (err instanceof TransactionError) {
      return {
        errors: [{ message: err.message }],
        added: [],
        updated: [],
        updatedPreview: [],
      };
    }

    throw err;
  }
}

async function unlinkAccount({ id }: { id: AccountEntity['id'] }) {
  const accRow = await db.first<db.DbAccount>(
    'SELECT * FROM accounts WHERE id = ?',
    [id],
  );

  if (!accRow) {
    throw new Error(`Account with ID ${id} not found.`);
  }

  const bankId = accRow.bank;

  if (!bankId) {
    return 'ok';
  }

  const isGoCardless = accRow.account_sync_source === 'goCardless';

  await db.updateAccount({
    id,
    account_id: null,
    bank: null,
    balance_current: null,
    balance_available: null,
    balance_limit: null,
    account_sync_source: null,
    bank_sync_status: null,
  });

  if (isGoCardless === false) {
    return;
  }

  const accountWithBankResult = await db.first<{ count: number }>(
    'SELECT COUNT(*) as count FROM accounts WHERE bank = ?',
    [bankId],
  );

  // No more accounts are associated with this bank. We can remove
  // it from GoCardless.
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) {
    return 'ok';
  }

  if (!accountWithBankResult || accountWithBankResult.count === 0) {
    const bank = await db.first<Pick<db.DbBank, 'bank_id'>>(
      'SELECT bank_id FROM banks WHERE id = ?',
      [bankId],
    );

    if (!bank) {
      throw new Error(`Bank with ID ${bankId} not found.`);
    }

    const serverConfig = getServer();
    if (!serverConfig) {
      throw new Error('Failed to get server config.');
    }

    const requisitionId = bank.bank_id;

    try {
      await post(
        serverConfig.GOCARDLESS_SERVER + '/remove-account',
        {
          requisitionId,
        },
        {
          'X-ACTUAL-TOKEN': userToken,
        },
      );
    } catch (error) {
      logger.log({ error });
    }
  }

  return 'ok';
}

export const app = createApp<AccountHandlers>();

app.method('account-update', mutator(undoable(updateAccount)));
app.method('accounts-get', getAccounts);
app.method('account-balance', getAccountBalance);
app.method('account-properties', getAccountProperties);
app.method('gocardless-accounts-link', linkGoCardlessAccount);
app.method('simplefin-accounts-link', linkSimpleFinAccount);
app.method('pluggyai-accounts-link', linkPluggyAiAccount);
app.method('akahu-accounts-link', linkAkahuAccount);
app.method('enablebanking-accounts-link', linkEnableBankingAccount);
app.method('account-create', mutator(undoable(createAccount)));
app.method('account-close', mutator(closeAccount));
app.method('account-reopen', mutator(undoable(reopenAccount)));
app.method('account-move', mutator(undoable(moveAccount)));
app.method('secret-set', setSecret);
app.method('secret-check', checkSecret);
app.method('gocardless-poll-web-token', pollGoCardlessWebToken);
app.method('gocardless-poll-web-token-stop', stopGoCardlessWebTokenPolling);
app.method('gocardless-status', goCardlessStatus);
app.method('simplefin-status', simpleFinStatus);
app.method('pluggyai-status', pluggyAiStatus);
app.method('akahu-status', akahuStatus);
app.method('enablebanking-status', enableBankingStatus);
app.method('enablebanking-aspsps', enableBankingAspsps);
app.method('enablebanking-start-auth', enableBankingStartAuth);
app.method('enablebanking-complete-auth', enableBankingCompleteAuth);
app.method('enablebanking-poll-auth', enableBankingPollAuth);
app.method('enablebanking-poll-auth-stop', stopEnableBankingPollAuth);
app.method('enablebanking-configure', enableBankingConfigure);
app.method('simplefin-accounts', simpleFinAccounts);
app.method('pluggyai-accounts', pluggyAiAccounts);
app.method('akahu-accounts', akahuAccounts);
app.method('gocardless-get-banks', getGoCardlessBanks);
app.method('gocardless-create-web-token', createGoCardlessWebToken);
app.method('accounts-bank-sync', accountsBankSync);
app.method('simplefin-batch-sync', simpleFinBatchSync);
app.method('transactions-import', mutator(undoable(importTransactions)));
app.method('account-unlink', mutator(unlinkAccount));
