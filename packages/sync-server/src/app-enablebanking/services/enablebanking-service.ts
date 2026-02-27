import crypto from 'node:crypto';

const BASE_URL = 'https://api.enablebanking.com';

function generateJwt(
  appId: string,
  privateKey: string,
  method: string,
  path: string,
  body?: unknown,
): string {
  const header = { alg: 'RS256', typ: 'JWT', kid: appId };

  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: now,
    exp: now + 3600,
    req_method: method,
    req_path: path,
  };

  if (body) {
    payload.req_body_hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(body))
      .digest('hex');
  }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    'base64url',
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    'base64url',
  );
  const signInput = `${encodedHeader}.${encodedPayload}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signInput);
  sign.end();
  const signature = sign.sign(privateKey, 'base64url');

  return `${signInput}.${signature}`;
}

async function request(
  appId: string,
  privateKey: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const jwt = generateJwt(appId, privateKey, method, path, body);

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Enable Banking API error: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  return (await response.json()) as Record<string, unknown>;
}

export async function checkStatus(appId: string, privateKey: string) {
  try {
    await request(appId, privateKey, 'GET', '/application');
    return { configured: true };
  } catch {
    return { configured: false };
  }
}

export async function getBanks(
  appId: string,
  privateKey: string,
  country: string,
) {
  const response = await request(
    appId,
    privateKey,
    'GET',
    `/aspsps?country=${country}`,
  );
  return ((response.aspsps as Array<Record<string, unknown>>) ?? []).map(
    (aspsp: Record<string, unknown>) => ({
      id: aspsp.name,
      name: aspsp.name,
      logo: aspsp.logo ?? '',
      countries: [country],
    }),
  );
}

export async function createSession(
  appId: string,
  privateKey: string,
  aspsp: string,
  redirectUrl: string,
  country: string,
) {
  const validUntil = new Date(
    Date.now() + 90 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const body: Record<string, unknown> = {
    access: { valid_until: validUntil },
    aspsp: { name: aspsp, country },
    state: crypto.randomUUID(),
    redirect_url: redirectUrl,
    psu_type: 'personal',
  };

  const response = await request(appId, privateKey, 'POST', '/auth', body);
  return { url: response.url as string };
}

export async function completeSession(
  appId: string,
  privateKey: string,
  code: string,
) {
  // In Enable Banking the OAuth callback 'code' param is the session_id.
  // The session was already created by POST /auth; just fetch its accounts.
  const sessionId = code;
  const accountsResp = await request(
    appId,
    privateKey,
    'GET',
    `/sessions/${sessionId}/accounts`,
  );

  return {
    sessionId,
    accounts: (
      (accountsResp.accounts as Array<Record<string, unknown>>) ?? []
    ).map((acc: Record<string, unknown>) => ({
      account_id: acc.uid,
      name:
        (acc as Record<string, string>).account_name ||
        (acc as Record<string, string>).iban ||
        'Unknown Account',
      institution: (acc as Record<string, string>).aspsp_name ?? '',
      mask: (acc as Record<string, string>).iban
        ? (acc as Record<string, string>).iban.slice(-4)
        : '',
      iban: (acc as Record<string, string>).iban ?? '',
      orgId: (acc as Record<string, string>).aspsp_name ?? '',
      orgDomain: '',
    })),
  };
}

function getDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export async function getTransactions(
  appId: string,
  privateKey: string,
  accountId: string,
  startDate: string,
) {
  const path = `/accounts/${accountId}/transactions?date_from=${startDate}`;
  let allTransactions: Array<Record<string, unknown>> = [];
  let continuationKey: string | null = null;

  // Paginate through results
  do {
    const url = continuationKey
      ? `${path}&continuation_key=${continuationKey}`
      : path;
    const response = await request(appId, privateKey, 'GET', url);

    const txns =
      (response.transactions as Array<Record<string, unknown>>) ?? [];
    allTransactions = allTransactions.concat(txns);
    continuationKey = (response.continuation_key as string | null) ?? null;
  } while (continuationKey);

  // Get balances
  const balancesResp = await request(
    appId,
    privateKey,
    'GET',
    `/accounts/${accountId}/balances`,
  );

  const rawBalances: Array<Record<string, unknown>> =
    (balancesResp.balances as Array<Record<string, unknown>>) ?? [];

  // Map balances to the expected BankSyncResponse format
  const balances = rawBalances.map((b: Record<string, unknown>) => {
    const balanceAmount = b.balance_amount as
      | Record<string, string>
      | undefined;
    return {
      balanceAmount: {
        amount: balanceAmount?.amount ?? '0',
        currency: balanceAmount?.currency ?? 'EUR',
      },
      balanceType: b.balance_type ?? 'expected',
      referenceDate: (b.reference_date as string) ?? getDate(new Date()),
    };
  });

  // Calculate starting balance (as integer cents)
  const expectedBalance =
    balances.find(b => b.balanceType === 'expected') ??
    balances.find(b => b.balanceType === 'closingBooked') ??
    balances[0];

  const startingBalance = expectedBalance
    ? Math.round(parseFloat(String(expectedBalance.balanceAmount.amount)) * 100)
    : 0;

  // Map transactions into the format expected by loot-core
  const all: Array<Record<string, unknown>> = [];
  const booked: Array<Record<string, unknown>> = [];
  const pending: Array<Record<string, unknown>> = [];

  for (const tx of allTransactions) {
    const txAmount = tx.transaction_amount as
      | Record<string, string>
      | undefined;
    const amount = txAmount?.amount ?? '0';
    const currency = txAmount?.currency ?? 'EUR';

    const bookingDate =
      (tx.booking_date as string) ??
      (tx.value_date as string) ??
      getDate(new Date());

    const creditorName = tx.creditor_name as string | undefined;
    const debtorName = tx.debtor_name as string | undefined;
    const remittanceInfo =
      (tx.remittance_information as string[] | undefined)?.[0] ?? '';

    const payeeName = creditorName ?? debtorName ?? remittanceInfo ?? 'Unknown';

    const isBooked = tx.entry_status !== 'PENDING';

    const mapped = {
      transactionId:
        (tx.entry_reference as string) ??
        (tx.transaction_id as string) ??
        `${bookingDate}-${amount}-${payeeName}`,
      date: bookingDate,
      payeeName,
      transactionAmount: { amount, currency },
      booked: isBooked,
      notes: remittanceInfo,
      // Keep original fields for raw_synced_data
      creditorName,
      debtorName,
      remittanceInformationUnstructured: remittanceInfo,
      valueDate: (tx.value_date as string) ?? bookingDate,
    };

    all.push(mapped);
    if (isBooked) {
      booked.push(mapped);
    } else {
      pending.push(mapped);
    }
  }

  return {
    balances,
    startingBalance,
    transactions: { all, booked, pending },
  };
}
