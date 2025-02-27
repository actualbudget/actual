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

function getDate(date) {
  return date.toISOString().split('T')[0];
}

function flattenObject(obj, prefix = '') {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null) {
      continue;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
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

    const account = await pluggyaiService.getAccountById(accountId);

    let startingBalance = parseInt(
      Math.round(account.balance * 100).toString(),
    );
    if (account.type === 'CREDIT') {
      startingBalance = -startingBalance;
    }
    const date = getDate(new Date(account.updatedAt));

    const balances = [
      {
        balanceAmount: {
          amount: startingBalance,
          currency: account.currencyCode,
        },
        balanceType: 'expected',
        referenceDate: date,
      },
    ];

    const all = [];
    const booked = [];
    const pending = [];

    for (const trans of transactions) {
      const newTrans = {};

      newTrans.booked = !(trans.status === 'PENDING');

      const transactionDate = new Date(trans.date);

      if (transactionDate < startDate && !trans.sandbox) {
        continue;
      }

      newTrans.date = getDate(transactionDate);
      newTrans.payeeName = pluggyaiService.getPayeeName(trans);
      newTrans.notes = trans.descriptionRaw || trans.description;

      let amountInCurrency = trans.amountInAccountCurrency ?? trans.amount;
      amountInCurrency = Math.round(amountInCurrency * 100) / 100;

      newTrans.transactionAmount = {
        amount: account.type === 'BANK' ? amountInCurrency : -amountInCurrency,
        currency: trans.currencyCode,
      };

      newTrans.transactionId = trans.id;
      newTrans.valueDate = trans.date;
      newTrans.sortOrder = trans.date;

      const finalTrans = { ...flattenObject(trans), ...newTrans };
      if (newTrans.booked) {
        booked.push(finalTrans);
      } else {
        pending.push(finalTrans);
      }
      all.push(finalTrans);
    }

    const sortFunction = (a, b) => b.sortOrder - a.sortOrder;

    const bookedSorted = booked.sort(sortFunction);
    const pendingSorted = pending.sort(sortFunction);
    const allSorted = all.sort(sortFunction);

    return {
      balances,
      startingBalance,
      all: allSorted,
      booked: bookedSorted,
      pending: pendingSorted,
    };
  },
  getPayeeName: trans => {
    if (
      trans.merchant &&
      (trans.merchant.name || trans.merchant.businessName)
    ) {
      return trans.merchant.name || trans.merchant.businessName || '';
    }

    if (trans.paymentData) {
      const { receiver, payer } = trans.paymentData;

      if (trans.type === 'DEBIT' && receiver) {
        return receiver.name || receiver.documentNumber?.value || '';
      }

      if (trans.type === 'CREDIT' && payer) {
        return payer.name || payer.documentNumber?.value || '';
      }
    }

    return '';
  },
};
