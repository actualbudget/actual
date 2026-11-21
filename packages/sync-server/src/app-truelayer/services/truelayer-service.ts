import createDebug from 'debug';
import { fetch } from 'undici';
import type { RequestInit, Response } from 'undici';
import { v4 as uuidv4 } from 'uuid';

import type { BankSyncBalance } from '#app-truelayer/types/bank-sync-balance';
import type { BankSyncTransaction } from '#app-truelayer/types/bank-sync-transaction';
import type { LinkedAccount } from '#app-truelayer/types/linked-account';
import type { TrueLayerAccount } from '#app-truelayer/types/truelayer-account';
import type { TrueLayerAccountKind } from '#app-truelayer/types/truelayer-account-kind';
import type { TrueLayerAccountLink } from '#app-truelayer/types/truelayer-account-link';
import type { TrueLayerBalance } from '#app-truelayer/types/truelayer-balance';
import type { TrueLayerCard } from '#app-truelayer/types/truelayer-card';
import type { TrueLayerProvider } from '#app-truelayer/types/truelayer-provider';
import type { TrueLayerResults } from '#app-truelayer/types/truelayer-results';
import type { TrueLayerTokenResponse } from '#app-truelayer/types/truelayer-token-response';
import type { TrueLayerTokens } from '#app-truelayer/types/truelayer-tokens';
import type { TrueLayerTransaction } from '#app-truelayer/types/truelayer-transaction';
import {
  handleTrueLayerError,
  TrueLayerError,
} from '#app-truelayer/utils/errors';
import { SecretName, secretsService } from '#services/secrets-service';

const debugSensitive = createDebug('actual-sensitive:truelayer');

const debug = createDebug('actual:truelayer:service');

const AUTH_URL = 'https://auth.truelayer.com';
const API_URL = 'https://api.truelayer.com';
const SCOPES = 'info accounts balance cards transactions offline_access';
const PROVIDERS = 'uk-ob-all uk-oauth-all';
const REQUEST_TIMEOUT_MS = 30_000;
const TOKEN_EXPIRY_MARGIN_MS = 60_000;
const IMPORTABLE_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function getCredentials() {
  const clientId = secretsService.get(SecretName.truelayer_clientId);
  const clientSecret = secretsService.get(SecretName.truelayer_clientSecret);

  if (!clientId || !clientSecret) {
    throw new TrueLayerError(
      'INVALID_INPUT',
      'NOT_CONFIGURED',
      'TrueLayer is not configured',
    );
  }

  return { clientId, clientSecret };
}

async function send(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TrueLayerError('TIMED_OUT', 'TIMED_OUT', 'Request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function readError(response: Response): Promise<TrueLayerError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = await response.text().catch(() => 'unknown');
  }
  return handleTrueLayerError(response.status, body);
}

async function requestToken(
  form: Record<string, string>,
): Promise<TrueLayerTokenResponse> {
  debug('POST token');
  const response = await send(`${AUTH_URL}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });

  if (!response.ok) {
    throw await readError(response);
  }

  // eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- token endpoint response shape is fixed by the OAuth spec
  return (await response.json()) as TrueLayerTokenResponse;
}

async function getData<T>(
  accessToken: string,
  path: string,
  psuIp?: string,
): Promise<T[]> {
  const url = `${API_URL}/data/v1${path}`;
  debug('GET data');
  debugSensitive('GET %s', url);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (psuIp) {
    headers['X-PSU-IP'] = psuIp;
  }

  const response = await send(url, { method: 'GET', headers });

  if (!response.ok) {
    throw await readError(response);
  }

  // eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- generic API wrapper, type is validated by caller
  const body = (await response.json()) as TrueLayerResults<T>;
  return body.results ?? [];
}

async function getOptionalData<T>(
  accessToken: string,
  path: string,
  psuIp?: string,
): Promise<T[]> {
  try {
    return await getData<T>(accessToken, path, psuIp);
  } catch (error) {
    if (
      error instanceof TrueLayerError &&
      error.error_code === 'ENDPOINT_NOT_SUPPORTED'
    ) {
      debug('Endpoint not supported by the provider');
      debugSensitive('Endpoint %s not supported by the provider', path);
      return [];
    }
    throw error;
  }
}

function readTokens(connectionId: string): TrueLayerTokens {
  const raw = secretsService.get(SecretName.truelayer_connection, connectionId);
  if (!raw) {
    throw new TrueLayerError(
      'ITEM_ERROR',
      'ITEM_LOGIN_REQUIRED',
      'TrueLayer connection not found',
    );
  }
  // eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- written by storeTokens
  return JSON.parse(raw) as TrueLayerTokens;
}

function storeTokens(
  connectionId: string,
  response: TrueLayerTokenResponse,
  previousRefreshToken?: string,
): TrueLayerTokens {
  const refreshToken = response.refresh_token || previousRefreshToken;
  if (!refreshToken) {
    throw new TrueLayerError(
      'INVALID_INPUT',
      'MISSING_REFRESH_TOKEN',
      'TrueLayer did not return a refresh token',
    );
  }
  const tokens: TrueLayerTokens = {
    accessToken: response.access_token,
    refreshToken,
    expiresAt: Date.now() + response.expires_in * 1000,
  };
  secretsService.set(
    SecretName.truelayer_connection,
    JSON.stringify(tokens),
    connectionId,
  );
  return tokens;
}

async function getAccessToken(connectionId: string): Promise<string> {
  const tokens = readTokens(connectionId);
  if (tokens.expiresAt - TOKEN_EXPIRY_MARGIN_MS > Date.now()) {
    return tokens.accessToken;
  }

  const { clientId, clientSecret } = getCredentials();
  const response = await requestToken({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: tokens.refreshToken,
  });
  return storeTokens(connectionId, response, tokens.refreshToken).accessToken;
}

function readLink(accountId: string): TrueLayerAccountLink {
  const raw = secretsService.get(SecretName.truelayer_account, accountId);
  if (!raw) {
    throw new TrueLayerError(
      'ITEM_ERROR',
      'ITEM_LOGIN_REQUIRED',
      'TrueLayer account is not linked',
    );
  }
  // eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- written by storeLink
  return JSON.parse(raw) as TrueLayerAccountLink;
}

function storeLink(
  accountId: string,
  connectionId: string,
  kind: TrueLayerAccountKind,
) {
  const link: TrueLayerAccountLink = { connectionId, kind };
  secretsService.set(
    SecretName.truelayer_account,
    JSON.stringify(link),
    accountId,
  );
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

export function balanceInCents(
  balance: TrueLayerBalance | undefined,
  kind: TrueLayerAccountKind,
): number {
  if (!balance) {
    return 0;
  }
  const cents = toCents(balance.current);
  return kind === 'cards' ? -cents : cents;
}

export function startingBalanceInCents(
  booked: TrueLayerTransaction[],
  pending: BankSyncTransaction[],
  balance: TrueLayerBalance | undefined,
  kind: TrueLayerAccountKind,
): number {
  const newest = booked.reduce<TrueLayerTransaction | undefined>(
    (latest, tx) =>
      tx.running_balance && (!latest || tx.timestamp > latest.timestamp)
        ? tx
        : latest,
    undefined,
  );
  if (!newest?.running_balance) {
    return balanceInCents(balance, kind);
  }
  const posted = toCents(newest.running_balance.amount);
  const pendingTotal = pending.reduce(
    (total, tx) => total + toCents(Number(tx.transactionAmount.amount)),
    0,
  );
  return (kind === 'cards' ? -posted : posted) + pendingTotal;
}

export function normalizeBalance(
  balance: TrueLayerBalance,
  kind: TrueLayerAccountKind,
): BankSyncBalance {
  return {
    balanceAmount: {
      amount: balanceInCents(balance, kind),
      currency: balance.currency,
    },
    balanceType: 'current',
  };
}

export function normalizeTransaction(
  tx: TrueLayerTransaction,
  booked: boolean,
): BankSyncTransaction {
  const magnitude = Math.abs(tx.amount);
  let signed = tx.amount;
  if (tx.transaction_type === 'DEBIT') {
    signed = -magnitude;
  } else if (tx.transaction_type === 'CREDIT') {
    signed = magnitude;
  }

  const date = (tx.timestamp || '').slice(0, 10);
  const description = tx.description?.trim() || undefined;
  const payeeName =
    tx.merchant_name ||
    tx.meta?.provider_merchant_name ||
    tx.meta?.counter_party_preferred_name ||
    description ||
    '';

  return {
    transactionId: tx.transaction_id,
    date,
    bookingDate: date,
    transactionAmount: {
      amount: signed.toFixed(2),
      currency: tx.currency,
    },
    payeeName: payeeName.trim(),
    notes: description,
    remittanceInformationUnstructured: description,
    booked,
  };
}

export function isImportableTransaction(tx: BankSyncTransaction): boolean {
  const amount = tx.transactionAmount.amount.trim();
  return (
    !!tx.transactionId &&
    IMPORTABLE_DATE_REGEX.test(tx.date) &&
    amount !== '' &&
    Number.isFinite(Number(amount))
  );
}

function institutionName(provider?: TrueLayerProvider): string {
  return provider?.display_name || 'TrueLayer';
}

export const trueLayerService = {
  isConfigured(): boolean {
    const clientId = secretsService.get(SecretName.truelayer_clientId);
    const clientSecret = secretsService.get(SecretName.truelayer_clientSecret);
    return !!(clientId && clientSecret);
  },

  async validateCredentials(clientId: string, clientSecret: string) {
    try {
      await requestToken({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'https://localhost/truelayer/auth_callback',
        code: uuidv4(),
      });
    } catch (error) {
      if (
        error instanceof TrueLayerError &&
        error.error_code === 'ITEM_LOGIN_REQUIRED'
      ) {
        return;
      }
      throw error;
    }
  },

  buildAuthUrl(redirectUrl: string, state: string): string {
    const { clientId } = getCredentials();
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: SCOPES,
      redirect_uri: redirectUrl,
      providers: PROVIDERS,
      state,
    });
    return `${AUTH_URL}/?${params.toString()}`;
  },

  async createConnection(code: string, redirectUrl: string): Promise<string> {
    const { clientId, clientSecret } = getCredentials();
    const response = await requestToken({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUrl,
      code,
    });
    const connectionId = uuidv4();
    storeTokens(connectionId, response);
    return connectionId;
  },

  async listAccounts(
    connectionId: string,
    psuIp?: string,
  ): Promise<LinkedAccount[]> {
    const accessToken = await getAccessToken(connectionId);
    const [accounts, cards] = await Promise.all([
      getData<TrueLayerAccount>(accessToken, '/accounts', psuIp),
      getOptionalData<TrueLayerCard>(accessToken, '/cards', psuIp),
    ]);

    const linkedAccounts = await Promise.all(
      accounts.map(async account => {
        const [balance] = await getOptionalData<TrueLayerBalance>(
          accessToken,
          `/accounts/${encodeURIComponent(account.account_id)}/balance`,
          psuIp,
        );
        storeLink(account.account_id, connectionId, 'accounts');
        return {
          account_id: account.account_id,
          name: account.display_name || account.account_id,
          institution: institutionName(account.provider),
          currency: account.currency,
          balance: balanceInCents(balance, 'accounts'),
        };
      }),
    );

    const linkedCards = await Promise.all(
      cards.map(async card => {
        const [balance] = await getOptionalData<TrueLayerBalance>(
          accessToken,
          `/cards/${encodeURIComponent(card.account_id)}/balance`,
          psuIp,
        );
        storeLink(card.account_id, connectionId, 'cards');
        return {
          account_id: card.account_id,
          name:
            card.display_name ||
            (card.partial_card_number
              ? `Card ${card.partial_card_number}`
              : card.account_id),
          institution: institutionName(card.provider),
          currency: card.currency,
          balance: balanceInCents(balance, 'cards'),
        };
      }),
    );

    return [...linkedAccounts, ...linkedCards];
  },

  async getTransactions(accountId: string, startDate: string, psuIp?: string) {
    const { connectionId, kind } = readLink(accountId);
    const accessToken = await getAccessToken(connectionId);
    const base = `/${kind}/${encodeURIComponent(accountId)}`;
    const range = new URLSearchParams({
      from: startDate,
      to: new Date().toISOString(),
    }).toString();

    const [booked, pending, balances] = await Promise.all([
      getData<TrueLayerTransaction>(
        accessToken,
        `${base}/transactions?${range}`,
        psuIp,
      ),
      getOptionalData<TrueLayerTransaction>(
        accessToken,
        `${base}/transactions/pending`,
        psuIp,
      ),
      getData<TrueLayerBalance>(accessToken, `${base}/balance`, psuIp),
    ]);

    return { kind, booked, pending, balance: balances[0] };
  },
};
