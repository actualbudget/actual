import { PluggyClient } from 'pluggy-sdk';

import { SecretName, secretsService } from '#services/secrets-service';

const pluggyClientCache = new Map();

function getPluggyClientCacheKey(options = {}) {
  const credentialSource = secretsService.getCredentialSource(
    [
      SecretName.pluggyai_clientId,
      SecretName.pluggyai_clientSecret,
      SecretName.pluggyai_itemIds,
    ],
    options,
  );
  return credentialSource === 'global'
    ? 'global:pluggyai'
    : `file:${options.fileId}:pluggyai`;
}

export function clearPluggyAiClientCache(clientKey) {
  pluggyClientCache.delete(clientKey);
}

function getPluggyClient(options = {}) {
  const credentials = {
    clientId: secretsService.get(SecretName.pluggyai_clientId, options),
    clientSecret: secretsService.get(SecretName.pluggyai_clientSecret, options),
  };
  const clientKey = getPluggyClientCacheKey(options);
  const client = pluggyClientCache.get(clientKey);
  if (client) {
    return client;
  }

  const newClient = new PluggyClient(credentials);
  pluggyClientCache.set(clientKey, newClient);

  return newClient;
}

export const pluggyaiService = {
  isConfigured: (options = {}) => {
    return !!(
      secretsService.get(SecretName.pluggyai_clientId, options) &&
      secretsService.get(SecretName.pluggyai_clientSecret, options) &&
      secretsService.get(SecretName.pluggyai_itemIds, options)
    );
  },

  getCredentialSource: (options = {}) =>
    secretsService.getCredentialSource(
      [
        SecretName.pluggyai_clientId,
        SecretName.pluggyai_clientSecret,
        SecretName.pluggyai_itemIds,
      ],
      options,
    ),

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

  getTransactionsByAccountId: async (accountId, startDate, options = {}) => {
    try {
      const client = getPluggyClient(options);

      const account = await pluggyaiService.getAccountById(accountId, options);

      // the sandbox data doesn't move the dates automatically so the
      // transactions are often older than 90 days. The owner on one of the
      // sandbox accounts is set to John Doe so in these cases we'll ignore
      // the start date.
      const sandboxAccount = account.owner === 'John Doe';

      if (sandboxAccount) startDate = '2000-01-01';

      let transactions = await client.fetchAllTransactions(accountId, {
        dateFrom: startDate,
      });

      if (sandboxAccount) {
        transactions = transactions.map(t => ({
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
};
