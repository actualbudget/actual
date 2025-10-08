import {
  attachPluginMiddleware,
  saveSecret,
  getSecret,
} from '@actual-app/plugins-core-sync-server';
import express, { Request, Response } from 'express';
import { PluggyClient } from 'pluggy-sdk';

// Import manifest (used during build)
import './manifest';

// Type definitions for Pluggy account structure
type PluggyConnector = {
  id: number | string;
  name: string;
  institutionUrl?: string;
};

type PluggyItem = {
  connector?: PluggyConnector;
};

type PluggyAccount = {
  id: string;
  name: string;
  number?: string;
  balance?: number;
  type?: string;
  itemId?: string;
  item?: PluggyItem;
  itemData?: PluggyItem;
  updatedAt?: string;
  currencyCode?: string;
  owner?: string;
};

// Create Express app
const app = express();

// Use JSON middleware for parsing request bodies
app.use(express.json());

// Attach the plugin middleware to enable IPC communication with sync-server
attachPluginMiddleware(app);

// Pluggy client singleton
let pluggyClient: PluggyClient | null = null;

async function getPluggyClient(req: Request): Promise<PluggyClient> {
  // Try to get credentials from secrets first
  const clientIdResult = await getSecret(req, 'clientId');
  const clientSecretResult = await getSecret(req, 'clientSecret');

  const clientId = clientIdResult.value || req.body.clientId;
  const clientSecret = clientSecretResult.value || req.body.clientSecret;

  if (!clientId || !clientSecret) {
    throw new Error('Pluggy.ai credentials not configured');
  }

  if (!pluggyClient) {
    pluggyClient = new PluggyClient({
      clientId,
      clientSecret,
    });
  }

  return pluggyClient;
}

/**
 * GET /status
 * Check if Pluggy.ai is configured
 */
app.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const clientIdResult = await getSecret(req, 'clientId');
    const configured = clientIdResult.value != null;

    res.json({
      status: 'ok',
      data: {
        configured,
      },
    });
  } catch (error) {
    res.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /accounts
 * Fetch accounts from Pluggy.ai
 * Body: { itemIds: string, clientId?: string, clientSecret?: string }
 *
 * If clientId and clientSecret are provided, they will be saved as secrets
 */
app.post('/accounts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemIds, clientId, clientSecret } = req.body;

    // If credentials are provided in request, save them
    if (clientId && clientSecret) {
      await saveSecret(req, 'clientId', clientId);
      await saveSecret(req, 'clientSecret', clientSecret);
    }

    // Get itemIds from request or from stored secrets
    let itemIdsArray: string[];

    if (itemIds) {
      // Parse itemIds from request (can be comma-separated string or array)
      if (typeof itemIds === 'string') {
        itemIdsArray = itemIds.split(',').map((id: string) => id.trim());
      } else if (Array.isArray(itemIds)) {
        itemIdsArray = itemIds;
      } else {
        res.json({
          status: 'error',
          error: 'itemIds must be a string or array',
        });
        return;
      }

      // Save itemIds for future use
      await saveSecret(req, 'itemIds', itemIdsArray.join(','));
    } else {
      // Try to get itemIds from secrets
      const storedItemIds = await getSecret(req, 'itemIds');
      if (!storedItemIds.value) {
        res.json({
          status: 'error',
          error:
            'itemIds is required (comma-separated string or array). Please provide itemIds in request or configure them first.',
        });
        return;
      }
      itemIdsArray = storedItemIds.value
        .split(',')
        .map((id: string) => id.trim());
    }

    if (!itemIdsArray.length) {
      res.json({
        status: 'error',
        error: 'At least one item ID is required',
      });
      return;
    }

    const client = await getPluggyClient(req);
    let accounts: PluggyAccount[] = [];

    // Fetch all accounts and their items with connector info
    for (const itemId of itemIdsArray) {
      const partial = await client.fetchAccounts(itemId);

      // For each account, also fetch the item to get connector details
      for (const account of partial.results) {
        try {
          const item = await client.fetchItem(itemId);
          // Attach item info to account for transformation
          (account as PluggyAccount).itemData = item;
        } catch (error) {
          console.error(
            `[PLUGGY ACCOUNTS] Error fetching item ${itemId}:`,
            error,
          );
        }
      }

      accounts = accounts.concat(partial.results as PluggyAccount[]);
    }

    // Transform Pluggy accounts to GenericBankSyncAccount format
    const transformedAccounts = accounts.map((account: PluggyAccount) => {
      const institution =
        account.itemData?.connector?.name ||
        account.item?.connector?.name ||
        'Unknown Institution';

      const connectorId =
        account.itemData?.connector?.id ||
        account.item?.connector?.id ||
        account.itemId;

      return {
        account_id: account.id,
        name: account.name,
        institution,
        balance: account.balance || 0,
        mask: account.number?.substring(account.number.length - 4),
        official_name: account.name,
        orgDomain:
          account.itemData?.connector?.institutionUrl ||
          account.item?.connector?.institutionUrl ||
          null,
        orgId: connectorId?.toString() || null,
      };
    });

    res.json({
      status: 'ok',
      data: {
        accounts: transformedAccounts,
      },
    });
  } catch (error) {
    res.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /transactions
 * Fetch transactions from Pluggy.ai
 * Body: { accountId: string, startDate: string, clientId?: string, clientSecret?: string }
 */
app.post(
  '/transactions',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId, startDate } = req.body;

      if (!accountId) {
        res.json({
          status: 'error',
          error: 'accountId is required',
        });
        return;
      }

      const client = await getPluggyClient(req);
      const transactions = await getTransactions(client, accountId, startDate);
      const account = (await client.fetchAccount(accountId)) as Record<
        string,
        unknown
      >;

      let startingBalance = parseInt(
        Math.round((account.balance as number) * 100).toString(),
      );
      if (account.type === 'CREDIT') {
        startingBalance = -startingBalance;
      }
      const date = getDate(new Date(account.updatedAt as string));

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

      const all: unknown[] = [];
      const booked: unknown[] = [];
      const pending: unknown[] = [];

      for (const trans of transactions) {
        const transRecord = trans as Record<string, unknown>;
        const newTrans: Record<string, unknown> = {};

        newTrans.booked = !(transRecord.status === 'PENDING');

        const transactionDate = new Date(transRecord.date as string);

        if (transactionDate < new Date(startDate) && !transRecord.sandbox) {
          continue;
        }

        newTrans.date = getDate(transactionDate);
        newTrans.payeeName = getPayeeName(transRecord);
        newTrans.notes = transRecord.descriptionRaw || transRecord.description;

        if (account.type === 'CREDIT') {
          if (transRecord.amountInAccountCurrency) {
            transRecord.amountInAccountCurrency =
              (transRecord.amountInAccountCurrency as number) * -1;
          }

          transRecord.amount = (transRecord.amount as number) * -1;
        }

        let amountInCurrency =
          (transRecord.amountInAccountCurrency as number) ??
          (transRecord.amount as number);
        amountInCurrency = Math.round(amountInCurrency * 100) / 100;

        newTrans.transactionAmount = {
          amount: amountInCurrency,
          currency: transRecord.currencyCode,
        };

        newTrans.transactionId = transRecord.id;
        newTrans.sortOrder = transactionDate.getTime();

        delete transRecord.amount;

        const finalTrans = { ...flattenObject(transRecord), ...newTrans };
        if (newTrans.booked) {
          booked.push(finalTrans);
        } else {
          pending.push(finalTrans);
        }
        all.push(finalTrans);
      }

      const sortFunction = (a: unknown, b: unknown) => {
        const aRec = a as Record<string, unknown>;
        const bRec = b as Record<string, unknown>;
        return (bRec.sortOrder as number) - (aRec.sortOrder as number);
      };

      const bookedSorted = booked.sort(sortFunction);
      const pendingSorted = pending.sort(sortFunction);
      const allSorted = all.sort(sortFunction);

      res.json({
        status: 'ok',
        data: {
          balances,
          startingBalance,
          transactions: {
            all: allSorted,
            booked: bookedSorted,
            pending: pendingSorted,
          },
        },
      });
    } catch (error) {
      res.json({
        status: 'ok',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  },
);

// Helper functions
async function getTransactions(
  client: PluggyClient,
  accountId: string,
  startDate: string,
): Promise<unknown[]> {
  let transactions: unknown[] = [];
  let result = await getTransactionsByAccountId(
    client,
    accountId,
    startDate,
    500,
    1,
  );
  transactions = transactions.concat(result.results);
  const totalPages = result.totalPages;
  let currentPage = result.page;

  while (currentPage !== totalPages) {
    result = await getTransactionsByAccountId(
      client,
      accountId,
      startDate,
      500,
      currentPage + 1,
    );
    transactions = transactions.concat(result.results);
    currentPage = result.page;
  }

  return transactions;
}

async function getTransactionsByAccountId(
  client: PluggyClient,
  accountId: string,
  startDate: string,
  pageSize: number,
  page: number,
): Promise<{ results: unknown[]; totalPages: number; page: number }> {
  const account = (await client.fetchAccount(accountId)) as Record<
    string,
    unknown
  >;

  // Sandbox account handling
  const sandboxAccount = account.owner === 'John Doe';
  const fromDate = sandboxAccount ? '2000-01-01' : startDate;

  const transactions = await client.fetchTransactions(accountId, {
    from: fromDate,
    pageSize,
    page,
  });

  if (sandboxAccount) {
    const mappedResults = transactions.results.map(
      (t: Record<string, unknown>) => ({
        ...t,
        sandbox: true,
      }),
    );
    transactions.results =
      mappedResults as unknown as typeof transactions.results;
  }

  return transactions;
}

function getDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value === null) {
      continue;
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenObject(value as Record<string, unknown>, newKey),
      );
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

function getPayeeName(trans: Record<string, unknown>): string {
  const merchant = trans.merchant as Record<string, string> | undefined;
  if (merchant && (merchant.name || merchant.businessName)) {
    return merchant.name || merchant.businessName || '';
  }

  const paymentData = trans.paymentData as
    | Record<string, Record<string, unknown>>
    | undefined;
  if (paymentData) {
    const { receiver, payer } = paymentData;

    if (trans.type === 'DEBIT' && receiver) {
      const receiverData = receiver as Record<string, unknown>;
      const docNum = receiverData.documentNumber as
        | Record<string, string>
        | undefined;
      return (receiverData.name as string) || docNum?.value || '';
    }

    if (trans.type === 'CREDIT' && payer) {
      const payerData = payer as Record<string, unknown>;
      const docNum = payerData.documentNumber as
        | Record<string, string>
        | undefined;
      return (payerData.name as string) || docNum?.value || '';
    }
  }

  return '';
}

console.log('Pluggy.ai Bank Sync Plugin loaded');
