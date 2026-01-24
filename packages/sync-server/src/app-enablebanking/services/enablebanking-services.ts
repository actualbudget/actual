import createClient from 'openapi-fetch';

import { SecretName, secretsService } from '../../services/secrets-service.js';
import { getLoadedRegistry } from '../banks/bank-registry.js';
import {
  type components,
  type operations,
  type paths,
} from '../models/enablebanking-openapi.js';
import {
  type Account,
  type EnableBankingAuthenticationStartResponse,
  type EnableBankingToken,
  type Transaction,
} from '../models/enablebanking.js';
import {
  ApplicationInactiveError,
  EnableBankingError,
  EnableBankingSetupError,
  handleErrorResponse,
  isErrorResponse,
  ResourceNotFoundError,
  SecretsInvalidError,
  type ErrorResponse,
} from '../utils/errors.js';
import { getJWT } from '../utils/jwt.js';

function isDefined<T>(value: T | undefined): asserts value is T {
  if (value === undefined) {
    console.error(
      `A required value is undefined. This should not happen. Please report this issue.`,
    );
    throw new EnableBankingError(
      'INTERNAL_ERROR',
      `Something went wrong while using the Enable Banking API. Please try again later.`,
    );
  }
}

// Session entry with expiration timestamp
type SessionEntry = {
  sessionId: string;
  expiresAt: number;
};

// TTL for auth sessions (30 minutes - bank setup can be slow with app/SMS verification)
const SESSION_TTL_MS = 30 * 60 * 1000;

// Cleanup interval (5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

class SessionStore {
  private sessions = new Map<string, SessionEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    // Don't keep process alive just for cleanup
    this.cleanupTimer.unref();
  }

  set(state: string, sessionId: string): void {
    this.sessions.set(state, {
      sessionId,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
  }

  get(state: string): string | undefined {
    const entry = this.sessions.get(state);
    if (!entry) return undefined;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.sessions.delete(state);
      return undefined;
    }

    return entry.sessionId;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [state, entry] of this.sessions) {
      if (now > entry.expiresAt) {
        this.sessions.delete(state);
      }
    }
  }
}

const sessionStore = new SessionStore();

export const enableBankingservice = {
  HOSTNAME: 'https://api.enablebanking.com/',

  setupSecrets: async (applicationId: string, secretKey: string) => {
    // Check if we can get a jwt with provided data.
    let jwt: string;
    try {
      jwt = getJWT(applicationId, secretKey);
    } catch {
      throw new SecretsInvalidError();
    }

    // Check if jwt is recognized by Enable Banking
    await enableBankingservice.getApplication(jwt);
    secretsService.set(SecretName.enablebanking_applicationId, applicationId);
    secretsService.set(SecretName.enablebanking_secret, secretKey);
    return true;
  },
  secretsAreSetup: () => {
    const applicationId = secretsService.get(
      SecretName.enablebanking_applicationId,
    );
    const secret = secretsService.get(SecretName.enablebanking_secret);
    return !(applicationId == null || secret == null);
  },
  isConfigured: async () => {
    if (!enableBankingservice.secretsAreSetup()) {
      return false;
    }
    await enableBankingservice.getApplication();
    return true;
  },

  getJWT: () => {
    const applicationId = secretsService.get(
      SecretName.enablebanking_applicationId,
    );
    const secretKey = secretsService.get(SecretName.enablebanking_secret);
    if (!applicationId || !secretKey) {
      throw new EnableBankingSetupError();
    }
    return getJWT(applicationId, secretKey);
  },
  getClient: (jwt?: string) => {
    const baseHeaders = {
      Authorization: `Bearer ${jwt ? jwt : enableBankingservice.getJWT()}`,
      'Content-Type': 'application/json',
    };
    const client = createClient<paths>({
      baseUrl: enableBankingservice.HOSTNAME,
      headers: baseHeaders,
    });
    client.use({
      async onResponse(options) {
        const { response } = options;
        if (response.status >= 400) {
          const error_data = await response
            .clone()
            .json()
            .then(data => {
              if (isErrorResponse(data)) {
                return handleErrorResponse(data);
              } else if ((data as ErrorResponse).code === 403) {
                return new SecretsInvalidError();
              } else {
                console.error(`Enable Banking API returned an error:`, data);
                return new EnableBankingError(
                  'INTERNAL_ERROR',
                  `Something went wrong while using the Enable Banking API. Please try again later.`,
                );
              }
            });
          throw error_data;
        }
        return undefined; // continue with the response
      },
    });
    return client;
  },

  getApplication: async (jwt?: string) => {
    const { data } = await enableBankingservice
      .getClient(jwt)
      .GET('/application');
    isDefined(data);
    if (!data.active) {
      throw new ApplicationInactiveError();
    }
    return data;
  },

  getASPSPs: async (country?: string) => {
    const { data } = await enableBankingservice.getClient().GET('/aspsps', {
      params: {
        query: {
          service: 'AIS',
          country,
        },
      },
    });
    isDefined(data);
    return data;
  },

  getASPSP: async (country: string, name: string) => {
    return await enableBankingservice.getASPSPs(country).then(resp => {
      const res = resp.aspsps.filter(aspsp => aspsp.name === name).at(0);
      if (res) {
        return res;
      }
      throw new ResourceNotFoundError(
        `The aspsp ${name} in ${country} is not available.`,
      );
    });
  },

  startAuth: async (
    country: string,
    aspsp: string,
    host: string,
    exp: number,
  ): Promise<EnableBankingAuthenticationStartResponse> | never => {
    const aspspData = await enableBankingservice.getASPSP(country, aspsp);
    exp = Math.min(exp, aspspData.maximum_consent_validity - 3600);

    const valid_until = new Date();
    valid_until.setSeconds(valid_until.getSeconds() + exp);

    const state = crypto.randomUUID();

    // The redirect URL is the host with https, because Enable Banking requires it.
    // Since we don't have ssl in dev. The redirect URL needs to be changed manually in browser.
    const redirect_url = `${host.replace('http:', 'https:')}/enablebanking/auth_callback`;

    const { data } = await enableBankingservice.getClient().POST('/auth', {
      body: {
        access: {
          valid_until: valid_until.toISOString(),
          balances: true,
          transactions: true,
        },
        aspsp: {
          name: aspsp,
          country,
        },
        credentials_autosubmit: true,
        state,
        redirect_url,
      },
    });
    isDefined(data);

    return {
      redirect_url: data.url,
      state,
    };
  },

  authorizeSession: async (state: string, code: string) => {
    const existingSessionId = sessionStore.get(state);
    if (existingSessionId) {
      return existingSessionId;
    }
    const { data } = await enableBankingservice.getClient().POST('/sessions', {
      body: { code },
    });
    isDefined(data);
    sessionStore.set(state, data.session_id);
    return data.session_id;
  },

  getSessionIdFromState: (state: string): string | undefined => {
    return sessionStore.get(state);
  },

  getAccounts: async (
    session_id: string,
  ): Promise<EnableBankingToken> | never => {
    const client = enableBankingservice.getClient();

    const { data } = await client.GET('/sessions/{session_id}', {
      params: {
        path: { session_id },
      },
    });
    isDefined(data);
    const bank_id = [data.aspsp.country, data.aspsp.name].join('_');
    const accounts: Account[] = [];
    for (const account_id of data.accounts) {
      const { data: account } = await client.GET(
        `/accounts/{account_id}/details`,
        {
          params: { path: { account_id } },
        },
      );
      isDefined(account);
      const { data: balance } = await client.GET(
        `/accounts/{account_id}/balances`,
        { params: { path: { account_id } } },
      );
      isDefined(balance);
      const name = account.account_id
        ? (account.account_id.iban ?? 'unknown')
        : 'unknown';

      accounts.push({
        account_id,
        name,
        balance: parseFloat(balance.balances[0].balance_amount.amount),
        institution: data.aspsp.name,
      });
    }
    return {
      session_id,
      bank_id,
      accounts,
    };
  },

  getTransactions: async (
    account_id: string,
    date_from?: string,
    date_to?: string,
    bank_id?: string,
  ): Promise<Transaction[]> => {
    const client = enableBankingservice.getClient();
    const query: operations['get_account_transactions_accounts__account_id__transactions_get']['parameters']['query'] =
      {};
    if (date_from) {
      query.date_from = date_from;
    }
    if (date_to) {
      query.date_to = date_to;
    }

    const transactions: components['schemas']['Transaction'][] = [];
    do {
      const { data }: { data?: components['schemas']['HalTransactions'] } =
        await client.GET('/accounts/{account_id}/transactions', {
          params: {
            path: { account_id },
            query,
          },
        });
      isDefined(data);
      transactions.push(...(data.transactions || []));
      query.continuation_key = data.continuation_key;
    } while (query.continuation_key);

    const registry = await getLoadedRegistry();

    const bankProcessor = registry.get(bank_id ?? 'fallback');
    if (bankProcessor.debug) {
      console.debug(
        `--- Debugging '${bankProcessor.name}': showing first 5 transactions with processed transactions.---`,
      );
      transactions.slice(0, 2).forEach(transaction => {
        console.debug('# ORIGINAL:');
        console.debug(JSON.stringify(transaction, null, 2));
        console.debug('## BECOMES:');
        console.debug(
          JSON.stringify(
            bankProcessor.normalizeTransaction(transaction),
            null,
            2,
          ),
        );
      });
      console.debug(`--- End of transactions ---`);
    }

    return transactions.map(transaction =>
      bankProcessor.normalizeTransaction(transaction),
    );
  },

  getCurrentBalance: async (account_id: string) => {
    const client = enableBankingservice.getClient();
    const { data } = await client.GET('/accounts/{account_id}/balances', {
      params: { path: { account_id } },
    });
    isDefined(data);

    if (data.balances.length === 0) {
      throw new ResourceNotFoundError('No balance data available');
    }

    const preferredBalanceTypes = ['ITBD', 'ITAV', 'CLBD'];
    const balance = data.balances.sort((a, b) => {
      const aIndex = preferredBalanceTypes.indexOf(a.balance_type);
      const bIndex = preferredBalanceTypes.indexOf(b.balance_type);
      return (
        (aIndex === -1 ? preferredBalanceTypes.length : aIndex) -
        (bIndex === -1 ? preferredBalanceTypes.length : bIndex)
      );
    })[0];

    return parseFloat(balance.balance_amount.amount);
  },
};
