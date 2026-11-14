import createDebug from 'debug';
import { fetch } from 'undici';
import type { Response } from 'undici';

import type { BankSyncBalance } from '#app-stripe/types/bank-sync-balance';
import type { BankSyncTransaction } from '#app-stripe/types/bank-sync-transaction';
import type { LinkedAccount } from '#app-stripe/types/linked-account';
import type { StripeBalance } from '#app-stripe/types/stripe-balance';
import type { StripeBalanceTransaction } from '#app-stripe/types/stripe-balance-transaction';
import type { StripeList } from '#app-stripe/types/stripe-list';
import { handleStripeError, StripeError } from '#app-stripe/utils/errors';
import { SecretName, secretsService } from '#services/secrets-service';

const debugSensitive = createDebug('actual-sensitive:stripe');

const debug = createDebug('actual:stripe:service');

const API_URL = 'https://api.stripe.com/v1';
const REQUEST_TIMEOUT_MS = 30_000;
const PAGE_SIZE = 100;
const ACCOUNT_PREFIX = 'stripe-';
const INSTITUTION = 'Stripe';
const PAYOUT_PAYEE = 'Stripe payout';

function getKey(): string {
  const key = secretsService.get(SecretName.stripe_key);
  if (!key) {
    throw new StripeError(
      'INVALID_INPUT',
      'NOT_CONFIGURED',
      'Stripe is not configured',
    );
  }
  return key;
}

async function send(url: string, key: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new StripeError('TIMED_OUT', 'TIMED_OUT', 'Request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function readError(response: Response): Promise<StripeError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = 'unknown';
  }
  return handleStripeError(response.status, body);
}

async function getJson<T>(key: string, path: string): Promise<T> {
  const url = `${API_URL}${path}`;
  debug('GET %s', path.split('?')[0]);
  debugSensitive('GET %s', url);
  const response = await send(url, key);
  if (!response.ok) {
    throw await readError(response);
  }
  // eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- generic API wrapper, type is validated by caller
  return (await response.json()) as T;
}

function accountId(currency: string): string {
  return `${ACCOUNT_PREFIX}${currency.toLowerCase()}`;
}

function currencyOf(id: string): string {
  if (!id.startsWith(ACCOUNT_PREFIX)) {
    throw new StripeError(
      'ITEM_ERROR',
      'ACCOUNT_MISSING',
      'Not a Stripe account',
    );
  }
  return id.slice(ACCOUNT_PREFIX.length);
}

function toDate(created: number): string {
  return new Date(created * 1000).toISOString().slice(0, 10);
}

function toAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function balanceInCents(
  balance: StripeBalance,
  currency: string,
): number {
  const lower = currency.toLowerCase();
  return [...balance.available, ...balance.pending]
    .filter(entry => entry.currency.toLowerCase() === lower)
    .reduce((total, entry) => total + entry.amount, 0);
}

export function balanceCurrencies(balance: StripeBalance): string[] {
  return [
    ...new Set(
      [...balance.available, ...balance.pending].map(entry =>
        entry.currency.toLowerCase(),
      ),
    ),
  ];
}

export function normalizeBalance(
  balance: StripeBalance,
  currency: string,
): BankSyncBalance {
  return {
    balanceAmount: {
      amount: balanceInCents(balance, currency),
      currency: currency.toUpperCase(),
    },
    balanceType: 'current',
  };
}

function payeeName(tx: StripeBalanceTransaction): string {
  if (tx.type === 'payout') {
    return PAYOUT_PAYEE;
  }
  if (tx.type === 'stripe_fee') {
    return INSTITUTION;
  }
  return tx.description?.trim() || tx.source || tx.type;
}

function notes(tx: StripeBalanceTransaction): string {
  const description = tx.description?.trim();
  return description ? `${tx.type}: ${description}` : tx.type;
}

export function normalizeTransactions(
  tx: StripeBalanceTransaction,
): BankSyncTransaction[] {
  const date = toDate(tx.created);
  const currency = tx.currency.toUpperCase();
  const booked = tx.status !== 'pending';
  const main: BankSyncTransaction = {
    transactionId: tx.id,
    date,
    bookingDate: date,
    transactionAmount: { amount: toAmount(tx.amount), currency },
    payeeName: payeeName(tx),
    notes: notes(tx),
    remittanceInformationUnstructured: notes(tx),
    booked,
  };
  if (!tx.fee) {
    return [main];
  }
  const feeNotes = `Stripe fee for ${tx.type}`;
  return [
    main,
    {
      transactionId: `${tx.id}-fee`,
      date,
      bookingDate: date,
      transactionAmount: { amount: toAmount(-tx.fee), currency },
      payeeName: INSTITUTION,
      notes: feeNotes,
      remittanceInformationUnstructured: feeNotes,
      booked,
    },
  ];
}

function startOfDay(startDate: string): number {
  const time = Date.parse(`${startDate}T00:00:00Z`);
  if (Number.isNaN(time)) {
    throw new StripeError('INVALID_INPUT', 'INVALID_INPUT', 'Invalid date');
  }
  return Math.floor(time / 1000);
}

export const stripeService = {
  isConfigured(): boolean {
    return !!secretsService.get(SecretName.stripe_key);
  },

  async validateKey(key: string): Promise<void> {
    await getJson<StripeBalance>(key, '/balance');
  },

  async getBalance(): Promise<StripeBalance> {
    return getJson<StripeBalance>(getKey(), '/balance');
  },

  async listAccounts(): Promise<LinkedAccount[]> {
    const balance = await this.getBalance();
    return balanceCurrencies(balance).map(currency => ({
      account_id: accountId(currency),
      name: `Stripe ${currency.toUpperCase()}`,
      institution: INSTITUTION,
      currency: currency.toUpperCase(),
      balance: balanceInCents(balance, currency),
    }));
  },

  async getTransactions(id: string, startDate: string) {
    const currency = currencyOf(id);
    const key = getKey();
    const since = startOfDay(startDate);
    const transactions: StripeBalanceTransaction[] = [];
    let after: string | undefined;

    for (;;) {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        'created[gte]': String(since),
        currency,
      });
      if (after) {
        params.set('starting_after', after);
      }
      const page = await getJson<StripeList<StripeBalanceTransaction>>(
        key,
        `/balance_transactions?${params.toString()}`,
      );
      transactions.push(...page.data);
      const last = page.data.at(-1);
      if (!page.has_more || !last) {
        break;
      }
      after = last.id;
    }

    const balance = await getJson<StripeBalance>(key, '/balance');
    return { currency, transactions, balance };
  },
};
