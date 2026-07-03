import { OpenBankingClient } from '@open-banking-io/client';
import createDebug from 'debug';

import { SecretName, secretsService } from '#services/secrets-service';

const debug = createDebug('actual:openbankingio:service');

const TRANSACTIONS_PAGE_LIMIT = 500;

// open-banking.io is a hosted API, so its base URL always lives on the
// open-banking.io domain. The credentials bundle carries its own `apiBaseUrl`,
// but that value is user-controlled — pin it to open-banking.io (https only) so
// a tampered bundle can't point the SDK at an internal/metadata host (SSRF).
function assertOpenBankingIoUrl(apiBaseUrl) {
  let url;
  try {
    url = new URL(apiBaseUrl);
  } catch {
    throw new Error(`Invalid open-banking.io apiBaseUrl: ${apiBaseUrl}`);
  }

  const host = url.hostname.toLowerCase();
  const allowed =
    url.protocol === 'https:' &&
    (host === 'open-banking.io' || host.endsWith('.open-banking.io'));

  if (!allowed) {
    throw new Error(
      `Refusing to use apiBaseUrl outside open-banking.io: ${apiBaseUrl}`,
    );
  }
}

// --- Helper functions ---

function getCredentials() {
  const credsJson = secretsService.get(SecretName.openbankingio_credentials);

  if (!credsJson) {
    throw new Error('open-banking.io is not configured');
  }

  return credsJson;
}

// The open-banking.io SDK decrypts the credentials bundle and holds the
// per-institution keys required to fetch + decrypt account data.
function getClient() {
  const bundle = JSON.parse(getCredentials());

  if (typeof bundle?.apiBaseUrl === 'string' && bundle.apiBaseUrl) {
    assertOpenBankingIoUrl(bundle.apiBaseUrl);
  }

  return OpenBankingClient.fromBundle(bundle);
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

function stripSepaPrefix(s) {
  return s.replace(SEPA_PREFIX_RE, '').trim();
}

function cleanRemittanceArray(arr) {
  return arr.map(stripSepaPrefix).filter(Boolean);
}

// The SDK may return remittance information as a single string or an array of
// lines; normalize to an array so downstream handling matches Enable Banking.
function toRemittanceArray(remittanceInformation) {
  if (Array.isArray(remittanceInformation)) {
    return remittanceInformation.filter(s => typeof s === 'string');
  }
  if (typeof remittanceInformation === 'string' && remittanceInformation) {
    return [remittanceInformation];
  }
  return [];
}

export function normalizeTransaction(tx) {
  const transactionId = tx.id || '';
  const bookingDate =
    tx.bookingDate || tx.valueDate || tx.transactionDate || '';
  const valueDate = tx.valueDate;

  let payeeName = '';
  if (tx.creditDebitIndicator === 'CRDT' && tx.debtorName) {
    payeeName = tx.debtorName;
  } else if (tx.creditDebitIndicator === 'DBIT' && tx.creditorName) {
    payeeName = tx.creditorName;
  } else if (tx.creditorName) {
    payeeName = tx.creditorName;
  } else if (tx.debtorName) {
    payeeName = tx.debtorName;
  } else {
    const cleanedFallback = cleanRemittanceArray(
      toRemittanceArray(tx.remittanceInformation),
    );
    if (cleanedFallback.length > 0) {
      payeeName = cleanedFallback[0];
    }
  }

  const cleanedAll = cleanRemittanceArray(
    toRemittanceArray(tx.remittanceInformation),
  );
  const remittanceInformationUnstructured =
    cleanedAll.length > 0 ? cleanedAll.join(' ') : undefined;

  // Normalize amount based on credit/debit indicator. The SDK returns an
  // unsigned magnitude (decimal string), so strip any stray sign and apply the
  // correct one: DBIT is money out (negative), CRDT is money in (positive).
  const trimmedAmount = String(tx.amount ?? '').trim();
  let signedAmount;
  if (tx.creditDebitIndicator === 'DBIT') {
    signedAmount = '-' + trimmedAmount.replace(/^[+-]/, '');
  } else if (tx.creditDebitIndicator === 'CRDT') {
    signedAmount = trimmedAmount.replace(/^[+-]/, '');
  } else {
    // Unknown/absent direction: we can't tell whether this is money in or out.
    // Keep the raw magnitude here, but `isImportableTransaction` drops the
    // record so we never import a guessed sign (a wrong sign silently corrupts
    // the balance).
    signedAmount = trimmedAmount;
  }

  // Return an explicit, clean shape — do NOT spread `...tx`. The SDK's raw
  // transaction carries a top-level unsigned `amount` magnitude; leaking it
  // would shadow loot-core's fallback to the signed `transactionAmount.amount`
  // (sync.ts: `if (!trans.amount) trans.amount = trans.transactionAmount.amount`),
  // making every transaction import as a positive deposit. (Enable Banking can
  // safely spread its raw tx because it uses `transaction_amount`, not `amount`.)
  return {
    transactionId,
    date: bookingDate,
    bookingDate,
    valueDate,
    transactionAmount: {
      amount: signedAmount,
      currency: tx.currency,
    },
    payeeName,
    notes: remittanceInformationUnstructured ?? tx.note,
    remittanceInformationUnstructured,
    // Kept so `isImportableTransaction` can drop records with no clear
    // credit/debit direction (rather than importing a guessed sign).
    creditDebitIndicator: tx.creditDebitIndicator,
    // open-banking.io passes the Berlin Group status through unchanged
    // ('BOOK' booked, 'PDNG' pending), exactly like Enable Banking.
    booked: tx.status !== 'PDNG',
  };
}

const IMPORTABLE_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Actual's client imports a transaction by inserting it into a local SQLite
// database: the `date` column is a required integer derived from an ISO date,
// and the amount must be numeric. A record with an empty / non-ISO date or a
// non-numeric amount makes that insert throw, which aborts the whole account
// sync, so callers skip such records instead of failing the entire import.
export function isImportableTransaction(tx) {
  // Trim and reject empty amounts explicitly: Number('') is 0 (finite), so an
  // empty/whitespace amount would otherwise slip through as a zero transaction.
  const amount = tx.transactionAmount.amount.trim();
  // Require a known credit/debit direction — without it we can't sign the
  // amount, and importing an unsigned magnitude would flip outgoing payments
  // into positive deposits.
  const hasDirection =
    tx.creditDebitIndicator === 'CRDT' || tx.creditDebitIndicator === 'DBIT';
  return (
    hasDirection &&
    IMPORTABLE_DATE_REGEX.test(tx.date) &&
    amount !== '' &&
    Number.isFinite(Number(amount))
  );
}

// Balances arrive without a currency of their own, so the account currency is
// threaded through. Amounts are integer cents to match the bank-sync wire
// format Actual expects.
export function normalizeBalance(bal, currency) {
  const amount = Math.round(parseFloat(bal.amount) * 100);
  return {
    balanceAmount: {
      amount,
      currency,
    },
    balanceType: bal.type,
    referenceDate: bal.referenceDate,
  };
}

// The interim booked balance ('ITBD') is the closing balance Actual uses as the
// starting balance; fall back to the first available balance if absent.
function getStartingBalanceCents(balances, currency) {
  const source = balances || [];
  const preferred = source.find(b => b.type === 'ITBD') ?? source[0];
  return preferred
    ? normalizeBalance(preferred, currency).balanceAmount.amount
    : 0;
}

export function normalizeAccount(account) {
  return {
    account_id: account.id,
    name:
      account.displayName ||
      account.accountName ||
      account.ownerName ||
      account.iban ||
      account.id,
    institution: account.aspspName || 'Unknown',
    balance: getStartingBalanceCents(account.balances, account.currency),
  };
}

// --- Service ---

export const openBankingIoService = {
  isConfigured() {
    return !!secretsService.get(SecretName.openbankingio_credentials);
  },

  async getAccounts() {
    const client = getClient();
    return client.getAccounts();
  },

  async getAllTransactions(accountId, startDate) {
    const client = getClient();

    const allTransactions = [];
    let offset = 0;
    const maxIterations = 100;
    let iteration = 0;

    // Page until the API returns a non-full page. We deliberately don't rely on
    // `page.total`: if the API omits it, trusting it would stop after the first
    // page and silently truncate history. A short (or empty) page is the last.
    while (iteration < maxIterations) {
      const page = await client.getTransactions(accountId, {
        from: startDate,
        limit: TRANSACTIONS_PAGE_LIMIT,
        offset,
      });

      const items = page.items || [];
      allTransactions.push(...items);
      offset += items.length;
      iteration++;

      if (items.length < TRANSACTIONS_PAGE_LIMIT) {
        break;
      }
    }

    debug(
      'Fetched %d transactions for account %s',
      allTransactions.length,
      accountId,
    );

    return allTransactions;
  },
};
