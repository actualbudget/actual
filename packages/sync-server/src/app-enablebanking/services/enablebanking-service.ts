import createDebug from 'debug';

import {
  EnableBankingError,
  handleEnableBankingError,
} from '#app-enablebanking/utils/errors';
import { getJWT } from '#app-enablebanking/utils/jwt';
import { SecretName, secretsService } from '#services/secrets-service';

const debug = createDebug('actual:enable-banking:service');

const BASE_URL = 'https://api.enablebanking.com';

// --- Type definitions ---

export type EnableBankingTransaction = {
  entry_reference?: string;
  transaction_id?: string;
  transaction_amount: { currency: string; amount: string };
  creditor?: { name?: string };
  debtor?: { name?: string };
  credit_debit_indicator?: 'CRDT' | 'DBIT';
  status?: 'BOOK' | 'PDNG';
  booking_date?: string;
  value_date?: string;
  transaction_date?: string;
  remittance_information?: string[];
};

type EnableBankingBalance = {
  balance_amount: { currency: string; amount: string };
  balance_type: string;
  reference_date?: string;
};

export type EnableBankingSessionAccount = {
  account_id?: { iban?: string };
  account_servicer?: { bic_fi?: string; name?: string };
  name?: string;
  currency?: string;
  uid: string;
};

export type EnableBankingSession = {
  session_id: string;
  accounts: EnableBankingSessionAccount[];
  aspsp?: { name?: string; country?: string };
};

type EnableBankingAspsp = {
  name: string;
  country: string;
  [key: string]: unknown;
};

type EnableBankingAuthResponse = {
  url: string;
  authorization_id: string;
};

type BankSyncTransaction = EnableBankingTransaction & {
  transactionId: string;
  date: string;
  bookingDate: string;
  valueDate?: string;
  transactionAmount: { amount: string; currency: string };
  payeeName: string;
  notes?: string;
  remittanceInformationUnstructured?: string;
  booked: boolean;
};

type BankSyncBalance = {
  balanceAmount: { amount: number; currency: string };
  balanceType: string;
  referenceDate?: string;
};

type NormalizedAccount = {
  account_id: string;
  name: string;
  institution: string;
  currency?: string;
  iban?: string;
};

// --- PSU headers ---

export type PsuHeaders = {
  'Psu-Ip-Address'?: string;
  'Psu-User-Agent'?: string;
};

// --- Helper functions ---

function getCredentials(): { applicationId: string; secretKey: string } {
  const applicationId = secretsService.get(
    SecretName.enablebanking_applicationId,
  );
  const secretKey = secretsService.get(SecretName.enablebanking_secretKey);

  if (!applicationId || !secretKey) {
    throw new EnableBankingError(
      'INVALID_INPUT',
      'NOT_CONFIGURED',
      'Enable Banking is not configured',
    );
  }

  return { applicationId, secretKey };
}

function getAuthorizationHeader(): string {
  const { applicationId, secretKey } = getCredentials();
  const token = getJWT(applicationId, secretKey);
  return `Bearer ${token}`;
}

const REQUEST_TIMEOUT_MS = 30_000; // 30 seconds

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  authHeaderOverride?: string,
  psuHeaders?: PsuHeaders,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  debug('%s %s', method, url);

  const headers: Record<string, string> = {
    Authorization: authHeaderOverride ?? getAuthorizationHeader(),
    'Content-Type': 'application/json',
  };

  // Forward PSU headers to signal the end-user is online.
  // This exempts the request from background data-fetch rate limits
  // that many ASPSPs enforce (e.g. 4 requests/day).
  if (psuHeaders) {
    for (const [key, value] of Object.entries(psuHeaders)) {
      if (value) {
        headers[key] = value;
      }
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const options: RequestInit = { method, headers, signal: controller.signal };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new EnableBankingError(
        'TIMED_OUT',
        'TIMED_OUT',
        'Request timed out',
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = await response.text().catch(() => 'unknown');
    }
    throw handleEnableBankingError(response.status, responseBody);
  }

  // eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- generic API wrapper, type is validated by caller
  return (await response.json()) as T;
}

// --- Normalization functions ---

// SEPA / ISO 20022 structured remittance prefixes (e.g. `EREF+invoice-42`).
// They are metadata for clearing systems, not user-facing text, so we strip
// them from the front of each remittance line. The list is an allowlist of
// known prefixes rather than a catch-all `[A-Z]{3,}\+` so we don't accidentally
// strip merchant tokens like `BMW+` or `USB+` that legitimately start a
// description.
const SEPA_PREFIX_RE =
  /^(?:EREF|KREF|MREF|CRED|DBTR|CDTR|SVWZ|SVCL|PURP|RTRN|REJT|REFE|SDVA|INDA|NTAV|ULTC|ULTD|ULTB|ABWA|ABWE|IBAN|BIC|COAM|OAMT|REMI|SQTP|ROC)\+/;

function stripSepaPrefix(s: string): string {
  return s.replace(SEPA_PREFIX_RE, '').trim();
}

function cleanRemittanceArray(arr: string[]): string[] {
  return arr.map(stripSepaPrefix).filter(Boolean);
}

export function normalizeTransaction(
  tx: EnableBankingTransaction,
): BankSyncTransaction {
  const transactionId = tx.entry_reference || tx.transaction_id || '';
  const bookingDate =
    tx.booking_date || tx.value_date || tx.transaction_date || '';
  const valueDate = tx.value_date;

  let payeeName = '';
  if (tx.credit_debit_indicator === 'CRDT' && tx.debtor?.name) {
    payeeName = tx.debtor.name;
  } else if (tx.credit_debit_indicator === 'DBIT' && tx.creditor?.name) {
    payeeName = tx.creditor.name;
  } else if (tx.creditor?.name) {
    payeeName = tx.creditor.name;
  } else if (tx.debtor?.name) {
    payeeName = tx.debtor.name;
  } else if (
    tx.remittance_information &&
    tx.remittance_information.length > 0
  ) {
    const cleanedFallback = cleanRemittanceArray(tx.remittance_information);
    if (cleanedFallback.length > 0) {
      payeeName = cleanedFallback[0];
    }
  }

  const cleanedAll = tx.remittance_information
    ? cleanRemittanceArray(tx.remittance_information)
    : [];
  const remittanceInformationUnstructured =
    cleanedAll.length > 0 ? cleanedAll.join(' ') : undefined;

  // Normalize amount based on credit/debit indicator.
  // When indicator is present, strip existing sign and apply the correct one.
  // When absent, preserve the original sign from the bank.
  const trimmedAmount = tx.transaction_amount.amount.trim();
  let signedAmount: string;
  if (tx.credit_debit_indicator === 'DBIT') {
    signedAmount = '-' + trimmedAmount.replace(/^[+-]/, '');
  } else if (tx.credit_debit_indicator === 'CRDT') {
    signedAmount = trimmedAmount.replace(/^[+-]/, '');
  } else {
    signedAmount = trimmedAmount;
  }

  return {
    ...tx,
    transactionId,
    date: bookingDate,
    bookingDate,
    valueDate,
    transactionAmount: {
      amount: signedAmount,
      currency: tx.transaction_amount.currency,
    },
    payeeName,
    notes: remittanceInformationUnstructured,
    remittanceInformationUnstructured,
    booked: tx.status !== 'PDNG',
  };
}

export function normalizeBalance(bal: EnableBankingBalance): BankSyncBalance {
  const amount = Math.round(parseFloat(bal.balance_amount.amount) * 100);
  return {
    balanceAmount: {
      amount,
      currency: bal.balance_amount.currency,
    },
    balanceType: bal.balance_type,
    referenceDate: bal.reference_date,
  };
}

export function normalizeAccount(
  account: EnableBankingSessionAccount,
  aspsp?: { name?: string },
): NormalizedAccount {
  return {
    account_id: account.uid,
    name: account.name || account.account_id?.iban || account.uid,
    institution: aspsp?.name || account.account_servicer?.name || 'Unknown',
    currency: account.currency,
    iban: account.account_id?.iban,
  };
}

// --- Service ---

export const enableBankingService = {
  isConfigured(): boolean {
    const applicationId = secretsService.get(
      SecretName.enablebanking_applicationId,
    );
    const secretKey = secretsService.get(SecretName.enablebanking_secretKey);
    return !!(applicationId && secretKey);
  },

  async validateCredentials(
    applicationId: string,
    secretKey: string,
  ): Promise<unknown> {
    const token = getJWT(applicationId, secretKey);
    return request<unknown>(
      'GET',
      '/application',
      undefined,
      `Bearer ${token}`,
    );
  },

  async getApplication(): Promise<unknown> {
    return request<unknown>('GET', '/application');
  },

  async getAspsps(country?: string): Promise<EnableBankingAspsp[]> {
    const query = country ? `?country=${encodeURIComponent(country)}` : '';
    return request<EnableBankingAspsp[]>('GET', `/aspsps${query}`);
  },

  async startAuth(
    aspsp: { name: string; country: string },
    redirectUrl: string,
    state: string,
    maxConsentValidity?: number,
  ): Promise<EnableBankingAuthResponse> {
    const DEFAULT_CONSENT_DAYS = 90;
    const defaultMs = DEFAULT_CONSENT_DAYS * 24 * 60 * 60 * 1000;

    // Respect the ASPSP's maximum_consent_validity (in seconds) if provided,
    // capping at our default of 90 days.
    const consentMs =
      maxConsentValidity != null && maxConsentValidity > 0
        ? Math.min(maxConsentValidity * 1000, defaultMs)
        : defaultMs;

    const validUntil = new Date(Date.now() + consentMs);

    return request<EnableBankingAuthResponse>('POST', '/auth', {
      aspsp: { name: aspsp.name, country: aspsp.country },
      redirect_url: redirectUrl,
      state,
      access: {
        valid_until: validUntil.toISOString(),
      },
    });
  },

  async createSession(code: string): Promise<EnableBankingSession> {
    return request<EnableBankingSession>('POST', '/sessions', { code });
  },

  async getSession(sessionId: string): Promise<EnableBankingSession> {
    return request<EnableBankingSession>(
      'GET',
      `/sessions/${encodeURIComponent(sessionId)}`,
    );
  },

  async getBalances(
    accountUid: string,
    psuHeaders?: PsuHeaders,
  ): Promise<{ balances: EnableBankingBalance[] }> {
    return request<{ balances: EnableBankingBalance[] }>(
      'GET',
      `/accounts/${encodeURIComponent(accountUid)}/balances`,
      undefined,
      undefined,
      psuHeaders,
    );
  },

  async getTransactions(
    accountUid: string,
    dateFrom: string,
    dateTo: string,
    continuationKey?: string,
    psuHeaders?: PsuHeaders,
  ): Promise<{
    transactions: EnableBankingTransaction[];
    continuation_key?: string;
  }> {
    let path = `/accounts/${encodeURIComponent(accountUid)}/transactions?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`;
    if (continuationKey) {
      path += `&continuation_key=${encodeURIComponent(continuationKey)}`;
    }
    return request<{
      transactions: EnableBankingTransaction[];
      continuation_key?: string;
    }>('GET', path, undefined, undefined, psuHeaders);
  },

  async getAllTransactions(
    accountUid: string,
    dateFrom: string,
    dateTo: string,
    psuHeaders?: PsuHeaders,
  ): Promise<EnableBankingTransaction[]> {
    const allTransactions: EnableBankingTransaction[] = [];
    let continuationKey: string | undefined;
    const maxIterations = 100;
    let iteration = 0;

    do {
      const result = await enableBankingService.getTransactions(
        accountUid,
        dateFrom,
        dateTo,
        continuationKey,
        psuHeaders,
      );
      allTransactions.push(...result.transactions);

      if (
        result.continuation_key &&
        result.continuation_key === continuationKey
      ) {
        break;
      }

      continuationKey = result.continuation_key;
      iteration++;
    } while (continuationKey && iteration < maxIterations);

    return allTransactions;
  },
};
