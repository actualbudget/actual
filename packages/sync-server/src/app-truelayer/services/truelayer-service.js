import crypto from 'crypto';
import createDebug from 'debug';

import { secretsService } from '../../services/secrets-service.js';
import * as errors from '../errors.js';

const debug = createDebug('actual:truelayer');

// In-memory store for OAuth state (in production, use database)
const authSessions = new Map();

// Mapping from account_id to authId for token lookup
const accountAuthMapping = new Map();

/**
 * Check if TrueLayer is configured with client credentials
 * @returns {boolean}
 */
export function isConfigured() {
  const clientId = secretsService.get('truelayer_clientId');
  const clientSecret = secretsService.get('truelayer_clientSecret');
  return !!(clientId && clientSecret);
}

/**
 * Create OAuth authorization link for TrueLayer
 * @param {Object} params
 * @param {string} params.host - Application host URL
 * @returns {Promise<{link: string, authId: string}>}
 */
export async function createAuthLink({ host }) {
  debug('Creating auth link for host:', host);

  if (!isConfigured()) {
    throw new Error('TrueLayer is not configured. Please set client credentials.');
  }

  const clientId = secretsService.get('truelayer_clientId');

  // Generate unique state for CSRF protection
  const authId = crypto.randomUUID();

  // Store session
  authSessions.set(authId, {
    created: Date.now(),
    status: 'pending',
    redirectUri: `${host}/truelayer/callback`
  });

  // Build OAuth URL
  const authUrl = new URL('https://auth.truelayer.com/');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('scope', 'info accounts balance transactions offline_access');
  authUrl.searchParams.set('redirect_uri', `${host}/truelayer/callback`);
  authUrl.searchParams.set('state', authId);

  debug('Generated auth URL:', authUrl.toString());

  return {
    link: authUrl.toString(),
    authId
  };
}

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code from OAuth callback
 * @param {string} redirectUri - Redirect URI used in authorization
 * @returns {Promise<Object>} Token response
 */
export async function exchangeCodeForToken(code, redirectUri) {
  debug('Exchanging code for token');

  const clientId = secretsService.get('truelayer_clientId');
  const clientSecret = secretsService.get('truelayer_clientSecret');

  const response = await fetch('https://auth.truelayer.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code
    })
  });

  if (!response.ok) {
    const error = await response.text();
    debug('Token exchange failed:', error);
    throw new errors.InvalidTrueLayerTokenError();
  }

  const data = await response.json();
  debug('Token exchange successful');

  return data;
  // Returns: { access_token, refresh_token, expires_in, scope, token_type }
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New token response
 */
export async function refreshAccessToken(refreshToken) {
  debug('Refreshing access token');

  const clientId = secretsService.get('truelayer_clientId');
  const clientSecret = secretsService.get('truelayer_clientSecret');

  const response = await fetch('https://auth.truelayer.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    const error = await response.text();
    debug('Token refresh failed:', error);
    throw new errors.InvalidTrueLayerTokenError();
  }

  return response.json();
}

/**
 * Get accounts from TrueLayer API
 * @param {string} accessToken - Access token
 * @returns {Promise<Array>} Normalized accounts
 */
export async function getAccounts(accessToken) {
  debug('Fetching accounts');

  const response = await fetch('https://api.truelayer.com/data/v1/accounts', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.text();
    debug('Get accounts failed:', error);

    if (response.status === 401) {
      throw new errors.InvalidTrueLayerTokenError();
    } else if (response.status === 403) {
      throw new errors.AccessDeniedError();
    } else if (response.status === 404) {
      throw new errors.NotFoundError();
    } else if (response.status === 429) {
      throw new errors.RateLimitError();
    } else {
      throw new errors.ServiceError(error);
    }
  }

  const data = await response.json();
  debug(`Retrieved ${data.results?.length || 0} accounts`);

  return normalizeAccounts(data.results || []);
}

/**
 * Get transactions for a specific account
 * @param {string} accessToken - Access token
 * @param {string} accountId - Account ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Normalized transactions
 */
export async function getTransactions(accessToken, accountId, startDate, endDate) {
  debug(`Fetching transactions for account ${accountId}`);

  const url = new URL(`https://api.truelayer.com/data/v1/accounts/${accountId}/transactions`);
  if (startDate) url.searchParams.set('from', startDate);
  if (endDate) url.searchParams.set('to', endDate);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.text();
    debug('Get transactions failed:', error);

    if (response.status === 401) {
      throw new errors.InvalidTrueLayerTokenError();
    } else if (response.status === 429) {
      throw new errors.RateLimitError();
    } else {
      throw new errors.ServiceError(error);
    }
  }

  const data = await response.json();
  debug(`Retrieved ${data.results?.length || 0} transactions`);

  return normalizeTransactions(data.results || []);
}

/**
 * Normalize TrueLayer accounts to Actual Budget format
 * @param {Array} truelayerAccounts - Accounts from TrueLayer API
 * @returns {Array} Normalized accounts
 */
function normalizeAccounts(truelayerAccounts) {
  return truelayerAccounts.map(account => ({
    account_id: account.account_id,
    name: account.display_name,
    official_name: account.display_name,
    mask: account.account_number?.number?.slice(-4) || '',
    institution: account.provider?.display_name || 'Unknown',
    balance: 0, // Will be fetched separately if needed
    type: account.account_type
  }));
}

/**
 * Normalize TrueLayer transactions to Actual Budget format
 * @param {Array} truelayerTransactions - Transactions from TrueLayer API
 * @returns {Array} Normalized transactions
 */
function normalizeTransactions(truelayerTransactions) {
  return truelayerTransactions.map(tx => {
    // TrueLayer provides merchant info in different fields:
    // - merchant_name: Available for some debit transactions
    // - meta.provider_merchant_name: Available for most transactions
    // - description: Always available as fallback
    const payeeName = tx.merchant_name
      || tx.meta?.provider_merchant_name
      || tx.description;

    return {
      transactionId: tx.transaction_id,
      date: tx.timestamp.split('T')[0], // ISO → YYYY-MM-DD
      payeeName,
      notes: tx.description,
      booked: tx.transaction_type !== 'PENDING',
      transactionAmount: {
        amount: tx.amount,
        currency: tx.currency
      },
      balanceAfterTransaction: tx.running_balance ? {
        amount: tx.running_balance.amount,
        currency: tx.running_balance.currency
      } : undefined
    };
  });
}

/**
 * Handle OAuth callback
 * @param {string} authId - State parameter from callback
 * @param {string} code - Authorization code
 * @param {string} error - Error from OAuth provider
 */
export async function handleCallback(authId, code, error) {
  debug('Handling OAuth callback for authId:', authId);

  const session = authSessions.get(authId);
  if (!session) {
    throw new errors.NotFoundError('Authorization session not found');
  }

  if (error) {
    session.status = 'error';
    session.error = error;
    debug('OAuth callback error:', error);
    throw new errors.AccessDeniedError(error);
  }

  if (!code) {
    throw new Error('No authorization code provided');
  }

  // Exchange code for token
  const tokens = await exchangeCodeForToken(code, session.redirectUri);

  // Fetch accounts
  const accounts = await getAccounts(tokens.access_token);

  // Update session
  session.status = 'linked';
  session.tokens = tokens;
  session.accounts = accounts;

  // Store account_id → authId mapping for transaction requests
  // Also store tokens persistently using secrets service
  for (const account of accounts) {
    accountAuthMapping.set(account.account_id, authId);

    // Store tokens for this account using secrets service for persistence across restarts
    const tokenKey = `truelayer_token_${account.account_id}`;
    secretsService.set(tokenKey, JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      token_type: tokens.token_type,
      saved_at: Date.now()
    }));
  }

  debug('Authorization successful, stored', accounts.length, 'accounts');

  return { accounts, tokens };
}

/**
 * Get accounts for an authorization session
 * @param {string} authId - Authorization ID
 * @returns {Promise<Object>} Accounts and tokens
 */
export async function getAccountsWithAuth(authId) {
  debug('Getting accounts for authId:', authId);

  const session = authSessions.get(authId);
  if (!session) {
    throw new errors.NotFoundError('Authorization session not found');
  }

  if (session.status === 'pending') {
    throw new errors.AuthorizationNotLinkedError();
  }

  if (session.status === 'error') {
    throw new errors.AccessDeniedError(session.error);
  }

  return {
    accounts: session.accounts,
    tokens: session.tokens
  };
}

/**
 * Get access token for an account, refreshing if needed
 * @param {string} accountId - Account ID
 * @returns {Promise<string>} Access token
 */
export async function getAccessTokenForAccount(accountId) {
  // Try in-memory first
  const authId = accountAuthMapping.get(accountId);

  if (authId) {
    const session = authSessions.get(authId);
    if (session && session.status === 'linked') {
      return session.tokens.access_token;
    }
  }

  // Fallback to persistent storage
  const tokenKey = `truelayer_token_${accountId}`;
  const tokenData = secretsService.get(tokenKey);

  if (!tokenData) {
    throw new errors.NotFoundError('Account not found or not linked');
  }

  let tokens = JSON.parse(tokenData);

  // Check if token needs refresh (expires_in is in seconds)
  // Tokens are stored with a timestamp when saved
  if (tokens.saved_at) {
    const expiresAt = tokens.saved_at + (tokens.expires_in * 1000);
    const now = Date.now();

    // Refresh if token expires in less than 5 minutes
    if (now >= expiresAt - (5 * 60 * 1000)) {
      debug('Access token expired or expiring soon, refreshing...');
      const newTokens = await refreshAccessToken(tokens.refresh_token);

      // Update stored tokens
      tokens = {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || tokens.refresh_token,
        expires_in: newTokens.expires_in,
        token_type: newTokens.token_type,
        saved_at: Date.now()
      };

      secretsService.set(tokenKey, JSON.stringify(tokens));
      debug('Access token refreshed and saved');
    }
  }

  return tokens.access_token;
}

/**
 * Clean up expired sessions (should be called periodically)
 */
export function cleanupExpiredSessions() {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes

  for (const [authId, session] of authSessions.entries()) {
    if (now - session.created > maxAge) {
      authSessions.delete(authId);
      debug('Cleaned up expired session:', authId);
    }
  }
}
