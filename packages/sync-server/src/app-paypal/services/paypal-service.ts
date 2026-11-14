import createDebug from 'debug';
import { fetch } from 'undici';
import type { RequestInit, Response } from 'undici';

import type { BankSyncBalance } from '#app-paypal/types/bank-sync-balance';
import type { BankSyncTransaction } from '#app-paypal/types/bank-sync-transaction';
import type { LinkedAccount } from '#app-paypal/types/linked-account';
import type { PayPalBalance } from '#app-paypal/types/paypal-balance';
import type { PayPalBalancesResponse } from '#app-paypal/types/paypal-balances-response';
import type { PayPalMoney } from '#app-paypal/types/paypal-money';
import type { PayPalToken } from '#app-paypal/types/paypal-token';
import type { PayPalTokenResponse } from '#app-paypal/types/paypal-token-response';
import type { PayPalTransactionDetail } from '#app-paypal/types/paypal-transaction-detail';
import type { PayPalTransactionsPage } from '#app-paypal/types/paypal-transactions-page';
import { handlePayPalError, PayPalError } from '#app-paypal/utils/errors';
import { SecretName, secretsService } from '#services/secrets-service';

const debugSensitive = createDebug('actual-sensitive:paypal');

const debug = createDebug('actual:paypal:service');

const API_URL = 'https://api-m.paypal.com';
const REQUEST_TIMEOUT_MS = 30_000;
const TOKEN_EXPIRY_MARGIN_MS = 60_000;
const PAGE_SIZE = 500;
const WINDOW_MS = 31 * 24 * 60 * 60 * 1000 - 1000;
const HISTORY_MS = (3 * 365 - 1) * 24 * 60 * 60 * 1000;
const ACCOUNT_PREFIX = 'paypal-';
const INSTITUTION = 'PayPal';
const DENIED = 'D';
const PENDING = 'P';

let cachedToken: PayPalToken | undefined;

function getCredentials() {
  const clientId = secretsService.get(SecretName.paypal_clientId);
  const clientSecret = secretsService.get(SecretName.paypal_clientSecret);

  if (!clientId || !clientSecret) {
    throw new PayPalError(
      'INVALID_INPUT',
      'NOT_CONFIGURED',
      'PayPal is not configured',
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
      throw new PayPalError('TIMED_OUT', 'TIMED_OUT', 'Request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function readError(response: Response): Promise<PayPalError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = 'unknown';
  }
  return handlePayPalError(response.status, body);
}

async function requestToken(
  clientId: string,
  clientSecret: string,
): Promise<PayPalToken> {
  debug('POST token');
  const response = await send(`${API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw await readError(response);
  }

  // eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- token endpoint response shape is fixed by the OAuth spec
  const body = (await response.json()) as PayPalTokenResponse;
  return {
    clientId,
    accessToken: body.access_token,
    expiresAt: Date.now() + body.expires_in * 1000,
  };
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getCredentials();
  if (
    cachedToken &&
    cachedToken.clientId === clientId &&
    cachedToken.expiresAt - TOKEN_EXPIRY_MARGIN_MS > Date.now()
  ) {
    return cachedToken.accessToken;
  }
  cachedToken = await requestToken(clientId, clientSecret);
  return cachedToken.accessToken;
}

async function getJson<T>(accessToken: string, path: string): Promise<T> {
  const url = `${API_URL}${path}`;
  debug('GET %s', path.split('?')[0]);
  debugSensitive('GET %s', url);
  const response = await send(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw await readError(response);
  }
  // eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- generic API wrapper, type is validated by caller
  return (await response.json()) as T;
}

async function getBalances(accessToken: string): Promise<PayPalBalance[]> {
  const body = await getJson<PayPalBalancesResponse>(
    accessToken,
    '/v1/reporting/balances',
  );
  return body.balances ?? [];
}

function accountId(currency: string): string {
  return `${ACCOUNT_PREFIX}${currency.toLowerCase()}`;
}

function currencyOf(id: string): string {
  if (!id.startsWith(ACCOUNT_PREFIX)) {
    throw new PayPalError(
      'ITEM_ERROR',
      'ACCOUNT_MISSING',
      'Not a PayPal account',
    );
  }
  return id.slice(ACCOUNT_PREFIX.length).toUpperCase();
}

function toCents(money: PayPalMoney | undefined): number {
  return money ? Math.round(Number(money.value) * 100) : 0;
}

function formatDate(time: number): string {
  return new Date(time).toISOString().replace(/\.\d{3}Z$/, '-0000');
}

export function balanceInCents(
  balances: PayPalBalance[],
  currency: string,
): number {
  const balance = balances.find(
    entry => entry.currency.toUpperCase() === currency.toUpperCase(),
  );
  return toCents(balance?.total_balance);
}

export function normalizeBalance(
  balances: PayPalBalance[],
  currency: string,
): BankSyncBalance {
  return {
    balanceAmount: {
      amount: balanceInCents(balances, currency),
      currency,
    },
    balanceType: 'current',
  };
}

export function windows(
  startDate: string,
  now: number,
): Array<[number, number]> {
  const requested = Date.parse(`${startDate}T00:00:00Z`);
  if (Number.isNaN(requested)) {
    throw new PayPalError('INVALID_INPUT', 'INVALID_INPUT', 'Invalid date');
  }
  const result: Array<[number, number]> = [];
  for (
    let start = Math.max(requested, now - HISTORY_MS);
    start < now;
    start += WINDOW_MS + 1000
  ) {
    result.push([start, Math.min(start + WINDOW_MS, now)]);
  }
  return result;
}

function payeeName(detail: PayPalTransactionDetail): string {
  const name = detail.payer_info?.payer_name;
  const fullName =
    name?.alternate_full_name?.trim() ||
    [name?.given_name, name?.surname].filter(Boolean).join(' ').trim();
  return (
    fullName ||
    detail.payer_info?.email_address?.trim() ||
    detail.transaction_info.transaction_subject?.trim() ||
    INSTITUTION
  );
}

function notes(detail: PayPalTransactionDetail): string {
  const info = detail.transaction_info;
  return [
    info.transaction_event_code,
    info.transaction_subject?.trim(),
    info.transaction_note?.trim(),
    info.invoice_id,
  ]
    .filter(Boolean)
    .join(': ');
}

export function normalizeTransactions(
  detail: PayPalTransactionDetail,
): BankSyncTransaction[] {
  const info = detail.transaction_info;
  if (info.transaction_status === DENIED) {
    return [];
  }
  const date = info.transaction_initiation_date.slice(0, 10);
  const currency = info.transaction_amount.currency_code;
  const booked = info.transaction_status !== PENDING;
  const description = notes(detail);
  const main: BankSyncTransaction = {
    transactionId: info.transaction_id,
    date,
    bookingDate: date,
    transactionAmount: {
      amount: (toCents(info.transaction_amount) / 100).toFixed(2),
      currency,
    },
    payeeName: payeeName(detail),
    notes: description,
    remittanceInformationUnstructured: description,
    booked,
  };
  const fee = toCents(info.fee_amount);
  if (!fee) {
    return [main];
  }
  const feeNotes = `PayPal fee for ${info.transaction_id}`;
  return [
    main,
    {
      transactionId: `${info.transaction_id}-fee`,
      date,
      bookingDate: date,
      transactionAmount: { amount: (fee / 100).toFixed(2), currency },
      payeeName: INSTITUTION,
      notes: feeNotes,
      remittanceInformationUnstructured: feeNotes,
      booked,
    },
  ];
}

export const payPalService = {
  isConfigured(): boolean {
    const clientId = secretsService.get(SecretName.paypal_clientId);
    const clientSecret = secretsService.get(SecretName.paypal_clientSecret);
    return !!(clientId && clientSecret);
  },

  async validateCredentials(
    clientId: string,
    clientSecret: string,
  ): Promise<void> {
    const token = await requestToken(clientId, clientSecret);
    await getBalances(token.accessToken);
  },

  async listAccounts(): Promise<LinkedAccount[]> {
    const balances = await getBalances(await getAccessToken());
    return balances
      .filter(balance => balance.primary || toCents(balance.total_balance))
      .map(balance => ({
        account_id: accountId(balance.currency),
        name: `PayPal ${balance.currency.toUpperCase()}`,
        institution: INSTITUTION,
        currency: balance.currency.toUpperCase(),
        balance: toCents(balance.total_balance),
      }));
  },

  async getTransactions(id: string, startDate: string, now = Date.now()) {
    const currency = currencyOf(id);
    const accessToken = await getAccessToken();
    const details: PayPalTransactionDetail[] = [];

    for (const [start, end] of windows(startDate, now)) {
      for (let page = 1; ; page++) {
        const params = new URLSearchParams({
          start_date: formatDate(start),
          end_date: formatDate(end),
          transaction_currency: currency,
          fields: 'all',
          page_size: String(PAGE_SIZE),
          page: String(page),
        });
        const body = await getJson<PayPalTransactionsPage>(
          accessToken,
          `/v1/reporting/transactions?${params.toString()}`,
        );
        details.push(...(body.transaction_details ?? []));
        if (page >= (body.total_pages ?? 1)) {
          break;
        }
      }
    }

    const balances = await getBalances(accessToken);
    return { currency, details, balances };
  },
};
