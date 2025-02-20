import { v4 as uuidv4 } from 'uuid';

import { captureException } from '../../platform/exceptions';
import * as asyncStorage from '../../platform/server/asyncStorage';
import * as connection from '../../platform/server/connection';
import { isNonProductionEnvironment } from '../../shared/environment';
import { dayFromDate } from '../../shared/months';
import * as monthUtils from '../../shared/months';
import { amountToInteger } from '../../shared/util';
import {
  AccountEntity,
  CategoryEntity,
  SyncServerGoCardlessAccount,
  PayeeEntity,
  TransactionEntity,
  SyncServerSimpleFinAccount,
} from '../../types/models';
import { BankEntity } from '../../types/models/bank';
import { createApp } from '../app';
import * as db from '../db';
import {
  APIError,
  BankSyncError,
  PostError,
  TransactionError,
} from '../errors';
import { app as mainApp } from '../main-app';
import { mutator } from '../mutators';
import { get, post } from '../post';
import { getServer } from '../server-config';
import { batchMessages } from '../sync';
import { undoable, withUndo } from '../undo';

import * as link from './link';
import { getStartingBalancePayee } from './payees';
import * as bankSync from './sync';

export type AccountHandlers = {
  'account-update': typeof updateAccount;
  'accounts-get': typeof getAccounts;
  'account-balance': typeof getAccountBalance;
  'account-properties': typeof getAccountProperties;
  'gocardless-accounts-link': typeof linkGoCardlessAccount;
  'simplefin-accounts-link': typeof linkSimpleFinAccount;
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
  'simplefin-accounts': typeof simpleFinAccounts;
  'gocardless-get-banks': typeof getGoCardlessBanks;
  'gocardless-create-web-token': typeof createGoCardlessWebToken;
  'accounts-bank-sync': typeof accountsBankSync;
  'simplefin-batch-sync': typeof simpleFinBatchSync;
  'transactions-import': typeof importTransactions;
  'account-unlink': typeof unlinkAccount;
};

async function updateAccount({ id, name }: Pick<AccountEntity, 'id' | 'name'>) {
  await db.update('accounts', { id, name });
  return {};
}

async function getAccounts() {
  return db.getAccounts();
}

async function getAccountBalance({
  id,
  cutoff,
}: {
  id: string;
  cutoff: string | Date;
}) {
  const { balance }: { balance: number } = await db.first(
    'SELECT sum(amount) as balance FROM transactions WHERE acct = ? AND isParent = 0 AND tombstone = 0 AND date <= ?',
    [id, db.toDateRepr(dayFromDate(cutoff))],
  );
  return balance ? balance : 0;
}

async function getAccountProperties({ id }: { id: AccountEntity['id'] }) {
  const { balance }: { balance: number } = await db.first(
    'SELECT sum(amount) as balance FROM transactions WHERE acct = ? AND isParent = 0 AND tombstone = 0',
    [id],
  );
  const { count }: { count: number } = await db.first(
    'SELECT count(id) as count FROM transactions WHERE acct = ? AND tombstone = 0',
    [id],
  );

  return { balance: balance || 0, numTransactions: count };
}

async function linkGoCardlessAccount({
  requisitionId,
  account,
  upgradingId,
  offBudget = false,
}: {
  requisitionId: string;
  account: SyncServerGoCardlessAccount;
  upgradingId?: AccountEntity['id'] | undefined;
  offBudget?: boolean | undefined;
}) {
  let id;
  const bank = await link.findOrCreateBank(account.institution, requisitionId);

  if (upgradingId) {
    const accRow: AccountEntity = await db.first(
      'SELECT * FROM accounts WHERE id = ?',
      [upgradingId],
    );
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

  await bankSync.syncAccount(
    undefined,
    undefined,
    id,
    account.account_id,
    bank.bank_id,
  );

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
}: {
  externalAccount: SyncServerSimpleFinAccount;
  upgradingId?: AccountEntity['id'] | undefined;
  offBudget?: boolean | undefined;
}) {
  let id;

  const institution = {
    name: externalAccount.institution ?? 'Unknown',
  };

  const bank = await link.findOrCreateBank(
    institution,
    externalAccount.orgDomain ?? externalAccount.orgId,
  );

  if (upgradingId) {
    const accRow: AccountEntity = await db.first(
      'SELECT * FROM accounts WHERE id = ?',
      [upgradingId],
    );
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

  await bankSync.syncAccount(
    undefined,
    undefined,
    id,
    externalAccount.account_id,
    bank.bank_id,
  );

  await connection.send('sync-event', {
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
    const account: AccountEntity = await db.first(
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
      const rows = await db.runQuery<
        Pick<db.DbViewTransaction, 'id' | 'transfer_id'>
      >(
        'SELECT id, transfer_id FROM v_transactions WHERE account = ?',
        [id],
        true,
      );

      const { id: payeeId }: Pick<PayeeEntity, 'id'> = await db.first(
        'SELECT id FROM payees WHERE transfer_acct = ?',
        [id],
      );

      await batchMessages(async () => {
        // TODO: what this should really do is send a special message that
        // automatically marks the tombstone value for all transactions
        // within an account... or something? This is problematic
        // because another client could easily add new data that
        // should be marked as deleted.

        rows.forEach(row => {
          if (row.transfer_id) {
            db.updateTransaction({
              id: row.transfer_id,
              payee: null,
              transfer_id: null,
            });
          }

          db.deleteTransaction({ id: row.id });
        });

        db.deleteAccount({ id });
        db.deleteTransferPayee({ id: payeeId });
      });
    } else {
      if (balance !== 0 && transferAccountId == null) {
        throw APIError('balance is non-zero: transferAccountId is required');
      }

      await db.update('accounts', { id, closed: 1 });

      // If there is a balance we need to transfer it to the specified
      // account (and possibly categorize it)
      if (balance !== 0 && transferAccountId) {
        const { id: payeeId }: Pick<PayeeEntity, 'id'> = await db.first(
          'SELECT id FROM payees WHERE transfer_acct = ?',
          [transferAccountId],
        );

        await mainApp.handlers['transaction-add']({
          id: uuidv4(),
          payee: payeeId,
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
  targetId: AccountEntity['id'];
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
    console.error(error);
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
    cb: (error: string | null, data?: unknown | undefined) => void,
  ) {
    if (stopPolling) {
      return;
    }

    if (Date.now() - startTime >= 1000 * 60 * 10) {
      cb('timeout');
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
      if (data.error) {
        cb('unknown');
      } else {
        cb(null, data);
      }
    } else {
      setTimeout(() => getData(cb), 3000);
    }
  }

  return new Promise(resolve => {
    getData((error, data) => {
      if (error) {
        resolve({ error });
      } else {
        resolve({ data });
      }
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
  } catch (error) {
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
    console.error(error);
    return { error: 'failed' };
  }
}

type SyncResponse = {
  newTransactions: Array<TransactionEntity['id']>;
  matchedTransactions: Array<TransactionEntity['id']>;
  updatedAccounts: Array<AccountEntity['id']>;
};

function handleSyncResponse(
  res: {
    added: Array<TransactionEntity['id']>;
    updated: Array<TransactionEntity['id']>;
  },
  acct: db.DbAccount,
): SyncResponse {
  const { added, updated } = res;
  const newTransactions: Array<TransactionEntity['id']> = [];
  const matchedTransactions: Array<TransactionEntity['id']> = [];
  const updatedAccounts: Array<AccountEntity['id']> = [];

  newTransactions.push(...added);
  matchedTransactions.push(...updated);

  if (added.length > 0) {
    updatedAccounts.push(acct.id);
  }

  return {
    newTransactions,
    matchedTransactions,
    updatedAccounts,
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

function handleSyncError(
  err: Error | PostError | BankSyncError,
  acct: db.DbAccount,
): SyncError {
  if (err instanceof BankSyncError) {
    return {
      type: 'SyncError',
      accountId: acct.id,
      message: 'Failed syncing account “' + acct.name + '.”',
      category: err.category,
      code: err.code,
    };
  }

  if (err instanceof PostError && err.reason !== 'internal') {
    return {
      accountId: acct.id,
      message: err.reason
        ? err.reason
        : `Account “${acct.name}” is not linked properly. Please link it again.`,
    };
  }

  return {
    accountId: acct.id,
    message:
      'There was an internal error. Please get in touch https://actualbudget.org/contact for support.',
    internal: err.stack,
  };
}

export type SyncResponseWithErrors = SyncResponse & {
  errors: SyncError[];
};

async function accountsBankSync({
  ids = [],
}: {
  ids: Array<AccountEntity['id']>;
}): Promise<SyncResponseWithErrors> {
  const [[, userId], [, userKey]] = await asyncStorage.multiGet([
    'user-id',
    'user-key',
  ]);

  const accounts = await db.runQuery<
    db.DbAccount & { bankId: db.DbBank['bank_id'] }
  >(
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

  for (const acct of accounts) {
    if (acct.bankId && acct.account_id) {
      try {
        console.group('Bank Sync operation for account:', acct.name);
        const syncResponse = await bankSync.syncAccount(
          userId as string,
          userKey as string,
          acct.id,
          acct.account_id,
          acct.bankId,
        );

        const syncResponseData = handleSyncResponse(syncResponse, acct);

        newTransactions.push(...syncResponseData.newTransactions);
        matchedTransactions.push(...syncResponseData.matchedTransactions);
        updatedAccounts.push(...syncResponseData.updatedAccounts);
      } catch (err) {
        const error = err as Error;
        errors.push(handleSyncError(error, acct));
        captureException({
          ...error,
          message: 'Failed syncing account “' + acct.name + '.”',
        } as Error);
      } finally {
        console.groupEnd();
      }
    }
  }

  if (updatedAccounts.length > 0) {
    connection.send('sync-event', {
      type: 'success',
      tables: ['transactions'],
    });
  }

  return { errors, newTransactions, matchedTransactions, updatedAccounts };
}

async function simpleFinBatchSync({
  ids = [],
}: {
  ids: Array<AccountEntity['id']>;
}): Promise<
  Array<{ accountId: AccountEntity['id']; res: SyncResponseWithErrors }>
> {
  const accounts = await db.runQuery<
    db.DbAccount & { bankId: db.DbBank['bank_id'] }
  >(
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
    };
  }> = [];

  console.group('Bank Sync operation for all SimpleFin accounts');
  try {
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
        console.error(
          `Invalid account ID found in response: ${syncResponse.accountId}. Proceeding to the next account...`,
        );
        continue;
      }

      const errors: ReturnType<typeof handleSyncError>[] = [];
      const newTransactions: Array<TransactionEntity['id']> = [];
      const matchedTransactions: Array<TransactionEntity['id']> = [];
      const updatedAccounts: Array<AccountEntity['id']> = [];

      if (syncResponse.res.error_code) {
        errors.push(
          handleSyncError(
            {
              type: 'BankSyncError',
              reason: 'Failed syncing account “' + account.name + '.”',
              category: syncResponse.res.error_type,
              code: syncResponse.res.error_code,
            } as BankSyncError,
            account,
          ),
        );
      } else {
        const syncResponseData = handleSyncResponse(syncResponse.res, account);

        newTransactions.push(...syncResponseData.newTransactions);
        matchedTransactions.push(...syncResponseData.matchedTransactions);
        updatedAccounts.push(...syncResponseData.updatedAccounts);
      }

      retVal.push({
        accountId: syncResponse.accountId,
        res: { errors, newTransactions, matchedTransactions, updatedAccounts },
      });
    }
  } catch (err) {
    const errors = [];
    for (const account of accounts) {
      retVal.push({
        accountId: account.id,
        res: {
          errors,
          newTransactions: [],
          matchedTransactions: [],
          updatedAccounts: [],
        },
      });
      const error = err as Error;
      errors.push(handleSyncError(error, account));
    }
  }

  if (retVal.some(a => a.res.updatedAccounts.length > 0)) {
    connection.send('sync-event', {
      type: 'success',
      tables: ['transactions'],
    });
  }

  console.groupEnd();

  return retVal;
}

type ImportTransactionsResult = bankSync.ReconcileTransactionsResult & {
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
  transactions: TransactionEntity[];
  isPreview: boolean;
  opts?: {
    defaultCleared: boolean;
  };
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
  const { bank: bankId }: Pick<AccountEntity, 'bank'> = await db.first(
    'SELECT bank FROM accounts WHERE id = ?',
    [id],
  );

  if (!bankId) {
    return 'ok';
  }

  const accRow: AccountEntity = await db.first(
    'SELECT * FROM accounts WHERE id = ?',
    [id],
  );

  const isGoCardless = accRow.account_sync_source === 'goCardless';

  await db.updateAccount({
    id,
    account_id: null,
    bank: null,
    balance_current: null,
    balance_available: null,
    balance_limit: null,
    account_sync_source: null,
  });

  if (isGoCardless === false) {
    return;
  }

  const { count }: { count: number } = await db.first(
    'SELECT COUNT(*) as count FROM accounts WHERE bank = ?',
    [bankId],
  );

  // No more accounts are associated with this bank. We can remove
  // it from GoCardless.
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) {
    return 'ok';
  }

  if (count === 0) {
    const { bank_id: requisitionId }: Pick<BankEntity, 'bank_id'> =
      await db.first('SELECT bank_id FROM banks WHERE id = ?', [bankId]);

    const serverConfig = getServer();
    if (!serverConfig) {
      throw new Error('Failed to get server config.');
    }

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
      console.log({ error });
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
app.method('simplefin-accounts', simpleFinAccounts);
app.method('gocardless-get-banks', getGoCardlessBanks);
app.method('gocardless-create-web-token', createGoCardlessWebToken);
app.method('accounts-bank-sync', accountsBankSync);
app.method('simplefin-batch-sync', simpleFinBatchSync);
app.method('transactions-import', mutator(undoable(importTransactions)));
app.method('account-unlink', mutator(unlinkAccount));
