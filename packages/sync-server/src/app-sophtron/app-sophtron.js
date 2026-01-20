import path from 'path';

import { isAxiosError } from 'axios';
import express from 'express';

import { sha256String } from '../util/hash';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '../util/middlewares';

import {
  AccountNotLinkedToRequisition,
  GenericSophtronError,
  RateLimitError,
  RequisitionNotLinked,
} from './errors';
import { sophtronService } from './services/sophtron-service';
import { handleError } from './util/handle-error';

const app = express();
app.use(requestLoggerMiddleware);

app.get('/link', function (req, res) {
  res.sendFile('link.html', { root: path.resolve('./src/app-sophtron') });
});

export { app as handlers };
app.use(express.json());
app.use(validateSessionMiddleware);

app.post('/status', async (req, res) => {
  res.send({
    status: 'ok',
    data: {
      configured: sophtronService.isConfigured(),
    },
  });
});

app.post(
  '/create-web-token',
  handleError(async (req, res) => {
    const { institutionId } = req.body || {};
    const { origin } = req.headers;

    const { link, requisitionId } = await sophtronService.createRequisition({
      institutionId,
      host: origin,
    });

    res.send({
      status: 'ok',
      data: {
        link,
        userInstitutionId: requisitionId, // Use userInstitutionId for consistency with client
      },
    });
  }),
);

app.post(
  '/get-accounts',
  handleError(async (req, res) => {
    const { requisitionId, userInstitutionId } = req.body || {};
    // Support both parameter names for flexibility
    const reqId = requisitionId || userInstitutionId;

    try {
      const { requisition, accounts } =
        await sophtronService.getRequisitionWithAccounts(reqId);

      // Only return accounts if there are any (for polling to work)
      if (!accounts || accounts.length === 0) {
        res.send({
          status: 'ok',
          data: null, // Return null to indicate polling should continue
        });
        return;
      }

      const responseData = {
        ...requisition,
        accounts: await Promise.all(
          accounts.map(async account =>
            account?.iban
              ? { ...account, iban: await sha256String(account.iban) }
              : account,
          ),
        ),
      };

      res.send({
        status: 'ok',
        data: responseData,
      });
    } catch (error) {
      console.error('[Sophtron] Error in get-accounts:', error);
      if (error instanceof RequisitionNotLinked) {
        res.send({
          status: 'ok',
          requisitionStatus: error.details.requisitionStatus,
        });
      } else {
        throw error;
      }
    }
  }),
);

app.post(
  '/get-banks',
  handleError(async (req, res) => {
    const { country, showDemo = false } = req.body || {};

    await sophtronService.setToken();
    const data = await sophtronService.getInstitutions(country);

    res.send({
      status: 'ok',
      data: showDemo
        ? [
            {
              id: 'SANDBOXFINANCE_SFIN0000',
              name: 'DEMO bank (used for testing bank-sync)',
            },
            ...data,
          ]
        : data,
    });
  }),
);

app.post(
  '/get-institutions',
  handleError(async (req, res) => {
    await sophtronService.setToken();
    const data = await sophtronService.getInstitutions();

    res.send({
      status: 'ok',
      data,
    });
  }),
);

app.post(
  '/get-all-accounts',
  handleError(async (req, res) => {
    await sophtronService.setToken();

    // Get all institutions to map InstitutionID to InstitutionName
    const institutions = await sophtronService.getInstitutions();

    const institutionMap = new Map();
    if (institutions && institutions.length > 0) {
      institutions.forEach(inst => {
        institutionMap.set(inst.id, inst.name);
      });
    }

    // Get all customers
    const customers = await sophtronService.getCustomers();

    const allAccounts = [];

    // Get accounts for each customer
    for (const customer of customers) {
      try {
        // Get members to map MemberID -> InstitutionID
        const members = await sophtronService.getMembers(customer.CustomerID);

        // Create a map of MemberID -> InstitutionID
        const memberToInstitutionMap = new Map();
        if (members && Array.isArray(members)) {
          members.forEach(member => {
            if (member.InstitutionID) {
              memberToInstitutionMap.set(member.MemberID, member.InstitutionID);
            }
          });
        }

        // Get all accounts for this customer
        const accounts = await sophtronService.getCustomerAccounts(
          customer.CustomerID,
        );

        if (accounts && accounts.length > 0) {
          accounts.forEach(account => {
            // Get InstitutionID from MemberID first, or use account's InstitutionID if available
            const institutionId =
              account.InstitutionID ||
              memberToInstitutionMap.get(account.MemberID);
            // Get institution name from InstitutionID
            const institutionName = institutionId
              ? institutionMap.get(institutionId)
              : null;
            const finalInstitutionName = institutionName || 'Unknown Bank';

            allAccounts.push({
              ...account,
              customerId: customer.CustomerID,
              InstitutionName: finalInstitutionName,
              // Note: Balance NOT converted to cents for /get-all-accounts
              // This endpoint is for display only, not for linking
              // Actual linking via /accounts endpoint does the conversion
              Balance: account.Balance != null ? account.Balance : null,
            });
          });
        }
      } catch (error) {
        console.error(
          `Error fetching accounts for customer ${customer.CustomerID}:`,
          error,
        );
      }
    }

    res.send({
      status: 'ok',
      data: allAccounts,
    });
  }),
);

app.post(
  '/remove-account',
  handleError(async (req, res) => {
    const { requisitionId } = req.body || {};

    const data = await sophtronService.deleteRequisition(requisitionId);
    if (data.summary === 'Requisition deleted') {
      res.send({
        status: 'ok',
        data,
      });
    } else {
      res.send({
        status: 'error',
        data: {
          data,
          reason: 'Can not delete requisition',
        },
      });
    }
  }),
);

app.post(
  '/transactions',
  handleError(async (req, res) => {
    const {
      requisitionId,
      startDate,
      endDate,
      accountId,
      includeBalance = true,
    } = req.body || {};

    try {
      if (includeBalance) {
        const {
          balances,
          institutionId,
          startingBalance,
          transactions: { booked, pending, all },
        } = await sophtronService.getTransactionsWithBalance(
          requisitionId,
          accountId,
          startDate,
          endDate,
        );

        const responseData = {
          balances,
          institutionId,
          startingBalance,
          transactions: {
            booked,
            pending,
            all,
          },
        };

        res.send({
          status: 'ok',
          data: responseData,
        });
      } else {
        const {
          institutionId,
          transactions: { booked, pending, all },
        } = await sophtronService.getNormalizedTransactions(
          requisitionId,
          accountId,
          startDate,
          endDate,
        );

        res.send({
          status: 'ok',
          data: {
            institutionId,
            transactions: {
              booked,
              pending,
              all,
            },
          },
        });
      }
    } catch (error) {
      const headers = error.details?.response?.headers ?? {};

      const rateLimitHeaders = Object.fromEntries(
        Object.entries(headers).filter(([key]) =>
          key.startsWith('http_x_ratelimit'),
        ),
      );

      const sendErrorResponse = data =>
        res.send({
          status: 'ok',
          data: { ...data, details: error.details, rateLimitHeaders },
        });

      switch (true) {
        case error instanceof RequisitionNotLinked:
          sendErrorResponse({
            error_type: 'ITEM_ERROR',
            error_code: 'ITEM_LOGIN_REQUIRED',
            status: 'expired',
            reason:
              'Access to account has expired as set in End User Agreement',
          });
          break;
        case error instanceof AccountNotLinkedToRequisition:
          sendErrorResponse({
            error_type: 'INVALID_INPUT',
            error_code: 'INVALID_ACCESS_TOKEN',
            status: 'rejected',
            reason: 'Account not linked with this requisition',
          });
          break;
        case error instanceof RateLimitError:
          sendErrorResponse({
            error_type: 'RATE_LIMIT_EXCEEDED',
            error_code: 'SOPHTRON_ERROR',
            status: 'rejected',
            reason: 'Rate limit exceeded',
          });
          break;
        case error instanceof GenericSophtronError:
          console.error('[Sophtron] Sync error:', error.message);
          sendErrorResponse({
            error_type: 'SYNC_ERROR',
            error_code: 'SOPHTRON_ERROR',
          });
          break;
        case isAxiosError(error):
          console.error(
            '[Sophtron] Network error:',
            error.message,
            error.response?.data?.summary || error.response?.data?.detail || '',
          );
          sendErrorResponse({
            error_type: 'SYNC_ERROR',
            error_code: 'SOPHTRON_ERROR',
          });
          break;
        default:
          console.error(
            '[Sophtron] Unknown error:',
            error.message || String(error),
          );
          sendErrorResponse({
            error_type: 'UNKNOWN',
            error_code: 'UNKNOWN',
            reason: 'Something went wrong',
          });
          break;
      }
    }
  }),
);

app.post(
  '/accounts',
  handleError(async (req, res) => {
    const { requisitionId } = req.body || {};

    const accounts = await sophtronService.getAccounts(requisitionId);

    res.send({
      status: 'ok',
      data: {
        accounts: await Promise.all(
          accounts.map(async account =>
            account?.iban
              ? { ...account, iban: await sha256String(account.iban) }
              : account,
          ),
        ),
      },
    });
  }),
);
