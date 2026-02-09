import { randomUUID } from 'node:crypto';

import {
  BunqAuthError,
  BunqConfigurationError,
  BunqInvalidResponseError,
  BunqProtocolError,
  BunqRateLimitError,
  BunqSignatureError,
} from '../errors';

import {
  signRequestPayload,
  verifyResponsePayloadSignature,
} from './bunq-crypto';

const DEFAULT_GEOLOCATION = '0 0 0 0 000';

/**
 * @typedef {'sandbox' | 'production'} BunqEnvironment
 */

/**
 * @typedef {{
 *   apiKey: string;
 *   permittedIps?: string[];
 *   environment: BunqEnvironment;
 *   clientPrivateKey?: string | null;
 *   installationToken?: string | null;
 *   sessionToken?: string | null;
 *   serverPublicKey?: string | null;
 *   fetchImpl?: typeof fetch;
 *   maxRateLimitRetries?: number;
 *   retryBaseDelayMs?: number;
 *   retryJitterMs?: number;
 *   sleepImpl?: (ms: number) => Promise<void>;
 *   randomImpl?: () => number;
 *   nowImpl?: () => number;
 *   onSessionTokenRefreshed?: (sessionToken: string) => void | Promise<void>;
 * }} BunqClientOptions
 */

const DEFAULT_MAX_RATE_LIMIT_RETRIES = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 300;
const DEFAULT_RETRY_JITTER_MS = 150;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export class BunqClient {
  /** @param {BunqClientOptions} options */
  constructor(options) {
    this.apiKey = options.apiKey;
    this.permittedIps =
      Array.isArray(options.permittedIps) && options.permittedIps.length > 0
        ? options.permittedIps
        : ['*'];
    this.environment = options.environment;
    this.clientPrivateKey = options.clientPrivateKey;
    this.installationToken = options.installationToken;
    this.sessionToken = options.sessionToken;
    this.serverPublicKey = options.serverPublicKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.maxRateLimitRetries =
      options.maxRateLimitRetries ?? DEFAULT_MAX_RATE_LIMIT_RETRIES;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;
    this.retryJitterMs = options.retryJitterMs ?? DEFAULT_RETRY_JITTER_MS;
    this.sleepImpl = options.sleepImpl ?? sleep;
    this.randomImpl = options.randomImpl ?? Math.random;
    this.nowImpl = options.nowImpl ?? Date.now;
    this.onSessionTokenRefreshed = options.onSessionTokenRefreshed;
  }

  get baseUrl() {
    return BunqClient.getBaseUrl(this.environment);
  }

  /** @param {BunqEnvironment} environment */
  static getBaseUrl(environment) {
    if (environment === 'production') {
      return 'https://api.bunq.com/v1';
    }
    return 'https://public-api.sandbox.bunq.com/v1';
  }

  /** @param {string} publicKeyPem */
  async createInstallation(publicKeyPem) {
    const responseJson = await this.request('/installation', {
      method: 'POST',
      tokenType: 'none',
      jsonBody: {
        client_public_key: publicKeyPem,
      },
      sign: false,
      verifyResponseSignature: false,
    });

    return {
      installationToken: getBunqTokenValue(responseJson),
      serverPublicKey: getBunqServerPublicKey(responseJson),
    };
  }

  async registerDevice() {
    return await this.request('/device-server', {
      method: 'POST',
      tokenType: 'installation',
      jsonBody: {
        secret: this.apiKey,
        description: 'Actual Budget Sync Server',
        permitted_ips: this.permittedIps,
      },
    });
  }

  async createSession() {
    const responseJson = await this.request('/session-server', {
      method: 'POST',
      tokenType: 'installation',
      jsonBody: {
        secret: this.apiKey,
      },
    });

    return {
      sessionToken: getBunqTokenValue(responseJson),
      userId: getBunqUserId(responseJson),
    };
  }

  /** @param {string} userId */
  async listMonetaryAccounts(userId) {
    const accountPaths = [
      'monetary-account-bank',
      'monetary-account-savings',
      'monetary-account-joint',
      'monetary-account-external',
    ];

    const responses = await Promise.all(
      accountPaths.map(path =>
        this.request(`/user/${userId}/${path}`, {
          method: 'GET',
          tokenType: 'session',
          jsonBody: null,
        }),
      ),
    );

    return {
      Response: responses.flatMap(response => response?.Response || []),
    };
  }

  /**
   * @param {string} userId
   * @param {string} monetaryAccountId
   * @param {{
   *   count?: number;
   *   newerId?: string | null;
   *   olderId?: string | null;
   *   paginationUrl?: string | null;
   * }} [pagination]
   */
  async listPayments(userId, monetaryAccountId, pagination) {
    if (pagination?.paginationUrl) {
      return await this.request(pagination.paginationUrl, {
        method: 'GET',
        tokenType: 'session',
        jsonBody: null,
      });
    }

    const query = new URLSearchParams();

    if (pagination?.count != null) {
      query.set('count', String(pagination.count));
    }
    if (pagination?.newerId) {
      query.set('newer_id', String(pagination.newerId));
    }
    if (pagination?.olderId) {
      query.set('older_id', String(pagination.olderId));
    }

    const queryString = query.toString();

    return await this.request(
      `/user/${userId}/monetary-account/${monetaryAccountId}/payment${queryString ? `?${queryString}` : ''}`,
      {
        method: 'GET',
        tokenType: 'session',
        jsonBody: null,
      },
    );
  }

  /**
   * @param {string} userId
   * @param {{
   *   count?: number;
   *   olderId?: string | null;
   *   monetaryAccountId?: string | null;
   *   displayUserEvent?: boolean;
   *   paginationUrl?: string | null;
   * }} [pagination]
   */
  async listEvents(userId, pagination) {
    if (pagination?.paginationUrl) {
      return await this.request(pagination.paginationUrl, {
        method: 'GET',
        tokenType: 'session',
        jsonBody: null,
      });
    }

    const query = new URLSearchParams();

    if (pagination?.count != null) {
      query.set('count', String(pagination.count));
    }
    if (pagination?.olderId) {
      query.set('older_id', String(pagination.olderId));
    }
    if (pagination?.monetaryAccountId) {
      query.set('monetary_account_id', String(pagination.monetaryAccountId));
    }
    if (pagination?.displayUserEvent != null) {
      query.set('display_user_event', String(Boolean(pagination.displayUserEvent)));
    }

    const queryString = query.toString();

    return await this.request(
      `/user/${userId}/event${queryString ? `?${queryString}` : ''}`,
      {
        method: 'GET',
        tokenType: 'session',
        jsonBody: null,
      },
    );
  }

  /**
   * @param {string} path
   * @param {{
   *   method: 'GET' | 'POST';
   *   tokenType: 'none' | 'installation' | 'session';
   *   jsonBody: object | null;
   *   sign?: boolean;
   *   verifyResponseSignature?: boolean;
   * }} options
   */
  async request(path, options) {
    const normalizedPath = this.normalizeRequestPath(path);
    const body =
      options.jsonBody == null ? '' : JSON.stringify(options.jsonBody);
    const shouldSign = options.sign ?? true;
    const shouldVerifyResponseSignature =
      options.verifyResponseSignature ?? true;
    const isSessionRequest = options.tokenType === 'session';
    let hasRetriedAfterSessionRefresh = false;

    const headers = {
      'Cache-Control': 'no-cache',
      'User-Agent': 'Actual Budget Sync Server',
      'X-Bunq-Client-Request-Id': randomUUID(),
      'X-Bunq-Geolocation': DEFAULT_GEOLOCATION,
    };

    if (options.jsonBody != null) {
      headers['Content-Type'] = 'application/json';
    }

    if (shouldSign) {
      if (!this.clientPrivateKey) {
        throw new BunqConfigurationError(
          'Bunq client private key is required for signed requests',
        );
      }
      headers['X-Bunq-Client-Signature'] = signRequestPayload(
        this.clientPrivateKey,
        body,
      );
    }

    const requestStartedAt = this.nowImpl();

    for (;;) {
      const token = this.getAuthToken(options.tokenType);
      if (token) {
        headers['X-Bunq-Client-Authentication'] = token;
      } else {
        delete headers['X-Bunq-Client-Authentication'];
      }

      let attempt = 0;
      let response = null;
      let responseBody = '';

      for (;;) {
        attempt += 1;
        const requestHeaders = { ...headers };
        response = await this.fetchImpl(`${this.baseUrl}${normalizedPath}`, {
          method: options.method,
          headers: requestHeaders,
          body: options.jsonBody == null ? undefined : body,
        });

        responseBody = await response.text();

        if (response.status !== 429 || attempt > this.maxRateLimitRetries) {
          break;
        }

        const retryDelayMs = this.getRetryDelayMs(attempt);
        console.warn('bunq request rate limited; retrying with backoff', {
          path: normalizedPath,
          method: options.method,
          attempt,
          maxRateLimitRetries: this.maxRateLimitRetries,
          status: response.status,
          retryDelayMs,
          elapsedMs: this.nowImpl() - requestStartedAt,
        });

        await this.sleepImpl(retryDelayMs);
      }

      if (
        !response.ok &&
        isSessionRequest &&
        !hasRetriedAfterSessionRefresh &&
        (response.status === 401 || response.status === 403)
      ) {
        console.warn('bunq session rejected; refreshing session and retrying once', {
          path: normalizedPath,
          method: options.method,
          status: response.status,
          elapsedMs: this.nowImpl() - requestStartedAt,
        });

        hasRetriedAfterSessionRefresh = true;
        await this.refreshSessionToken();
        continue;
      }

      if (!response.ok) {
        const responseHeaders = this.extractResponseHeaders(response);
        const details = {
          path: normalizedPath,
          method: options.method,
          tokenType: options.tokenType,
          sign: shouldSign,
          verifyResponseSignature: shouldVerifyResponseSignature,
          requestHeaders: {
            'X-Bunq-Client-Request-Id': headers['X-Bunq-Client-Request-Id'],
            'X-Bunq-Client-Authentication': headers[
              'X-Bunq-Client-Authentication'
            ]
              ? '[present]'
              : '[missing]',
            'X-Bunq-Client-Signature': headers['X-Bunq-Client-Signature']
              ? '[present]'
              : '[missing]',
            'Content-Type': headers['Content-Type'] || '[none]',
          },
          status: response.status,
          attempts: attempt,
          elapsedMs: this.nowImpl() - requestStartedAt,
          responseBody,
          responseHeaders,
        };

        console.error('bunq request failed', details);

        if (response.status === 401 || response.status === 403) {
          throw new BunqAuthError('Bunq authentication failed', details);
        }

        if (response.status === 429) {
          throw new BunqRateLimitError('Bunq rate limit exceeded', details);
        }

        throw new BunqProtocolError('Bunq request failed', details);
      }

      if (attempt > 1) {
        console.debug('bunq request recovered after retry', {
          path: normalizedPath,
          method: options.method,
          attempts: attempt,
          elapsedMs: this.nowImpl() - requestStartedAt,
          status: response.status,
        });
      }

      const serverSignature = response.headers.get('X-Bunq-Server-Signature');
      if (
        shouldVerifyResponseSignature &&
        serverSignature &&
        this.serverPublicKey &&
        responseBody
      ) {
        const isValid = verifyResponsePayloadSignature(
          this.serverPublicKey,
          responseBody,
          serverSignature,
        );

        if (!isValid) {
          throw new BunqSignatureError('Invalid Bunq response signature', {
            path: normalizedPath,
            status: response.status,
          });
        }
      }

      if (!responseBody) {
        return {};
      }

      try {
        return JSON.parse(responseBody);
      } catch {
        throw new BunqInvalidResponseError('Bunq response JSON was invalid', {
          path: normalizedPath,
          status: response.status,
        });
      }
    }
  }

  async refreshSessionToken() {
    const session = await this.createSession();
    this.sessionToken = session.sessionToken;

    if (this.onSessionTokenRefreshed) {
      await this.onSessionTokenRefreshed(session.sessionToken);
    }
  }

  /** @param {number} attempt */
  getRetryDelayMs(attempt) {
    const exponential = this.retryBaseDelayMs * 2 ** Math.max(0, attempt - 1);
    const jitter = Math.floor(this.randomImpl() * this.retryJitterMs);
    return exponential + jitter;
  }

  /** @param {string} path */
  normalizeRequestPath(path) {
    if (/^https?:\/\//i.test(path)) {
      const parsed = new URL(path);
      const normalizedPath = `${parsed.pathname}${parsed.search}`;
      if (normalizedPath.startsWith('/v1/')) {
        return normalizedPath.slice(3);
      }
      return normalizedPath;
    }

    if (path.startsWith('/v1/')) {
      return path.slice(3);
    }

    return path;
  }

  /** @param {Response & { headers?: any }} response */
  extractResponseHeaders(response) {
    const responseHeaders = {};
    if (response?.headers?.entries) {
      Object.assign(responseHeaders, Object.fromEntries(response.headers.entries()));
    } else if (response?.headers?.forEach) {
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
    }
    return responseHeaders;
  }

  /** @param {'none' | 'installation' | 'session'} tokenType */
  getAuthToken(tokenType) {
    if (tokenType === 'none') {
      return null;
    }

    if (tokenType === 'installation') {
      if (!this.installationToken) {
        throw new BunqConfigurationError(
          'Bunq installation token is required for this request',
        );
      }
      return this.installationToken;
    }

    if (!this.sessionToken) {
      throw new BunqConfigurationError(
        'Bunq session token is required for this request',
      );
    }
    return this.sessionToken;
  }
}

/** @param {any} responseJson */
function getBunqTokenValue(responseJson) {
  const entries = responseJson?.Response;
  if (!Array.isArray(entries)) {
    throw new BunqProtocolError(
      'Unexpected Bunq response while extracting token',
      {
        responseJson,
      },
    );
  }

  const tokenEntry = entries.find(entry => entry?.Token?.token);
  const token = tokenEntry?.Token?.token;
  if (!token) {
    throw new BunqProtocolError('Bunq token was missing in response', {
      responseJson,
    });
  }

  return token;
}

/** @param {any} responseJson */
function getBunqServerPublicKey(responseJson) {
  const entries = responseJson?.Response;
  if (!Array.isArray(entries)) {
    throw new BunqProtocolError(
      'Unexpected Bunq response while extracting server public key',
      {
        responseJson,
      },
    );
  }

  const keyEntry = entries.find(
    entry => entry?.ServerPublicKey?.server_public_key,
  );
  const serverPublicKey = keyEntry?.ServerPublicKey?.server_public_key;
  if (!serverPublicKey) {
    throw new BunqProtocolError(
      'Bunq server public key was missing in response',
      {
        responseJson,
      },
    );
  }

  return serverPublicKey;
}

/** @param {any} responseJson */
function getBunqUserId(responseJson) {
  const entries = responseJson?.Response;
  if (!Array.isArray(entries)) {
    throw new BunqProtocolError(
      'Unexpected Bunq response while extracting user ID',
      {
        responseJson,
      },
    );
  }

  for (const entry of entries) {
    const user =
      entry.UserPerson || entry.UserCompany || entry.UserLight || null;
    if (user?.id != null) {
      return String(user.id);
    }
  }

  throw new BunqProtocolError('Bunq user ID was missing in response', {
    responseJson,
  });
}
