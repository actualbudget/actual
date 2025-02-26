import { PluggyClient } from 'pluggy-sdk';

import { SecretName, secretsService } from '../services/secrets-service.js';

let pluggyClient = null;

function getPluggyClient() {
  if (!pluggyClient) {
    const clientId = secretsService.get(SecretName.pluggyai_clientId);
    const clientSecret = secretsService.get(SecretName.pluggyai_clientSecret);

    pluggyClient = new PluggyClient({
      clientId,
      clientSecret,
    });
  }

  return pluggyClient;
}

export const pluggyaiService = {
  isConfigured: () => {
    return !!(
      secretsService.get(SecretName.pluggyai_clientId) &&
      secretsService.get(SecretName.pluggyai_clientSecret) &&
      secretsService.get(SecretName.pluggyai_itemIds)
    );
  },

  getAccountsByItemId: async itemId => {
    try {
      const client = getPluggyClient();
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
  getAccountById: async accountId => {
    try {
      const client = getPluggyClient();
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

  getTransactionsByAccountId: async (accountId, startDate, pageSize, page) => {
    try {
      const client = getPluggyClient();

      const transactions = await client.fetchTransactions(accountId, {
        from: startDate,
        pageSize,
        page,
      });

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
