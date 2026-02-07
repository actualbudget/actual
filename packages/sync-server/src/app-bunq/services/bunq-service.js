import { SecretName, secretsService } from '../../services/secrets-service';
import {
  BunqAuthError,
  BunqConfigurationError,
  BunqInvalidResponseError,
  BunqNotImplementedYetError,
  BunqProtocolError,
  BunqRateLimitError,
  BunqSignatureError,
} from '../errors';

import { BunqClient } from './bunq-client';
import { generateBunqKeyPair, getPublicKeyFromPrivateKey } from './bunq-crypto';

const DEFAULT_PAGE_SIZE = 200;
const MAX_PAGES = 20;

/** @typedef {'sandbox'|'production'} BunqEnvironment */

function getEnvironment() {
  const raw = secretsService.get(SecretName.bunq_environment);
  if (raw === 'production') {
    return 'production';
  }
  return 'production';
}

function getApiKey() {
  return secretsService.get(SecretName.bunq_apiKey);
}

function getClientPrivateKey() {
  return secretsService.get(SecretName.bunq_clientPrivateKey);
}

function getOrCreateClientPrivateKey() {
  const existingPrivateKey = getClientPrivateKey();
  if (existingPrivateKey) {
    return existingPrivateKey;
  }

  const generated = generateBunqKeyPair();
  secretsService.set(SecretName.bunq_clientPrivateKey, generated.privateKeyPem);
  secretsService.set(SecretName.bunq_clientPublicKey, generated.publicKeyPem);
  return generated.privateKeyPem;
}

function getSessionToken() {
  return secretsService.get(SecretName.bunq_sessionToken);
}

function getInstallationToken() {
  return secretsService.get(SecretName.bunq_installationToken);
}

function getServerPublicKey() {
  return secretsService.get(SecretName.bunq_serverPublicKey);
}

function getUserId() {
  return secretsService.get(SecretName.bunq_userId);
}

/** @param {typeof fetch | undefined} fetchImpl */
function createClient(fetchImpl) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new BunqConfigurationError('bunq_apiKey secret is required');
  }

  return new BunqClient({
    apiKey,
    environment: getEnvironment(),
    clientPrivateKey: getClientPrivateKey(),
    installationToken: getInstallationToken(),
    sessionToken: getSessionToken(),
    serverPublicKey: getServerPublicKey(),
    fetchImpl,
  });
}

/** @param {typeof fetch | undefined} fetchImpl */
async function ensureApiContext(fetchImpl) {
  const privateKey = getOrCreateClientPrivateKey();
  const publicKey = getPublicKeyFromPrivateKey(privateKey);

  let installationToken = getInstallationToken();
  let serverPublicKey = getServerPublicKey();
  let sessionToken = getSessionToken();
  let userId = getUserId();

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new BunqConfigurationError('bunq_apiKey secret is required');
  }

  const environment = getEnvironment();

  const resetAuthContext = () => {
    secretsService.set(SecretName.bunq_installationToken, null);
    secretsService.set(SecretName.bunq_serverPublicKey, null);
    secretsService.set(SecretName.bunq_sessionToken, null);
    secretsService.set(SecretName.bunq_userId, null);
  };

  if (!installationToken || !serverPublicKey) {
    const bootstrapClient = new BunqClient({
      apiKey,
      environment,
      clientPrivateKey: privateKey,
      fetchImpl,
    });

    const installation = await bootstrapClient.createInstallation(publicKey);
    installationToken = installation.installationToken;
    serverPublicKey = installation.serverPublicKey;

    secretsService.set(SecretName.bunq_installationToken, installationToken);
    secretsService.set(SecretName.bunq_serverPublicKey, serverPublicKey);
  }

  if (!sessionToken || !userId) {
    try {
      const authClient = new BunqClient({
        apiKey,
        environment,
        clientPrivateKey: privateKey,
        installationToken,
        serverPublicKey,
        fetchImpl,
      });

      await authClient.registerDevice();
      const session = await authClient.createSession();
      sessionToken = session.sessionToken;
      userId = session.userId;

      secretsService.set(SecretName.bunq_sessionToken, sessionToken);
      secretsService.set(SecretName.bunq_userId, userId);
    } catch (error) {
      if (
        error instanceof BunqAuthError &&
        (error.details?.status === 401 || error.details?.status === 403)
      ) {
        console.warn(
          'bunq auth context rejected; clearing installation/session context and retrying bootstrap once',
        );
        resetAuthContext();

        const bootstrapClient = new BunqClient({
          apiKey,
          environment,
          clientPrivateKey: privateKey,
          fetchImpl,
        });

        const installation =
          await bootstrapClient.createInstallation(publicKey);
        installationToken = installation.installationToken;
        serverPublicKey = installation.serverPublicKey;

        secretsService.set(
          SecretName.bunq_installationToken,
          installationToken,
        );
        secretsService.set(SecretName.bunq_serverPublicKey, serverPublicKey);

        const authClient = new BunqClient({
          apiKey,
          environment,
          clientPrivateKey: privateKey,
          installationToken,
          serverPublicKey,
          fetchImpl,
        });

        await authClient.registerDevice();
        const session = await authClient.createSession();
        sessionToken = session.sessionToken;
        userId = session.userId;

        secretsService.set(SecretName.bunq_sessionToken, sessionToken);
        secretsService.set(SecretName.bunq_userId, userId);
      } else {
        throw error;
      }
    }
  }

  return {
    apiKey,
    environment,
    privateKey,
    installationToken,
    sessionToken,
    serverPublicKey,
    userId,
  };
}

function normalizeMonetaryAccountItem(item) {
  if (item?.MonetaryAccountBank) {
    return mapMonetaryAccount(item.MonetaryAccountBank, 'MonetaryAccountBank');
  }
  if (item?.MonetaryAccountExternal) {
    return mapMonetaryAccount(
      item.MonetaryAccountExternal,
      'MonetaryAccountExternal',
    );
  }
  if (item?.MonetaryAccountJoint) {
    return mapMonetaryAccount(
      item.MonetaryAccountJoint,
      'MonetaryAccountJoint',
    );
  }
  if (item?.MonetaryAccountSavings) {
    return mapMonetaryAccount(
      item.MonetaryAccountSavings,
      'MonetaryAccountSavings',
    );
  }
  return null;
}

function getObjectKeyPaths(value, maxDepth = 4) {
  /** @type {string[]} */
  const keyPaths = [];

  /** @param {unknown} currentValue */
  function visit(currentValue, prefix, depth) {
    if (
      depth > maxDepth ||
      !currentValue ||
      typeof currentValue !== 'object' ||
      Array.isArray(currentValue)
    ) {
      return;
    }

    for (const key of Object.keys(currentValue)) {
      const path = prefix ? `${prefix}.${key}` : key;
      keyPaths.push(path);
      visit(currentValue[key], path, depth + 1);
    }
  }

  visit(value, '', 1);
  return keyPaths;
}

function mapMonetaryAccount(account, sourceType) {
  const alias = Array.isArray(account.alias)
    ? account.alias.find(a => a?.type === 'IBAN') || account.alias[0]
    : null;
  const iban = alias?.value || '';

  return {
    sourceType,
    id: String(account.id),
    account_id: String(account.id),
    name: account.description || `Bunq account ${account.id}`,
    official_name: account.description || `Bunq account ${account.id}`,
    institution: 'bunq',
    mask: iban ? iban.slice(-4) : '',
    iban,
    currency: account.currency || 'EUR',
    balance: Math.round(Number(account.balance?.value || 0) * 100),
  };
}

function isActiveMonetaryAccount(item) {
  if (!item || typeof item !== 'object') {
    return false;
  }

  const account =
    item.MonetaryAccountBank ||
    item.MonetaryAccountExternal ||
    item.MonetaryAccountJoint ||
    item.MonetaryAccountSavings;

  return account?.status === 'ACTIVE';
}

function parsePaginationQuery(url) {
  if (!url || typeof url !== 'string') {
    return {};
  }

  try {
    const parsed = new URL(url, 'https://api.bunq.com');
    return {
      olderId: parsed.searchParams.get('older_id'),
      newerId: parsed.searchParams.get('newer_id'),
      futureId: parsed.searchParams.get('future_id'),
    };
  } catch {
    return {};
  }
}

export function extractPaginationCursor(responseJson) {
  const topLevelPagination = responseJson?.Pagination;
  const embeddedPagination = Array.isArray(responseJson?.Response)
    ? responseJson.Response.find(entry => entry?.Pagination)?.Pagination
    : null;
  const pagination = topLevelPagination || embeddedPagination || null;

  const fromOlderUrl = parsePaginationQuery(pagination?.older_url).olderId;
  const fromNewerUrl = parsePaginationQuery(pagination?.newer_url).newerId;
  const fromFutureUrl = parsePaginationQuery(pagination?.future_url).futureId;

  return {
    olderId:
      String(
        pagination?.older_id || pagination?.olderId || fromOlderUrl || '',
      ) || null,
    newerId:
      String(
        pagination?.newer_id || pagination?.newerId || fromNewerUrl || '',
      ) || null,
    futureId:
      String(
        pagination?.future_id || pagination?.futureId || fromFutureUrl || '',
      ) || null,
  };
}

function extractPayments(responseJson) {
  const entries = responseJson?.Response;
  if (!Array.isArray(entries)) {
    throw new BunqInvalidResponseError(
      'Unexpected Bunq payment response shape',
    );
  }

  return entries
    .map(entry => entry?.Payment)
    .filter(Boolean)
    .map(payment => ({ ...payment, id: String(payment.id) }));
}

export function normalizeBunqPayment(payment) {
  const value = Number(payment?.amount?.value ?? 0);
  const amount = Number.isFinite(value) ? value.toFixed(2) : '0.00';

  const date = String(payment?.created || '').slice(0, 10);
  if (!date) {
    throw new BunqInvalidResponseError('Bunq payment is missing created date', {
      paymentId: payment?.id,
    });
  }

  const counterpartyAlias = Array.isArray(payment?.counterparty_alias)
    ? payment.counterparty_alias[0]
    : payment?.counterparty_alias;

  const payeeName =
    payment?.counterparty_alias?.display_name ||
    counterpartyAlias?.display_name ||
    payment?.description ||
    'bunq';

  return {
    booked: true,
    date,
    bookingDate: date,
    valueDate: date,
    postedDate: date,
    transactedDate: date,
    sortOrder: Date.parse(payment.created || date),
    payeeName,
    notes: payment?.description || null,
    transactionAmount: {
      amount,
      currency: payment?.amount?.currency || 'EUR',
    },
    transactionId: String(payment.id),
    internalTransactionId: String(payment.id),
  };
}

function mergeNewerId(currentNewerId, payments) {
  let maxId = currentNewerId;
  for (const payment of payments) {
    const paymentId = String(payment.id || '');
    if (!paymentId) {
      continue;
    }

    if (!maxId) {
      maxId = paymentId;
      continue;
    }

    const asCurrent = Number(maxId);
    const asPayment = Number(paymentId);

    if (Number.isFinite(asCurrent) && Number.isFinite(asPayment)) {
      if (asPayment > asCurrent) {
        maxId = paymentId;
      }
    } else if (paymentId > maxId) {
      maxId = paymentId;
    }
  }
  return maxId;
}

async function getCurrentAccountBalance(client, userId, accountId) {
  console.log('bunq: fetching monetary accounts for current balance', {
    userId,
    accountId,
  });
  const accountsResponse = await client.listMonetaryAccounts(userId);
  console.log('bunq: received monetary accounts response', {
    JSON: JSON.stringify(accountsResponse),
    accountId,
    responseItems: (accountsResponse?.Response || []).length,
  });
  const account = (accountsResponse?.Response || [])
    .map(normalizeMonetaryAccountItem)
    .find(acc => acc?.account_id === String(accountId));

  return account?.balance ?? null;
}

function mapBunqError(error) {
  if (
    error instanceof BunqAuthError ||
    error instanceof BunqRateLimitError ||
    error instanceof BunqSignatureError ||
    error instanceof BunqInvalidResponseError ||
    error instanceof BunqConfigurationError ||
    error instanceof BunqProtocolError
  ) {
    return {
      error_type: error.error_type,
      error_code: error.error_code,
      reason: error.message,
    };
  }

  throw error;
}

export const bunqService = {
  isConfigured() {
    return Boolean(getApiKey());
  },

  /** @param {{ fetchImpl?: typeof fetch }} [options] */
  async getStatus(options = {}) {
    const configured = this.isConfigured();
    if (!configured) {
      return {
        configured,
        environment: getEnvironment(),
        authContextReady: false,
      };
    }

    try {
      await ensureApiContext(options.fetchImpl);
      return {
        configured,
        environment: getEnvironment(),
        authContextReady: true,
      };
    } catch (error) {
      if (
        error instanceof BunqConfigurationError ||
        error instanceof BunqProtocolError
      ) {
        return {
          configured,
          environment: getEnvironment(),
          authContextReady: false,
          error_type: error.error_type,
          error_code: error.error_code,
          reason: error.message,
        };
      }
      throw error;
    }
  },

  /** @param {{ fetchImpl?: typeof fetch }} [options] */
  async listAccounts(options = {}) {
    try {
      const context = await ensureApiContext(options.fetchImpl);
      const client = createClient(options.fetchImpl);
      client.clientPrivateKey = context.privateKey;
      client.installationToken = context.installationToken;
      client.sessionToken = context.sessionToken;
      client.serverPublicKey = context.serverPublicKey;

      console.log('bunq: listing monetary accounts', {
        userId: context.userId,
      });
      const response = await client.listMonetaryAccounts(context.userId);
      console.log('bunq: listed monetary accounts', {
        userId: context.userId,
        response: JSON.stringify(response),
        responseItems: (response?.Response || []).length,
      });
      const responseItems = response?.Response || [];
      const activeResponseItems = responseItems.filter(isActiveMonetaryAccount);
      const filteredItems = [];

      const accounts = activeResponseItems
        .map((item, index) => {
          const normalized = normalizeMonetaryAccountItem(item);
          if (!normalized) {
            filteredItems.push({
              index,
              keys:
                item && typeof item === 'object'
                  ? Object.keys(item)
                  : ['[non-object-item]'],
              keyPaths: getObjectKeyPaths(item),
            });
          }
          return normalized;
        })
        .filter(Boolean);

      if (filteredItems.length > 0) {
        console.warn('bunq: filtered unsupported monetary account items', {
          userId: context.userId,
          totalResponseItems: responseItems.length,
          filteredCount: filteredItems.length,
          filteredItems,
          filteredItemsJson: JSON.stringify(filteredItems),
        });
      }

      return {
        accounts,
      };
    } catch (error) {
      return mapBunqError(error);
    }
  },

  /**
   * @param {{
   *   accountId: string;
   *   startDate?: string;
   *   cursor?: { newerId?: string | null } | null;
   *   fetchImpl?: typeof fetch;
   * }} options
   */
  async listTransactions(options) {
    try {
      const context = await ensureApiContext(options.fetchImpl);
      const client = createClient(options.fetchImpl);
      client.clientPrivateKey = context.privateKey;
      client.installationToken = context.installationToken;
      client.sessionToken = context.sessionToken;
      client.serverPublicKey = context.serverPublicKey;

      const accountId = String(options.accountId);
      const startDate = options.startDate || null;
      const incomingCursor = options.cursor || null;

      const seenIds = new Set();
      const payments = [];
      const useIncremental = Boolean(incomingCursor?.newerId);

      if (useIncremental) {
        let newerId = incomingCursor.newerId;

        for (let i = 0; i < MAX_PAGES && newerId; i++) {
          const response = await client.listPayments(
            context.userId,
            accountId,
            {
              count: DEFAULT_PAGE_SIZE,
              newerId,
            },
          );

          const pagePayments = extractPayments(response);
          for (const payment of pagePayments) {
            if (seenIds.has(payment.id)) {
              continue;
            }
            seenIds.add(payment.id);
            payments.push(payment);
          }

          const pagination = extractPaginationCursor(response);
          if (!pagination.newerId || pagination.newerId === newerId) {
            break;
          }
          newerId = pagination.newerId;
        }
      } else {
        let olderId = null;
        let stop = false;

        for (let i = 0; i < MAX_PAGES && !stop; i++) {
          const response = await client.listPayments(
            context.userId,
            accountId,
            {
              count: DEFAULT_PAGE_SIZE,
              olderId,
            },
          );

          const pagePayments = extractPayments(response);
          for (const payment of pagePayments) {
            const paymentDate = String(payment?.created || '').slice(0, 10);
            if (startDate && paymentDate && paymentDate < startDate) {
              stop = true;
              continue;
            }

            if (seenIds.has(payment.id)) {
              continue;
            }
            seenIds.add(payment.id);
            payments.push(payment);
          }

          const pagination = extractPaginationCursor(response);
          if (!pagination.olderId || pagination.olderId === olderId) {
            break;
          }
          olderId = pagination.olderId;
        }
      }

      const all = payments
        .map(normalizeBunqPayment)
        .sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));

      const startingBalance = await getCurrentAccountBalance(
        client,
        context.userId,
        accountId,
      );

      return {
        balances: [],
        startingBalance,
        transactions: {
          all,
          booked: all,
          pending: [],
        },
        cursor: {
          newerId: mergeNewerId(incomingCursor?.newerId || null, payments),
        },
      };
    } catch (error) {
      return mapBunqError(error);
    }
  },

  notImplemented(operation) {
    throw new BunqNotImplementedYetError(operation);
  },
};
