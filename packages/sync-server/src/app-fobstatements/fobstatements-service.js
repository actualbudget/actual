import { SecretName, secretsService } from '#services/secrets-service';

const DEFAULT_API_URL = 'https://statements.finopsbricks.com';

// Safety cap so a misbehaving `has_more` can never loop forever.
const MAX_PAGES = 100;
const PAGE_LIMIT = 500;

function hasCredentials(fileId = null) {
  return !!(
    secretsService.get(SecretName.fobstatements_apiKey, fileId) &&
    secretsService.get(SecretName.fobstatements_apiSecret, fileId)
  );
}

function getCredentialSource(fileId) {
  if (!!fileId && hasCredentials(fileId)) {
    return 'per-budget-file';
  }

  if (hasCredentials()) {
    return 'global';
  }

  return null;
}

function resolveCredentials(fileId) {
  const source = getCredentialSource(fileId);
  if (!source) {
    throw new Error('FOB Statements credentials are not configured');
  }

  const credentialFileId = source === 'per-budget-file' ? fileId : null;
  const apiKey = secretsService.get(
    SecretName.fobstatements_apiKey,
    credentialFileId,
  );
  const apiSecret = secretsService.get(
    SecretName.fobstatements_apiSecret,
    credentialFileId,
  );
  const apiUrl =
    secretsService.get(SecretName.fobstatements_apiUrl, credentialFileId) ||
    DEFAULT_API_URL;

  return { apiKey, apiSecret, apiUrl: apiUrl.replace(/\/+$/, '') };
}

async function apiRequest(creds, path, searchParams) {
  const url = new URL(creds.apiUrl + path);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value != null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'api-key': creds.apiKey,
      'api-secret': creds.apiSecret,
      accept: 'application/json',
    },
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      body?.error?.message || `${response.status} ${response.statusText}`;
    throw new Error(`FOB Statements API error: ${message}`);
  }

  return body;
}

// Auto-paginate a list endpoint (`{ data, page_context: { has_more } }`).
async function apiGetAll(creds, path, searchParams) {
  const rows = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const body = await apiRequest(creds, path, {
      ...searchParams,
      page,
      limit: PAGE_LIMIT,
    });
    const data = body?.data ?? [];
    rows.push(...data);

    if (!body?.page_context?.has_more || data.length === 0) {
      break;
    }
    page += 1;
  }

  return rows;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

// FOB account categories -> a human-readable label shown in Actual's
// "Institution" / "Bank" column (FOB does not expose a real institution).
function categoryLabel(category) {
  if (category === 'credit_card') return 'Credit card';
  if (category === 'bank') return 'Bank';
  return '';
}

async function whoami(creds) {
  try {
    const body = await apiRequest(creds, '/api/v1/whoami');
    return body?.data ?? null;
  } catch {
    // Identity is only used to label the institution; never block on it.
    return null;
  }
}

async function fetchAccountBalance(creds, accountId, asOf) {
  const body = await apiRequest(
    creds,
    `/api/v1/accounts/${accountId}/balance`,
    {
      as_of: asOf,
    },
  );
  return body?.data?.balance ?? null;
}

async function fetchAccountById(creds, accountId) {
  const body = await apiRequest(creds, `/api/v1/accounts/${accountId}`);
  return body?.data ?? null;
}

export const fobStatementsService = {
  isConfigured: fileId => getCredentialSource(fileId) != null,

  getCredentialSource,

  whoami: async fileId => {
    const creds = resolveCredentials(fileId);
    return whoami(creds);
  },

  // Returns SyncServerFobStatementsAccount[] ready for the link modal.
  getAccounts: async fileId => {
    const creds = resolveCredentials(fileId);
    const rawAccounts = await apiGetAll(creds, '/api/v1/accounts', {
      status: 'active',
    });

    const today = todayString();
    const balances = await Promise.allSettled(
      rawAccounts.map(acct => fetchAccountBalance(creds, acct.id, today)),
    );

    return rawAccounts.map((acct, i) => {
      const balanceResult = balances[i];
      const balance =
        balanceResult.status === 'fulfilled' && balanceResult.value != null
          ? balanceResult.value
          : (acct.opening_balance ?? 0);

      // FOB has no institution concept — the underlying bank is embedded in the
      // free-text account name (e.g. "ICICI 0006") and `org` is the FOB org, not
      // an institution. Surface the account type in Actual's "Institution" /
      // "Bank" column instead, and group accounts by type, so it shows something
      // meaningful rather than the FOB org name.
      return {
        account_id: acct.id,
        name: acct.name,
        balance,
        category: acct.category,
        currency: acct.currency,
        institution: categoryLabel(acct.category),
        orgId: acct.category || undefined,
        orgDomain: null,
      };
    });
  },

  getAccountById: async (accountId, fileId) => {
    const creds = resolveCredentials(fileId);
    return fetchAccountById(creds, accountId);
  },

  // Balance as of a specific day (decimal, major units). Used for the
  // opening-balance auto-fill in the link modal.
  getAccountBalance: async (accountId, asOf, fileId) => {
    const creds = resolveCredentials(fileId);
    return fetchAccountBalance(creds, accountId, asOf ?? todayString());
  },

  // Raw FOB transactions (inflow/outflow are integers scaled x1000).
  getTransactions: async (accountId, startDate, fileId) => {
    const creds = resolveCredentials(fileId);
    return apiGetAll(creds, '/api/v1/transactions', {
      accounts: accountId,
      date_from: startDate,
      sort_order: 'DESC',
    });
  },
};
