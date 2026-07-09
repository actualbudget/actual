import { PluggyClient } from 'pluggy-sdk';

import { SecretName, secretsService } from '#services/secrets-service';

const pluggyClients = new Map();

function hasCredentials(fileId = null) {
  return !!(
    secretsService.get(SecretName.pluggyai_clientId, fileId) &&
    secretsService.get(SecretName.pluggyai_clientSecret, fileId) &&
    secretsService.get(SecretName.pluggyai_itemIds, fileId)
  );
}

function getCredentialSource(fileId) {
  if (!!fileId && hasCredentials(fileId)) {
    return 'per-budget-file';
  }

  if (hasCredentials()) {
    return 'global';
  }

  return null;
}

function getCredentialsCacheEntry(credentialFileId) {
  const clientId = secretsService.get(
    SecretName.pluggyai_clientId,
    credentialFileId,
  );
  const clientSecret = secretsService.get(
    SecretName.pluggyai_clientSecret,
    credentialFileId,
  );

  return {
    cacheKey: JSON.stringify({
      fileId: credentialFileId,
      [SecretName.pluggyai_clientId]: clientId,
      [SecretName.pluggyai_clientSecret]: clientSecret,
    }),
    clientId,
    clientSecret,
  };
}

function getPluggyClient(fileId) {
  const credentialSource = getCredentialSource(fileId);
  if (!credentialSource) {
    throw new Error('Pluggy credentials are not configured');
  }

  const credentialFileId =
    credentialSource === 'per-budget-file' ? fileId : null;
  const { cacheKey, clientId, clientSecret } =
    getCredentialsCacheEntry(credentialFileId);
  let pluggyClient = pluggyClients.get(cacheKey);
  if (!pluggyClient) {
    pluggyClient = new PluggyClient({
      clientId,
      clientSecret,
    });
    pluggyClients.set(cacheKey, pluggyClient);
  }

  return pluggyClient;
}

export const pluggyaiService = {
  isConfigured: fileId => getCredentialSource(fileId) != null,

  getCredentialSource,

  getAccountsByItemId: async (itemId, fileId) => {
    try {
      const client = getPluggyClient(fileId);
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
  getAccountById: async (accountId, fileId) => {
    try {
      const client = getPluggyClient(fileId);
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

  getTransactionsByAccountId: async (accountId, startDate, fileId) => {
    try {
      const client = getPluggyClient(fileId);

      const account = await pluggyaiService.getAccountById(accountId, fileId);

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
