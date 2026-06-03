/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  attachPluginMiddleware,
  BankSyncErrorCode,
  getSecret,
  saveSecret,
} from '@actual-app/plugins-core-sync-server';
import type { BankSyncError } from '@actual-app/plugins-core-sync-server';
import express from 'express';
import type { Request, Response } from 'express';
import jwt from 'jws';
import NordigenNode from 'nordigen-node';
import { v4 as uuidv4 } from 'uuid';

// Import manifest (used during build)
import './manifest';
import { bankFactory } from './banks/bank-factory';

// nordigen-node exports the client as default
const GoCardlessClient = NordigenNode;

// Type definitions
type GoCardlessTransaction = {
  transactionId: string;
  bookingDate?: string;
  valueDate?: string;
  transactionAmount: {
    amount: string;
    currency: string;
  };
  debtorName?: string;
  creditorName?: string;
  remittanceInformationUnstructured?: string;
  remittanceInformationUnstructuredArray?: string[];
  [key: string]: unknown;
};

type GoCardlessBalance = {
  balanceAmount: {
    amount: string;
    currency: string;
  };
  balanceType: string;
  referenceDate?: string;
};

// Create Express app
const app = express();
app.use(express.json());

// Attach the plugin middleware to enable IPC communication with sync-server
attachPluginMiddleware(app);

// Client cache
const clients = new Map<string, any>();

async function getGoCardlessClient(req: Request): Promise<any> {
  const secretIdResult = await getSecret(req, 'secretId');
  const secretKeyResult = await getSecret(req, 'secretKey');

  const secretId = secretIdResult.value;
  const secretKey = secretKeyResult.value;

  if (!secretId || !secretKey) {
    throw new Error('GoCardless credentials not configured');
  }

  const hash = JSON.stringify({ secretId, secretKey });

  if (!clients.has(hash)) {
    clients.set(
      hash,
      new GoCardlessClient({
        secretId,
        secretKey,
        baseUrl: 'https://bankaccountdata.gocardless.com',
      }),
    );
  }

  return clients.get(hash)!;
}

function isExpiredJwtToken(token: string | null | undefined): boolean {
  if (!token) return true;

  const decodedToken = jwt.decode(token);
  if (!decodedToken) return true;

  const payload = decodedToken.payload as { exp: number };
  const clockTimestamp = Math.floor(Date.now() / 1000);
  return clockTimestamp >= payload.exp;
}

async function ensureValidToken(client: any): Promise<void> {
  if (isExpiredJwtToken(client.token)) {
    await client.generateToken();
  }
}

function handleGoCardlessError(error: any): never {
  const status = error?.response?.status;
  let errorCode = BankSyncErrorCode.UNKNOWN_ERROR;
  let errorType = 'UNKNOWN_ERROR';
  let reason = 'An unknown error occurred';

  switch (status) {
    case 400:
      errorCode = BankSyncErrorCode.INVALID_REQUEST;
      errorType = 'INVALID_INPUT_DATA';
      reason = 'Invalid request data';
      break;
    case 401:
      errorCode = BankSyncErrorCode.INVALID_CREDENTIALS;
      errorType = 'INVALID_TOKEN';
      reason = 'Invalid GoCardless credentials';
      break;
    case 403:
      errorCode = BankSyncErrorCode.UNAUTHORIZED;
      errorType = 'ACCESS_DENIED';
      reason = 'Access denied';
      break;
    case 404:
      errorCode = BankSyncErrorCode.ACCOUNT_NOT_FOUND;
      errorType = 'NOT_FOUND';
      reason = 'Resource not found';
      break;
    case 409:
      errorCode = BankSyncErrorCode.SERVER_ERROR;
      errorType = 'RESOURCE_SUSPENDED';
      reason = 'Resource suspended';
      break;
    case 429:
      errorCode = BankSyncErrorCode.RATE_LIMIT;
      errorType = 'RATE_LIMIT_EXCEEDED';
      reason = 'Rate limit exceeded';
      break;
    case 500:
      errorCode = BankSyncErrorCode.SERVER_ERROR;
      errorType = 'SERVER_ERROR';
      reason = 'GoCardless server error';
      break;
    case 503:
      errorCode = BankSyncErrorCode.SERVER_ERROR;
      errorType = 'SERVICE_ERROR';
      reason = 'GoCardless service unavailable';
      break;
  }

  throw {
    type: 'BankSyncError',
    error_type: errorType,
    error_code: errorCode,
    status: 'error',
    reason,
    details: { originalError: error?.message, status },
  } as BankSyncError;
}

/**
 * POST /status
 * Check if GoCardless is configured
 */
async function statusHandler(req: Request, res: Response): Promise<void> {
  try {
    const { secretId, secretKey } = (req.body ?? {}) as {
      secretId?: string;
      secretKey?: string;
    };

    // Allow configuration via POST by supplying credentials
    if (secretId && secretKey) {
      await saveSecret(req, 'secretId', secretId);
      await saveSecret(req, 'secretKey', secretKey);
    }

    const secretIdResult = await getSecret(req, 'secretId');
    const secretKeyResult = await getSecret(req, 'secretKey');

    const configured = !!(secretIdResult.value && secretKeyResult.value);

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
}

app.get('/status', statusHandler);
app.post('/status', statusHandler);

/**
 * POST /accounts
 * Fetch accounts from GoCardless
 * Body: { requisitionId: string, secretId?: string, secretKey?: string }
 */
app.post('/accounts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { requisitionId, secretId, secretKey } = req.body;

    // Save credentials if provided
    if (secretId && secretKey) {
      await saveSecret(req, 'secretId', secretId);
      await saveSecret(req, 'secretKey', secretKey);
    }

    if (!requisitionId) {
      res.json({
        status: 'error',
        error: 'requisitionId is required',
      });
      return;
    }

    const client = await getGoCardlessClient(req);
    await ensureValidToken(client);

    // Get requisition
    const requisition =
      await client.requisition.getRequisitionById(requisitionId);
    const institutionName = await (async () => {
      try {
        const institution = await client.institution.getInstitutionById(
          requisition.institution_id,
        );
        return (institution?.name as string) || requisition.institution_id;
      } catch {
        return requisition.institution_id;
      }
    })();

    if (requisition.status !== 'LN') {
      res.json({
        status: 'ok',
        data: {
          error_type: 'REQUISITION_NOT_LINKED',
          error_code: 'REQUISITION_NOT_LINKED',
          status: 'pending',
          requisitionStatus: requisition.status,
          reason: 'Requisition is not yet linked',
        },
      });
      return;
    }

    // Fetch all account details
    const accounts = await Promise.all(
      requisition.accounts.map(async (accountId: string) => {
        try {
          const [details, metadata] = await Promise.all([
            client.account(accountId).getDetails(),
            client.account(accountId).getMetadata(),
          ]);

          const accountDetails = details?.account || {};
          const metadataDetails = metadata || {};

          // Merge account data
          const mergedAccount: Record<string, unknown> = {};
          const uniqueKeys = new Set([
            ...Object.keys(accountDetails),
            ...Object.keys(metadataDetails),
          ]);

          for (const key of uniqueKeys) {
            mergedAccount[key] = metadataDetails[key] || accountDetails[key];
          }

          return {
            account_id: accountId,
            name:
              (mergedAccount.name as string) ||
              (mergedAccount.product as string) ||
              accountId,
            institution: institutionName,
            iban: mergedAccount.iban as string | undefined,
            mask: mergedAccount.iban
              ? (mergedAccount.iban as string).slice(-4)
              : accountId.slice(-4),
            official_name:
              (mergedAccount.name as string) ||
              (mergedAccount.product as string),
            currency: mergedAccount.currency as string | undefined,
          };
        } catch (error) {
          console.error(`Error fetching account ${accountId}:`, error);
          return null;
        }
      }),
    );

    const validAccounts = accounts.filter(a => a !== null);

    res.json({
      status: 'ok',
      data: {
        accounts: validAccounts,
      },
    });
  } catch (error) {
    console.error('[GOCARDLESS ACCOUNTS] Error:', error);

    if ((error as any).type === 'BankSyncError') {
      res.json({
        status: 'ok',
        data: error,
      });
      return;
    }

    try {
      handleGoCardlessError(error);
    } catch (bankSyncError) {
      res.json({
        status: 'ok',
        data: bankSyncError,
      });
    }
  }
});

/**
 * POST /transactions
 * Fetch transactions from GoCardless
 * Body: { requisitionId: string, accountId: string, startDate: string, endDate?: string, includeBalance?: boolean }
 */
app.post(
  '/transactions',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        requisitionId,
        accountId,
        startDate,
        endDate,
        includeBalance = true,
      } = req.body;

      if (!requisitionId || !accountId) {
        res.json({
          status: 'error',
          error: 'requisitionId and accountId are required',
        });
        return;
      }

      const client = await getGoCardlessClient(req);
      await ensureValidToken(client);

      // Verify requisition
      const requisition =
        await client.requisition.getRequisitionById(requisitionId);
      const bank = bankFactory(requisition?.institution_id);

      if (requisition.status !== 'LN') {
        res.json({
          status: 'ok',
          data: {
            error_type: 'ITEM_ERROR',
            error_code: 'ITEM_LOGIN_REQUIRED',
            status: 'expired',
            reason: 'Access to account has expired',
          },
        });
        return;
      }

      if (!requisition.accounts.includes(accountId)) {
        res.json({
          status: 'ok',
          data: {
            error_type: 'INVALID_INPUT',
            error_code: 'INVALID_ACCESS_TOKEN',
            status: 'rejected',
            reason: 'Account not linked with this requisition',
          },
        });
        return;
      }

      // Fetch transactions and balances
      const [transactionsResponse, balancesResponse] = await Promise.all([
        client
          .account(accountId)
          .getTransactions({ dateFrom: startDate, dateTo: endDate }),
        includeBalance
          ? client.account(accountId).getBalances()
          : Promise.resolve(null),
      ]);

      function normalizeTransaction(
        transaction: GoCardlessTransaction,
        booked: boolean,
      ):
        | (GoCardlessTransaction & {
            booked: boolean;
            date?: string;
            payeeName?: string;
            notes?: string;
            amount: number;
          })
        | null {
        const normalized = bank.normalizeTransaction(
          transaction as any,
          booked,
        ) as any | null;
        if (!normalized) return null;

        const date =
          normalized.date ||
          normalized.bookingDate ||
          normalized.bookingDateTime ||
          normalized.valueDate ||
          normalized.valueDateTime;

        const notes =
          normalized.notes ??
          normalized.remittanceInformationUnstructured ??
          (normalized.remittanceInformationUnstructuredArray || []).join(' ') ??
          '';

        const payeeName =
          normalized.payeeName ??
          normalized.creditorName ??
          normalized.debtorName ??
          '';

        return {
          ...normalized,
          booked,
          date,
          payeeName,
          notes,
          transactionId: normalized.transactionId,
          amount: parseFloat(normalized.transactionAmount.amount),
        };
      }

      const booked = (transactionsResponse?.transactions?.booked || [])
        .map((t: GoCardlessTransaction) => normalizeTransaction(t, true))
        .filter(Boolean) as any[];

      const pending = (transactionsResponse?.transactions?.pending || [])
        .map((t: GoCardlessTransaction) => normalizeTransaction(t, false))
        .filter(Boolean) as any[];

      bank.sortTransactions(booked);
      bank.sortTransactions(pending);

      const all = [...booked, ...pending];
      bank.sortTransactions(all);

      const result: any = {
        transactions: {
          all,
          booked,
          pending,
        },
      };

      if (balancesResponse && includeBalance) {
        result.balances = balancesResponse.balances;
        result.startingBalance = bank.calculateStartingBalance(
          all,
          balancesResponse.balances,
        );
      }

      res.json({
        status: 'ok',
        data: result,
      });
    } catch (error) {
      console.error('[GOCARDLESS TRANSACTIONS] Error:', error);

      if ((error as any).type === 'BankSyncError') {
        res.json({
          status: 'ok',
          data: error,
        });
        return;
      }

      try {
        handleGoCardlessError(error);
      } catch (bankSyncError) {
        res.json({
          status: 'ok',
          data: bankSyncError,
        });
      }
    }
  },
);

/**
 * POST /banks
 * Get list of banks/institutions by country
 * Body: { country: string, showDemo?: boolean }
 */
app.post('/banks', async (req: Request, res: Response): Promise<void> => {
  try {
    const { country, showDemo = false } = req.body;

    if (!country) {
      res.json({
        status: 'error',
        error: 'country is required',
      });
      return;
    }

    const client = await getGoCardlessClient(req);
    await ensureValidToken(client);

    const institutions = await client.institution.getInstitutions({ country });

    let data = institutions || [];

    if (showDemo) {
      data = [
        {
          id: 'SANDBOXFINANCE_SFIN0000',
          name: 'DEMO bank (used for testing bank-sync)',
        },
        ...data,
      ];
    }

    res.json({
      status: 'ok',
      data,
    });
  } catch (error) {
    console.error('[GOCARDLESS BANKS] Error:', error);

    if ((error as any).type === 'BankSyncError') {
      res.json({
        status: 'ok',
        data: error,
      });
      return;
    }

    try {
      handleGoCardlessError(error);
    } catch (bankSyncError) {
      res.json({
        status: 'error',
        error: (bankSyncError as any).reason || 'Failed to fetch banks',
      });
    }
  }
});

/**
 * POST /create-web-token
 * Create a requisition and return authorization link
 * Body: { institutionId: string, accessValidForDays?: number, host: string }
 */
app.post(
  '/create-web-token',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { institutionId, accessValidForDays = 90, host } = req.body;

      if (!institutionId) {
        res.json({
          status: 'error',
          error: 'institutionId is required',
        });
        return;
      }

      const client = await getGoCardlessClient(req);
      await ensureValidToken(client);

      // Get institution details
      const institution =
        await client.institution.getInstitutionById(institutionId);

      const accountSelection =
        institution.supported_features?.includes('account_selection') ?? false;

      const body = {
        redirectUrl: host + '/gocardless/link',
        institutionId,
        referenceId: uuidv4(),
        accessValidForDays: Math.min(
          accessValidForDays,
          institution.max_access_valid_for_days || 90,
        ),
        maxHistoricalDays: institution.transaction_total_days
          ? parseInt(institution.transaction_total_days) - 1
          : 89,
        userLanguage: 'en',
        ssn: null,
        redirectImmediate: false,
        accountSelection,
      };

      let response;
      try {
        response = await client.initSession(body);
      } catch (error) {
        console.log('Failed to link using:', body);
        console.log(
          'Falling back to accessValidForDays = 90 and maxHistoricalDays = 89',
        );

        response = await client.initSession({
          ...body,
          accessValidForDays: 90,
          maxHistoricalDays: 89,
        });
      }

      res.json({
        status: 'ok',
        data: {
          link: response.link,
          requisitionId: response.id,
        },
      });
    } catch (error) {
      console.error('[GOCARDLESS CREATE-WEB-TOKEN] Error:', error);

      if ((error as any).type === 'BankSyncError') {
        res.json({
          status: 'error',
          error: (error as any).reason,
        });
        return;
      }

      try {
        handleGoCardlessError(error);
      } catch (bankSyncError) {
        res.json({
          status: 'error',
          error: (bankSyncError as any).reason || 'Failed to create web token',
        });
      }
    }
  },
);

/**
 * POST /get-accounts
 * Poll/fetch requisition status and linked accounts
 * Body: { requisitionId: string }
 */
app.post(
  '/get-accounts',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { requisitionId } = req.body;

      if (!requisitionId) {
        res.json({
          status: 'error',
          error: 'requisitionId is required',
        });
        return;
      }

      const client = await getGoCardlessClient(req);
      await ensureValidToken(client);

      const requisition =
        await client.requisition.getRequisitionById(requisitionId);
      const institutionName = await (async () => {
        try {
          const institution = await client.institution.getInstitutionById(
            requisition.institution_id,
          );
          return (institution?.name as string) || requisition.institution_id;
        } catch {
          return requisition.institution_id;
        }
      })();

      if (requisition.status !== 'LN') {
        res.json({
          status: 'ok',
          requisitionStatus: requisition.status,
        });
        return;
      }

      // Fetch accounts
      const accounts = await Promise.all(
        requisition.accounts.map(async (accountId: string) => {
          try {
            const [details, metadata] = await Promise.all([
              client.account(accountId).getDetails(),
              client.account(accountId).getMetadata(),
            ]);

            const accountDetails = details?.account || {};
            const metadataDetails = metadata || {};

            const mergedAccount: Record<string, unknown> = {};
            const uniqueKeys = new Set([
              ...Object.keys(accountDetails),
              ...Object.keys(metadataDetails),
            ]);

            for (const key of uniqueKeys) {
              mergedAccount[key] = metadataDetails[key] || accountDetails[key];
            }

            // Hash IBAN if present
            const iban = mergedAccount.iban as string | undefined;
            if (iban) {
              // Simple hash - in production you'd use a proper hashing function
              mergedAccount.iban = iban.slice(0, 4) + '****' + iban.slice(-4);
            }

            return {
              account_id: accountId,
              name:
                (mergedAccount.name as string) ||
                (mergedAccount.product as string) ||
                accountId,
              institution: institutionName,
              iban: mergedAccount.iban as string | undefined,
              mask: iban ? iban.slice(-4) : accountId.slice(-4),
              official_name:
                (mergedAccount.name as string) ||
                (mergedAccount.product as string),
              currency: mergedAccount.currency as string | undefined,
            };
          } catch (error) {
            console.error(`Error fetching account ${accountId}:`, error);
            return null;
          }
        }),
      );

      res.json({
        status: 'ok',
        data: {
          id: requisition.id,
          status: requisition.status,
          institution_id: requisition.institution_id,
          accounts: accounts.filter((a: any) => a !== null),
        },
      });
    } catch (error) {
      console.error('[GOCARDLESS GET-ACCOUNTS] Error:', error);

      if ((error as any).type === 'BankSyncError') {
        res.json({
          status: 'error',
          error: (error as any).reason,
        });
        return;
      }

      try {
        handleGoCardlessError(error);
      } catch (bankSyncError) {
        res.json({
          status: 'error',
          error: (bankSyncError as any).reason || 'Failed to get accounts',
        });
      }
    }
  },
);

/**
 * POST /remove-account
 * Delete a requisition
 * Body: { requisitionId: string }
 */
app.post(
  '/remove-account',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { requisitionId } = req.body;

      if (!requisitionId) {
        res.json({
          status: 'error',
          error: 'requisitionId is required',
        });
        return;
      }

      const client = await getGoCardlessClient(req);
      await ensureValidToken(client);

      const result = await client.requisition.deleteRequisition(requisitionId);

      if (result.summary === 'Requisition deleted') {
        res.json({
          status: 'ok',
          data: result,
        });
      } else {
        res.json({
          status: 'error',
          data: {
            data: result,
            reason: 'Cannot delete requisition',
          },
        });
      }
    } catch (error) {
      console.error('[GOCARDLESS REMOVE-ACCOUNT] Error:', error);

      if ((error as any).type === 'BankSyncError') {
        res.json({
          status: 'error',
          error: (error as any).reason,
        });
        return;
      }

      try {
        handleGoCardlessError(error);
      } catch (bankSyncError) {
        res.json({
          status: 'error',
          error: (bankSyncError as any).reason || 'Failed to remove account',
        });
      }
    }
  },
);

console.log('GoCardless Bank Sync Plugin loaded');
