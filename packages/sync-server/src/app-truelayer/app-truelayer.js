import path from 'path';

import express from 'express';

import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '../util/middlewares.js';

import * as errors from './errors.js';
import * as truelayerService from './services/truelayer-service.js';

const app = express();
app.use(requestLoggerMiddleware);

// OAuth callback endpoint - serves static HTML page
app.get('/link', function (req, res) {
  res.sendFile('link.html', { root: path.resolve('./src/app-truelayer') });
});

// OAuth callback handler - must be before validateSessionMiddleware
// Called by TrueLayer after user authorizes (no auth token in request)
app.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  try {
    if (error) {
      // OAuth error from TrueLayer
      res.redirect(
        `/truelayer/link?error=${encodeURIComponent(error)}&state=${state}`,
      );
      return;
    }

    if (!code || !state) {
      res.redirect('/truelayer/link?error=missing_parameters');
      return;
    }

    // Process the callback (exchange code, fetch accounts)
    await truelayerService.handleCallback(state, code, error);

    // Redirect to link page which will close the window
    res.redirect(`/truelayer/link?success=true&state=${state}`);
  } catch (err) {
    res.redirect(
      `/truelayer/link?error=${encodeURIComponent(err.message)}&state=${state}`,
    );
  }
});

export { app as handlers };
app.use(express.json());
app.use(validateSessionMiddleware);

/**
 * Error handler wrapper for async routes
 */
function handleError(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      // Map our custom errors to appropriate responses
      if (error instanceof errors.AuthorizationNotLinkedError) {
        res.send({
          status: 'ok',
          authStatus: 'pending',
        });
      } else if (error instanceof errors.InvalidTrueLayerTokenError) {
        res.send({
          status: 'error',
          reason: 'invalid-token',
          error_code: 'INVALID_TOKEN',
        });
      } else if (error instanceof errors.AccessDeniedError) {
        res.send({
          status: 'error',
          reason: 'access-denied',
          error_code: 'ACCESS_DENIED',
        });
      } else if (error instanceof errors.NotFoundError) {
        res.send({
          status: 'error',
          reason: 'not-found',
          error_code: 'NOT_FOUND',
        });
      } else if (error instanceof errors.RateLimitError) {
        res.send({
          status: 'error',
          reason: 'rate-limit',
          error_code: 'RATE_LIMIT',
        });
      } else {
        // Generic error
        res.send({
          status: 'error',
          reason: error.message || 'Unknown error',
          error_code: 'INTERNAL_ERROR',
        });
      }
    }
  };
}

/**
 * Check if TrueLayer is configured
 */
app.post('/status', async (req, res) => {
  res.send({
    status: 'ok',
    data: {
      configured: truelayerService.isConfigured(),
    },
  });
});

/**
 * Create OAuth authorization link
 */
app.post(
  '/create-web-token',
  handleError(async (req, res) => {
    // Use the sync server's own host for the redirect URI
    // req.get('host') returns the Host header (e.g., 'localhost:5006')
    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const serverUrl = `${protocol}://${host}`;

    const { link, authId } = await truelayerService.createAuthLink({
      host: serverUrl,
    });

    res.send({
      status: 'ok',
      data: {
        link,
        authId,
      },
    });
  }),
);

/**
 * Get accounts (polling endpoint)
 * Returns accounts once OAuth is complete
 */
app.post(
  '/get-accounts',
  handleError(async (req, res) => {
    const { authId } = req.body || {};

    const { accounts, tokens } =
      await truelayerService.getAccountsWithAuth(authId);

    res.send({
      status: 'ok',
      data: {
        authId,
        accounts,
        // Don't send tokens to client for security
        // They're stored server-side in the session
      },
    });
  }),
);

/**
 * Get transactions for a specific account
 */
app.post(
  '/transactions',
  handleError(async (req, res) => {
    const { accountId, startDate, endDate } = req.body || {};

    // Get access token from stored session (with automatic refresh if needed)
    const accessToken =
      await truelayerService.getAccessTokenForAccount(accountId);

    // Fetch both transactions and current balance in parallel
    const [transactions, balance] = await Promise.all([
      truelayerService.getTransactions(
        accessToken,
        accountId,
        startDate,
        endDate,
      ),
      truelayerService.getBalance(accessToken, accountId),
    ]);

    // Calculate starting balance
    // Method 1: If transactions have running_balance, use the oldest transaction
    // Method 2: Otherwise, use current balance and subtract all transactions
    let startingBalance = 0;

    if (transactions.length > 0) {
      // Sort by date to find the oldest transaction
      const sortedTransactions = [...transactions].sort(
        (a, b) => new Date(a.date) - new Date(b.date),
      );
      const oldestTransaction = sortedTransactions[0];

      // Method 1: Use running_balance if available
      if (oldestTransaction.balanceAfterTransaction) {
        const balanceAfter = oldestTransaction.balanceAfterTransaction.amount;
        const transactionAmount = oldestTransaction.transactionAmount.amount;
        startingBalance = balanceAfter - transactionAmount;
      }
      // Method 2: Calculate from current balance
      else if (balance && balance.current !== undefined) {
        // Convert current balance to integer (multiply by 100 for cents)
        let calculatedBalance = Math.round(balance.current * 100);

        // Subtract all transactions to get starting balance
        for (const trans of transactions) {
          calculatedBalance -= Math.round(trans.transactionAmount.amount * 100);
        }

        startingBalance = calculatedBalance;
      }
    }

    res.send({
      status: 'ok',
      data: {
        transactions: {
          all: transactions,
          booked: transactions.filter(t => t.booked),
          pending: transactions.filter(t => !t.booked),
        },
        startingBalance,
        balances: balance
          ? {
              current: Math.round(balance.current * 100),
              available: balance.available
                ? Math.round(balance.available * 100)
                : undefined,
            }
          : undefined,
      },
    });
  }),
);

/**
 * Refresh access token
 */
app.post(
  '/refresh-token',
  handleError(async (req, res) => {
    const { refreshToken } = req.body || {};

    const tokens = await truelayerService.refreshAccessToken(refreshToken);

    res.send({
      status: 'ok',
      data: {
        access_token: tokens.access_token,
        expires_in: tokens.expires_in,
      },
    });
  }),
);

// Cleanup expired sessions periodically (every 5 minutes)
setInterval(() => {
  truelayerService.cleanupExpiredSessions();
}, 5 * 60 * 1000);
