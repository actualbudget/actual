import { t } from 'i18next';
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
import { app as mainApp } from '#server/main-app';
import { mutator } from '#server/mutators';
import { get, post } from '#server/post';
import { getServer } from '#server/server-config';
import { batchMessages } from '#server/sync';
import { undoable, withUndo } from '#server/undo';
import { isNonProductionEnvironment } from '#shared/environment';
import { dayFromDate } from '#shared/months';
import * as monthUtils from '#shared/months';
import { amountToInteger } from '#shared/util';
import type { ImportTransactionsOpts } from '#types/api-handlers';
import type {
  AccountEntity,
  BankSyncStatus,
  CategoryEntity,
  GoCardlessToken,
  ImportTransactionEntity,
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
  'simplefin-accounts': typeof simpleFinAccounts;
  'pluggyai-accounts': typeof pluggyAiAccounts;
  'gocardless-get-banks': typeof getGoCardlessBanks;
  'gocardless-create-web-token': typeof createGoCardlessWebToken;
  'accounts-bank-sync': typeof accountsBankSync;
  'simplefin-batch-sync': typeof simpleFinBatchSync;
  'transactions-import': typeof importTransactions;
  'account-unlink': typeof unlinkAccount;
};

async function updateAccount(
  params: { id: AccountEntity['id'] } & Partial<AccountEntity>,
) {
  const { id, bankName, bankId, account_sync_source } = params;
  const hasField = <K extends keyof typeof params>(field: K) =>
    Object.prototype.hasOwnProperty.call(params, field);

  if (hasField('account_sync_source') && account_sync_source === 'external') {
    const providerAccountId = params.account_id;

    if (!providerAccountId) {
      throw new Error(
        'account_id is required when linking an external sync account.',
      );
    }
    if (!bankName) {
      throw new Error(
        'bankName is required when linking an external sync account.',
      );
    }
    if (!bankId) {
      throw new Error(
        'bankId is required when linking an external sync account.',
      );
    }

    await unlinkAccount({ id });

    const bank = await link.findOrCreateBank({ name: bankName }, bankId);

    await db.update('accounts', {
      id,
      account_id: providerAccountId,
      bank: bank.id,
      mask: params.mask ?? null,
      official_name: params.official_name ?? null,
      balance_current: params.balance_current ?? null,
      balance_available: params.balance_available ?? null,
      balance_limit: params.balance_limit ?? null,
      account_sync_source: 'external',
      bank_sync_status: null,
    });
  } else if (hasField('account_sync_source') && account_sync_source == null) {
    throw new Error('Use account-unlink to unlink an account.');
  }

  const accountUpdate: Partial<AccountEntity> & { id: AccountEntity['id'] } = {
    id,
  };
  if (hasField('name')) {
    accountUpdate.name = params.name;
  }
  if (hasField('last_reconciled')) {
    accountUpdate.last_reconciled = params.last_reconciled ?? null;
  }
  if (hasField('last_sync')) {
    accountUpdate.last_sync = params.last_sync ?? null;
  }
  if (hasField('offbudget')) {
    accountUpdate.offbudget = params.offbudget;
  }
  if (hasField('closed')) {
    accountUpdate.closed = params.closed;
  }
  if (hasField('bank_sync_status')) {
    accountUpdate.bank_sync_status = params.bank_sync_status ?? null;
  }

  if (Object.keys(accountUpdate).length > 1) {
    await db.update('accounts', accountUpdate);
  }

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
  const result = await db.first<{ balance: number }>(
    'SELECT sum(amount) as balance FROM transactions WHERE acct = ? AND isParent = 0 AND tombstone = 0 AND date <= ?',
    [id, db.toDateRepr(dayFromDate(cutoff))],
  );
  return result?.balance ? result.balance : 0;
}

async function getAccountProperties({ id }: { id: AccountEntity['id'] }) {
  const balanceResult = await db.first<{ balance: number }>(
    'SELECT sum(amount) as balance FROM transactions WHERE acct = ? AND isParent = 0 AND tombstone = 0',
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

async function linkGoCardlessAccount({
  requisitionId,
  account,
  upgradingId,
  offBudget = false,
  startingDate,
  startingBalance,
}: LinkAccountBaseParams & {
  requisitionId: string;
  account: SyncServerGoCardlessAccount;
}) {
  let id;
  const bank = await link.findOrCreateBank(account.institution, requisitionId);

  if (upgradingId) {
    const accRow = await db.first<db.DbAccount>(
      'SELECT * FROM accounts WHERE id = ?',
      [upgradingId],
    );

    if (!accRow) {
      throw new Error(`Account with ID ${upgradingId} not found.`);
    }

    id = accRow.id;
    await db.update('accounts', {
      id,
      account_id: account.account_id,
      bank: bank.id,
      account_sync_source: 'goCardless',
    });
  } else {
    id = uuidv4();
    await db.insertWithUUID('accounts', {
      id,
      account_id: account.account_id,
      mask: account.mask,
      name: account.name,
      official_name: account.official_name,
      bank: bank.id,
      offbudget: offBudget ? 1 : 0,
      account_sync_source: 'goCardless',
    });
    await db.insertPayee({
      name: '',
      transfer_acct: id,
    });
  }

  const syncRes = await bankSync.syncAccount(
    undefined,
    undefined,
    id,
    account.account_id,
    bank.bank_id,
    startingDate,
    startingBalance,
  );

  await handleSyncResponse(syncRes, id);

  connection.send('sync-event', {
    type: 'success',
    tables: ['transactions'],
  });

  return 'ok';
}

async function linkSimpleFinAccount({
  externalAccount,
  upgradingId,
  offBudget = false,
  startingDate,
  startingBalance,
}: LinkAccountBaseParams & {
  externalAccount: SyncServerSimpleFinAccount;
}) {
  let id;

  const institution = {
    name: externalAccount.institution ?? t('Unknown'),
  };

  const bank = await link.findOrCreateBank(
    institution,
    externalAccount.orgDomain ?? externalAccount.orgId,
  );

  if (upgradingId) {
    const accRow = await db.first<db.DbAccount>(
      'SELECT * FROM accounts WHERE id = ?',
      [upgradingId],
    );

    if (!accRow) {
      throw new Error(`Account with ID ${upgradingId} not found.`);
    }

    id = accRow.id;
    await db.update('accounts', {
      id,
      account_id: externalAccount.account_id,
      bank: bank.id,
      account_sync_source: 'simpleFin',
    });
  } else {
    id = uuidv4();
    await db.insertWithUUID('accounts', {
      id,
      account_id: externalAccount.account_id,
      name: externalAccount.name,
      official_name: externalAccount.name,
      bank: bank.id,
      offbudget: offBudget ? 1 : 0,
      account_sync_source: 'simpleFin',
    });
    await db.insertPayee({
      name: '',
      transfer_acct: id,
    });
  }

  const syncRes = await bankSync.syncAccount(
    undefined,
    undefined,
    id,
    externalAccount.account_id,
    bank.bank_id,
    startingDate,
    startingBalance,
  );

  await handleSyncResponse(syncRes, id);

  connection.send('sync-event', {
    type: 'success',
    tables: ['transactions'],
  });

  return 'ok';
}

async function linkPluggyAiAccount({
  externalAccount,
  upgradingId,
  offBudget = false,
  startingDate,
  startingBalance,
}: LinkAccountBaseParams & {
  externalAccount: SyncServerPluggyAiAccount;
}) {
  let id;

  const institution = {
    name: externalAccount.institution ?? t('Unknown'),
  };

  const bank = await link.findOrCreateBank(
    institution,
    externalAccount.orgDomain ?? externalAccount.orgId,
  );

  if (upgradingId) {
    const accRow = await db.first<db.DbAccount>(
      'SELECT * FROM accounts WHERE id = ?',
      [upgradingId],
    );

    if (!accRow) {
      throw new Error(`Account with ID ${upgradingId} not found.`);
    }

    id = accRow.id;
    await db.update('accounts', {
      id,
      account_id: externalAccount.account_id,
      bank: bank.id,
      account_sync_source: 'pluggyai',
    });
  } else {
    id = uuidv4();
    await db.insertWithUUID('accounts', {
      id,
      account_id: externalAccount.account_id,
      name: externalAccount.name,
      official_name: externalAccount.name,
      bank: bank.id,
      offbudget: offBudget ? 1 : 0,
      account_sync_source: 'pluggyai',
    });
    await db.insertPayee({
      name: '',
      transfer_acct: id,
    });
  }

  const syncRes = await bankSync.syncAccount(
    undefined,
    undefined,
    id,
    externalAccount.account_id,
    bank.bank_id,
    startingDate,
    startingBalance,
  );

  await handleSyncResponse(syncRes, id);

  connection.send('sync-event', {
    type: 'success',
    tables: ['transactions'],
  });

  return 'ok';
}

async function createAccount({
  name,
  balance = 0,
  offBudget = false,
  closed = false,
}: {
  name: string;
  balance?: number | undefined;
  offBudget?: boolean | undefined;
  closed?: boolean | undefined;
}) {
  const id: AccountEntity['id'] = await db.insertAccount({
    name,
    offbudget: offBudget ? 1 : 0,
    closed: closed ? 1 : 0,
  });

  await db.insertPayee({
    name: '',
    transfer_acct: id,
  });

  if (balance != null && balance !== 0) {
    const payee = await getStartingBalancePayee();

    await db.insertTransaction({
      account: id,
      amount: amountToInteger(balance),
      category: offBudget ? null : payee.category,
      payee: payee.id,
      date: monthUtils.currentDay(),
      cleared: true,
      starting_balance_flag: true,
    });
  }

  return id;
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

        rows.forEach(row => {
          if (row.transfer_id) {
            void db.updateTransaction({
              id: row.transfer_id,
              payee: null,
              transfer_id: null,
            });
          }

          void db.deleteTransaction({ id: row.id });
        });

        void db.deleteAccount({ id });
        void db.deleteTransferPayee({ id: transferPayee.id });
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
}: {
  id: AccountEntity['id'];
  targetId: AccountEntity['id'] | null;
}) {
  await db.moveAccount(id, targetId);
}

async function setSecret({
  name,
  value,
}: {
  name: string;
  value: string | null;
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
      serverConfig.BASE_SERVER + '/secret',
      {
        name,
        value,
      },
      {
        'X-ACTUAL-TOKEN': userToken,
      },
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

async function simpleFinStatus() {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  return post(
    serverConfig.SIMPLEFIN_SERVER + '/status',
    {},
    {
      'X-ACTUAL-TOKEN': userToken,
    },
  );
}

async function pluggyAiStatus() {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return { error: 'unauthorized' };
  }

  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('Failed to get server config.');
  }

  return post(
    serverConfig.PLUGGYAI_SERVER + '/status',
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

  try {
    return await post(
      serverConfig.SIMPLEFIN_SERVER + '/accounts',
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
    return await post(
      serverConfig.PLUGGYAI_SERVER + '/accounts',
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

type SyncResponse = {
  newTransactions: Array<TransactionEntity['id']>;
  matchedTransactions: Array<TransactionEntity['id']>;
  updatedAccounts: Array<AccountEntity['id']>;
  hasUpdates: boolean;
};

async function handleSyncResponse(
  res: {
    added: Array<TransactionEntity['id']>;
    updated: Array<TransactionEntity['id']>;
  },
  acctId: string,
): Promise<SyncResponse> {
  const { added, updated } = res;
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
    hasUpdates: true,
  };
}

type SyncError =
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
  }

  return 'attention-required';
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
  let hasAccountUpdates = false;

  for (const acct of accounts) {
    if (acct.account_sync_source === 'external') {
      if (acct.bankId && acct.account_id) {
        await db.update('accounts', {
          id: acct.id,
          bank_sync_status: 'sync-requested',
        });
        connection.send('sync-event', {
          type: 'success',
          tables: ['accounts'],
        });
        hasAccountUpdates = true;
      }
      continue;
    }

    if (acct.bankId && acct.account_id) {
      try {
        await db.update('accounts', {
          id: acct.id,
          bank_sync_status: 'pending',
        });
        connection.send('sync-event', {
          type: 'success',
          tables: ['accounts'],
        });
        hasAccountUpdates = true;

        logger.group('Bank Sync operation for account:', acct.name);
        const syncResponse = await bankSync.syncAccount(
          userId as string,
          userKey as string,
          acct.id,
          acct.account_id,
          acct.bankId,
        );

        const syncResponseData = await handleSyncResponse(
          syncResponse,
          acct.id,
        );

        newTransactions.push(...syncResponseData.newTransactions);
        matchedTransactions.push(...syncResponseData.matchedTransactions);
        updatedAccounts.push(...syncResponseData.updatedAccounts);
        connection.send('sync-event', {
          type: 'success',
          tables: ['accounts'],
        });
      } catch (err) {
        const error = err as Error;
        await db.update('accounts', {
          id: acct.id,
          bank_sync_status: getBankSyncStatusFromError(error),
        });
        errors.push(handleSyncError(error, acct));
        captureException({
          ...error,
          message: 'Failed syncing account "' + acct.name + '."',
        } as Error);
        connection.send('sync-event', {
          type: 'success',
          tables: ['accounts'],
        });
        hasAccountUpdates = true;
      } finally {
        logger.groupEnd();
      }
    }
  }

  if (updatedAccounts.length > 0 || hasAccountUpdates) {
    connection.send('sync-event', {
      type: 'success',
      tables:
        updatedAccounts.length > 0
          ? ['transactions', 'accounts']
          : ['accounts'],
    });
  }

  return {
    errors,
    newTransactions,
    matchedTransactions,
    updatedAccounts,
    hasUpdates:
      hasAccountUpdates ||
      newTransactions.length > 0 ||
      matchedTransactions.length > 0 ||
      updatedAccounts.length > 0,
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
    res: {
      errors: ReturnType<typeof handleSyncError>[];
      newTransactions: Array<TransactionEntity['id']>;
      matchedTransactions: Array<TransactionEntity['id']>;
      updatedAccounts: Array<AccountEntity['id']>;
      hasUpdates: boolean;
    };
  }> = [];

  logger.group('Bank Sync operation for all SimpleFin accounts');
  try {
    for (const account of accounts) {
      await db.update('accounts', {
        id: account.id,
        bank_sync_status: 'pending',
      });
    }
    if (accounts.length > 0) {
      connection.send('sync-event', {
        type: 'success',
        tables: ['accounts'],
      });
    }

    const syncResponses: Array<{
      accountId: AccountEntity['id'];
      res: {
        error_code: string;
        error_type: string;
        added: Array<TransactionEntity['id']>;
        updated: Array<TransactionEntity['id']>;
      };
    }> = await bankSync.simpleFinBatchSync(
      accounts.map(a => ({
        id: a.id,
        account_id: a.account_id || null,
      })),
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
      const hasUpdates = true;

      if (syncResponse.res?.error_code) {
        await db.update('accounts', {
          id: account.id,
          bank_sync_status: getBankSyncStatusFromError({
            type: 'BankSyncError',
            reason: 'Failed syncing account "' + account.name + '."',
            category: syncResponse.res.error_type,
            code: syncResponse.res.error_code,
          } as BankSyncError),
        });
        errors.push(
          handleSyncError(
            {
              type: 'BankSyncError',
              reason: 'Failed syncing account "' + account.name + '."',
              category: syncResponse.res.error_type,
              code: syncResponse.res.error_code,
            } as BankSyncError,
            account,
          ),
        );
      } else if (syncResponse.res) {
        const syncResponseData = await handleSyncResponse(
          syncResponse.res,
          account.id,
        );

        newTransactions.push(...syncResponseData.newTransactions);
        matchedTransactions.push(...syncResponseData.matchedTransactions);
        updatedAccounts.push(...syncResponseData.updatedAccounts);
      } else {
        await db.update('accounts', {
          id: account.id,
          bank_sync_status: 'attention-required',
        });
        errors.push(
          handleSyncError(
            new Error(
              'Failed syncing account "' + account.name + '": empty response',
            ),
            account,
          ),
        );
      }

      retVal.push({
        accountId: syncResponse.accountId,
        res: {
          errors,
          newTransactions,
          matchedTransactions,
          updatedAccounts,
          hasUpdates,
        },
      });
    }
  } catch (err) {
    for (const account of accounts) {
      const error = err as Error;
      await db.update('accounts', {
        id: account.id,
        bank_sync_status: getBankSyncStatusFromError(error),
      });
      retVal.push({
        accountId: account.id,
        res: {
          errors: [handleSyncError(error, account)],
          newTransactions: [],
          matchedTransactions: [],
          updatedAccounts: [],
          hasUpdates: true,
        },
      });
    }
  }

  if (retVal.some(a => a.res.updatedAccounts.length > 0)) {
    connection.send('sync-event', {
      type: 'success',
      tables: ['transactions', 'accounts'],
    });
  } else if (accounts.length > 0) {
    connection.send('sync-event', {
      type: 'success',
      tables: ['accounts'],
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

  try {
    const reconciled = await bankSync.reconcileTransactions(
      accountId,
      transactions,
      false,
      true,
      isPreview,
      opts?.defaultCleared,
      false,
      opts?.reimportDeleted,
    );
    return {
      errors: [],
      added: reconciled.added,
      updated: reconciled.updated,
      updatedPreview: reconciled.updatedPreview,
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
app.method('simplefin-accounts', simpleFinAccounts);
app.method('pluggyai-accounts', pluggyAiAccounts);
app.method('gocardless-get-banks', getGoCardlessBanks);
app.method('gocardless-create-web-token', createGoCardlessWebToken);
app.method('accounts-bank-sync', mutator(accountsBankSync));
app.method('simplefin-batch-sync', mutator(simpleFinBatchSync));
app.method('transactions-import', mutator(undoable(importTransactions)));
app.method('account-unlink', mutator(unlinkAccount));
