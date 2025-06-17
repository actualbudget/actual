import express from 'express';

import { handleError } from '../app-gocardless/util/handle-error.js';
import { SecretName, secretsService } from '../services/secrets-service.js';
import { requestLoggerMiddleware } from '../util/middlewares.js';

import { pluggyaiService } from './pluggyai-service.js';

const app = express();
export { app as handlers };
app.use(express.json());
app.use(requestLoggerMiddleware);

app.post(
  '/status',
  handleError(async (req, res) => {
    const clientId = secretsService.get(SecretName.pluggyai_clientId);
    const configured = clientId != null;

    res.send({
      status: 'ok',
      data: {
        configured,
      },
    });
  }),
);

function isValidUUID(str) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

app.post(
  '/accounts',
  handleError(async (req, res) => {
    try {
      const itemIdsRaw = secretsService.get(SecretName.pluggyai_itemIds);

      const itemIds = itemIdsRaw.split(',').map(item => item.trim());

      itemIds.forEach(item => {
        const _isValid = isValidUUID(item);
      });

      // TODO: Use only valid UUID itemIds for investments API calls
      // WARNING: Non-UUID itemIds may not work with Pluggy investments API
      const validItemIds = itemIds.filter(item => item && item.length > 0);

      if (validItemIds.length === 0) {
        res.send({
          status: 'ok',
          data: {
            accounts: [],
            error: 'No itemIds configured',
          },
        });
        return;
      }

      let accounts = [];

      for (const item of validItemIds) {
        const partial = await pluggyaiService.getAccountsByItemId(item);
        accounts = accounts.concat(partial.results);

        // Fetch investments as well, as they may be in a separate endpoint
        // SKIP INVESTMENTS IF ITEMID IS NOT A VALID UUID
        if (isValidUUID(item)) {
          try {
            const investments =
              await pluggyaiService.getInvestmentsByItemId(item);

            // Consolidate investments by institution
            if (investments.results.length > 0) {
              const consolidatedInvestments =
                consolidateInvestmentsByInvestment(investments.results, item);
              accounts = accounts.concat(consolidatedInvestments);
            }
          } catch (investmentError) {
            // Silently continue if investments not found for this itemId
          }
        }
      }

      res.send({
        status: 'ok',
        data: {
          accounts,
        },
      });
    } catch (error) {
      res.send({
        status: 'ok',
        data: {
          error: error.message,
        },
      });
    }
  }),
);

app.post(
  '/transactions',
  handleError(async (req, res) => {
    const { accountId, startDate } = req.body || {};

    try {
      let transactions = [];
      let account;

      if (accountId.startsWith('investment-')) {
        const idParts = accountId.replace('investment-', '');

        let itemId;
        if (idParts.endsWith('-all')) {
          // Remove '-all' suffix and use the rest as itemId
          itemId = idParts.slice(0, -4); // Remove '-all'
        } else {
          // Fallback for legacy format
          itemId = idParts.split('-')[0];
        }

        const investments =
          await pluggyaiService.getInvestmentsByItemId(itemId);

        const consolidatedInvestments = consolidateInvestmentsByInvestment(
          investments.results,
          itemId,
        );
        const targetAccount = consolidatedInvestments.find(
          acc => acc.id === accountId,
        );

        if (targetAccount) {
          for (const investment of targetAccount.investmentData.investments) {
            try {
              const investmentTransactions =
                await pluggyaiService.getTransactions(investment.id, startDate);
              transactions = transactions.concat(investmentTransactions);
            } catch (error) {
              // Continue if transaction fetch fails for individual investment
            }
          }
          account = targetAccount;
        } else {
          throw new Error('Investment account not found');
        }
      } else {
        transactions = await pluggyaiService.getTransactions(
          accountId,
          startDate,
        );
        account = await pluggyaiService.getAccountById(accountId);
      }

      let startingBalance;
      if (account.type === 'CREDIT') {
        startingBalance = -parseInt(
          Math.round(account.balance * 100).toString(),
        );
      } else if (account.type === 'INVESTMENT') {
        startingBalance = parseInt(
          Math.round(
            (account.investmentData?.totalBalance || account.balance) * 100,
          ).toString(),
        );
      } else {
        startingBalance = parseInt(
          Math.round(account.balance * 100).toString(),
        );
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
        newTrans.payeeName = getPayeeName(trans);
        newTrans.notes = trans.descriptionRaw || trans.description;

        if (account.type === 'CREDIT') {
          if (trans.amountInAccountCurrency) {
            trans.amountInAccountCurrency *= -1;
          }
          trans.amount *= -1;
        } else if (account.type === 'INVESTMENT') {
          if (trans.amountInAccountCurrency !== undefined) {
            trans.amountInAccountCurrency = Number(
              trans.amountInAccountCurrency,
            );
          }
          if (trans.amount !== undefined) {
            trans.amount = Number(trans.amount);
          }
        }

        let amountInCurrency = trans.amountInAccountCurrency ?? trans.amount;
        amountInCurrency = Math.round(amountInCurrency * 100) / 100;

        newTrans.transactionAmount = {
          amount: amountInCurrency,
          currency: trans.currencyCode,
        };

        newTrans.transactionId = trans.id;
        newTrans.sortOrder = transactionDate.getTime();

        delete trans.amount;

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

      res.send({
        status: 'ok',
        data: {
          balances,
          startingBalance,
          investmentBalance:
            account.type === 'INVESTMENT'
              ? account.investmentData?.totalBalance
              : undefined,
          transactions: {
            all: allSorted,
            booked: bookedSorted,
            pending: pendingSorted,
          },
        },
      });
    } catch (error) {
      res.send({
        status: 'ok',
        data: {
          error: error.message,
        },
      });
    }
    return;
  }),
);

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

function getPayeeName(trans) {
  if (trans.merchant && (trans.merchant.name || trans.merchant.businessName)) {
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
}

function consolidateInvestmentsByInvestment(investments, itemId) {
  if (investments.length === 0) {
    return [];
  }

  // Create a single consolidated account with all investments
  let totalBalance = 0;
  const allInvestments = [];
  let institutionName = 'Investimentos';

  investments.forEach(investment => {
    allInvestments.push(investment);

    // Ensure balance is a valid number
    let investmentBalance = 0;
    if (investment.balance !== undefined && investment.balance !== null) {
      investmentBalance = Number(investment.balance);
      if (isNaN(investmentBalance)) {
        investmentBalance = 0;
      }
    }

    totalBalance += investmentBalance;

    // Get institution name from first investment that has one
    if (investment.institution?.name && institutionName === 'Investimentos') {
      institutionName = investment.institution.name;
    }
  });

  // Ensure totalBalance is a valid number
  if (isNaN(totalBalance)) {
    totalBalance = 0;
  }

  // Return a single account with all investments consolidated
  const consolidatedAccount = {
    id: `investment-${itemId}-all`,
    name: `${institutionName} - Investimentos`,
    type: 'INVESTMENT',
    balance: totalBalance,
    owner: allInvestments[0]?.owner || 'N/A',
    taxNumber: 'CONSOLIDATED',
    currencyCode: allInvestments[0]?.currencyCode || 'BRL',
    itemId,
    investmentData: {
      totalBalance,
      investmentCount: allInvestments.length,
      investmentType: 'CONSOLIDATED',
      investments: allInvestments,
    },
    updatedAt: new Date().toISOString(),
  };

  return [consolidatedAccount];
}
