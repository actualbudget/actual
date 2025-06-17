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

// Função para validar se é um UUID válido
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
      console.log('Raw itemIds from config:', itemIdsRaw);

      const itemIds = itemIdsRaw.split(',').map(item => item.trim());

      console.log('Parsed itemIds:', itemIds);
      console.log('ItemIds validation:');
      itemIds.forEach((item, index) => {
        const isValid = isValidUUID(item);
        console.log(
          `  ${index + 1}. "${item}" - Valid UUID: ${isValid} (Length: ${item.length})`,
        );
      });

      // TEMPORÁRIO: usar todos os itemIds mesmo que não sejam UUID válidos
      // AVISO: Isto pode não funcionar com a API da Pluggy para investimentos
      const validItemIds = itemIds.filter(item => item && item.length > 0);

      if (validItemIds.length === 0) {
        console.log('No itemIds found');
        res.send({
          status: 'ok',
          data: {
            accounts: [],
            error: 'No itemIds configured',
          },
        });
        return;
      }

      console.log(`Processing ${validItemIds.length} itemIds:`, validItemIds);

      let accounts = [];

      for (const item of validItemIds) {
        console.log(`Fetching accounts for itemId: ${item}`);
        const partial = await pluggyaiService.getAccountsByItemId(item);
        console.log(
          `Accounts fetched for item ${item}:`,
          partial.results.map(acc => ({
            id: acc.id,
            name: acc.name,
            type: acc.type,
          })),
        );
        accounts = accounts.concat(partial.results);

        // Buscar investimentos também, pois podem estar em endpoint separado
        // PULAR INVESTIMENTOS SE O ITEMID NÃO FOR UUID VÁLIDO
        if (isValidUUID(item)) {
          try {
            console.log(`Fetching investments for itemId: ${item}`);
            const investments =
              await pluggyaiService.getInvestmentsByItemId(item);
            console.log(
              `Raw investments data for item ${item}:`,
              JSON.stringify(investments.results, null, 2),
            );
            console.log(
              `Investments fetched for item ${item}:`,
              investments.results.map(inv => ({
                id: inv.id,
                name: inv.name,
                type: 'INVESTMENT',
                balance: inv.balance,
                number: inv.number,
                subtype: inv.subtype,
                investmentType: inv.type,
              })),
            );

            // Consolidar investimentos por instituição
            if (investments.results.length > 0) {
              const consolidatedInvestments =
                consolidateInvestmentsByInvestment(investments.results, item);
              console.log(
                `Consolidated investments for item ${item}:`,
                consolidatedInvestments.map(acc => ({
                  id: acc.id,
                  name: acc.name,
                  balance: acc.balance,
                  totalBalance: acc.investmentData?.totalBalance,
                  investmentCount: acc.investmentData?.investmentCount,
                })),
              );
              accounts = accounts.concat(consolidatedInvestments);
            }
          } catch (investmentError) {
            console.log(
              `No investments found for item ${item}:`,
              investmentError.message,
            );
          }
        } else {
          console.log(
            `⚠️  Skipping investments for itemId "${item}" - not a valid UUID format`,
          );
          console.log(
            `   Para buscar investimentos, você precisa de um itemId no formato UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
          );
        }
      }

      console.log('All account types found:', [
        ...new Set(accounts.map(acc => acc.type)),
      ]);

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

      // Verificar se é uma conta consolidada de investimento
      if (accountId.startsWith('investment-')) {
        const idParts = accountId.replace('investment-', '');
        console.log('Processing investment account ID:', accountId);
        console.log('ID parts after removing prefix:', idParts);

        // Para o formato 'investment-444588ee-db35-427a-a72e-7c4e03da04a6-all'
        // Queremos extrair '444588ee-db35-427a-a72e-7c4e03da04a6'
        let itemId;
        if (idParts.endsWith('-all')) {
          // Remover o '-all' do final e usar o resto como itemId
          itemId = idParts.slice(0, -4); // Remove '-all'
        } else {
          // Fallback para o formato antigo
          itemId = idParts.split('-')[0];
        }

        console.log('Extracted itemId:', itemId);
        console.log('ItemId length:', itemId.length);
        console.log(
          'ItemId is valid UUID:',
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            itemId,
          ),
        );

        // Buscar todos os investimentos do item
        const investments =
          await pluggyaiService.getInvestmentsByItemId(itemId);

        // Consolidar investimentos em uma única conta
        const consolidatedInvestments = consolidateInvestmentsByInvestment(
          investments.results,
          itemId,
        );
        const targetAccount = consolidatedInvestments.find(
          acc => acc.id === accountId,
        );

        if (targetAccount) {
          // Buscar transações de todos os investimentos da conta consolidada
          for (const investment of targetAccount.investmentData.investments) {
            try {
              const investmentTransactions =
                await pluggyaiService.getTransactions(investment.id, startDate);
              transactions = transactions.concat(investmentTransactions);
            } catch (error) {
              console.log(
                `Error fetching transactions for investment ${investment.id}:`,
                error.message,
              );
            }
          }
          account = targetAccount;
        } else {
          throw new Error(`Investment account ${accountId} not found`);
        }
      } else {
        // Conta normal
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
  console.log(`Starting consolidation for ${investments.length} investments`);

  if (investments.length === 0) {
    return [];
  }

  // Criar uma única conta consolidada com todos os investimentos
  let totalBalance = 0;
  const allInvestments = [];
  let institutionName = 'Investimentos';

  investments.forEach((investment, index) => {
    console.log(`Processing investment ${index + 1}:`, {
      id: investment.id,
      name: investment.name,
      balance: investment.balance,
      balanceType: typeof investment.balance,
      number: investment.number,
      subtype: investment.subtype,
      type: investment.type,
    });

    allInvestments.push(investment);

    // Garantir que o saldo seja um número válido
    let investmentBalance = 0;
    if (investment.balance !== undefined && investment.balance !== null) {
      investmentBalance = Number(investment.balance);
      if (isNaN(investmentBalance)) {
        console.log(
          `Invalid balance for investment ${investment.id}: ${investment.balance}`,
        );
        investmentBalance = 0;
      }
    }

    totalBalance += investmentBalance;

    // Pegar o nome da instituição do primeiro investimento que tiver
    if (investment.institution?.name && institutionName === 'Investimentos') {
      institutionName = investment.institution.name;
    }

    console.log(
      `Added investment ${investment.id}. Balance: ${investmentBalance}, Total so far: ${totalBalance}`,
    );
  });

  console.log(
    `Creating single consolidated investment account with total balance: ${totalBalance} (type: ${typeof totalBalance})`,
  );

  // Garantir que o totalBalance seja um número válido
  if (isNaN(totalBalance)) {
    console.log('Total balance is NaN, setting to 0');
    totalBalance = 0;
  }

  // Retornar uma única conta com todos os investimentos
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

  console.log(`Final consolidated account:`, {
    id: consolidatedAccount.id,
    name: consolidatedAccount.name,
    balance: consolidatedAccount.balance,
    balanceType: typeof consolidatedAccount.balance,
    totalBalance: consolidatedAccount.investmentData.totalBalance,
    totalBalanceType: typeof consolidatedAccount.investmentData.totalBalance,
    investmentCount: consolidatedAccount.investmentData.investmentCount,
  });

  return [consolidatedAccount];
}
