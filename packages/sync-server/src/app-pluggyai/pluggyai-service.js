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

  getInvestmentsByItemId: async itemId => {
    try {
      console.log(`Attempting to fetch investments for itemId: "${itemId}"`);
      console.log(`ItemId length: ${itemId.length}`);
      console.log(`ItemId format check: ${/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(itemId)}`);
      
      const client = getPluggyClient();
      
      // Tentar usar o método fetchInvestments se disponível
      if (typeof client.fetchInvestments === 'function') {
        const { results, total, ...rest } = await client.fetchInvestments(itemId);
        return {
          results,
          total,
          ...rest,
          hasError: false,
          errors: {},
        };
      } else {
        // Se o método não estiver disponível, fazer chamada direta à API
        console.log('fetchInvestments method not available, making direct API call');
        const apiKey = await client.createAPIKey();
        const response = await fetch(`https://api.pluggy.ai/investments?itemId=${itemId}`, {
          headers: {
            'X-API-KEY': apiKey.apiKey,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return {
          results: data.results || data,
          total: data.total || data.length || 0,
          hasError: false,
          errors: {},
        };
      }
    } catch (error) {
      console.error(`Error fetching investments for itemId "${itemId}": ${error.message}`);
      throw error;
    }
  },

  getTransactionsByAccountId: async (accountId, startDate, pageSize, page) => {
    try {
      const client = getPluggyClient();

      const account = await pluggyaiService.getAccountById(accountId);

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
  getTransactions: async (accountId, startDate) => {
    let transactions = [];
    let result = await pluggyaiService.getTransactionsByAccountId(
      accountId,
      startDate,
      500,
      1,
    );
    transactions = transactions.concat(result.results);
    const totalPages = result.totalPages;
    while (result.page !== totalPages) {
      result = await pluggyaiService.getTransactionsByAccountId(
        accountId,
        startDate,
        500,
        result.page + 1,
      );
      transactions = transactions.concat(result.results);
    }

    return transactions;
  },
};
