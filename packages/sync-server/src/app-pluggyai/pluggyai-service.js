import crypto from 'crypto';

import { PluggyClient } from 'pluggy-sdk';

import { SecretName, secretsService } from '../services/secrets-service';

const pluggyClientCache = new Map();

function getPluggyClient(options = {}) {
  let cacheKey = options.fileId ?? '';
  if (options.password != null && options.password !== '') {
    cacheKey += `:${crypto.createHash('sha256').update(options.password).digest('hex')}`;
  }
  if (!pluggyClientCache.has(cacheKey)) {
    const clientId = secretsService.get(SecretName.pluggyai_clientId, options);
    const clientSecret = secretsService.get(
      SecretName.pluggyai_clientSecret,
      options,
    );

    pluggyClientCache.set(
      cacheKey,
      new PluggyClient({
        clientId,
        clientSecret,
      }),
    );
  }

  return pluggyClientCache.get(cacheKey);
}

export const pluggyaiService = {
  isConfigured: (options = {}) => {
    return !!(
      secretsService.get(SecretName.pluggyai_clientId, options) &&
      secretsService.get(SecretName.pluggyai_clientSecret, options) &&
      secretsService.get(SecretName.pluggyai_itemIds, options)
    );
  },

  getAccountsByItemId: async (itemId, options = {}) => {
    try {
      const client = getPluggyClient(options);
      const { results, total, ...rest } = await client.fetchAccounts(itemId);
      return {
        results,
        total,
        ...rest,
        hasError: false,
        errors: {},
      };
    } catch (error) {
      console.error(`Error fetching accounts: ${error.message}`);
      throw error;
    }
  },
  getAccountById: async (accountId, options = {}) => {
    try {
      const client = getPluggyClient(options);
      const account = await client.fetchAccount(accountId);
      return {
        ...account,
        hasError: false,
        errors: {},
      };
    } catch (error) {
      console.error(`Error fetching account: ${error.message}`);
      throw error;
    }
  },

  getTransactionsByAccountId: async (
    accountId,
    startDate,
    pageSize,
    page,
    options = {},
  ) => {
    try {
      const client = getPluggyClient(options);

      const account = await pluggyaiService.getAccountById(accountId, options);

      // the sandbox data doesn't move the dates automatically so the
      // transactions are often older than 90 days. The owner on one of the
      // sandbox accounts is set to John Doe so in these cases we'll ignore
      // the start date.
      const sandboxAccount = account.owner === 'John Doe';

      if (sandboxAccount) startDate = '2000-01-01';

      const transactions = await client.fetchTransactions(accountId, {
        from: startDate,
        pageSize,
        page,
      });

      if (sandboxAccount) {
        transactions.results = transactions.results.map(t => ({
          ...t,
          sandbox: true,
        }));
      }

      return {
        ...transactions,
        hasError: false,
        errors: {},
      };
    } catch (error) {
      console.error(`Error fetching transactions: ${error.message}`);
      throw error;
    }
  },
  getTransactions: async (accountId, startDate, options = {}) => {
    let transactions = [];
    let result = await pluggyaiService.getTransactionsByAccountId(
      accountId,
      startDate,
      500,
      1,
      options,
    );
    transactions = transactions.concat(result.results);
    const totalPages = result.totalPages;
    while (result.page !== totalPages) {
      result = await pluggyaiService.getTransactionsByAccountId(
        accountId,
        startDate,
        500,
        result.page + 1,
        options,
      );
      transactions = transactions.concat(result.results);
    }

    return transactions;
  },
};
