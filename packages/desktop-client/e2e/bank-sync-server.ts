import type { Page, Request } from '@playwright/test';

const SERVER_URL = 'https://sync.example.test';

const PROVIDER_PATHS = {
  gocardless: 'goCardless',
  simplefin: 'simpleFin',
  pluggyai: 'pluggyai',
  akahu: 'akahu',
  enablebanking: 'enableBanking',
} as const;

type ProviderPath = keyof typeof PROVIDER_PATHS;
type ProviderId = (typeof PROVIDER_PATHS)[ProviderPath];

export const SIMPLEFIN_EXTERNAL_ACCOUNT = {
  id: 'external-savings',
  name: 'External Savings',
  balance: '125.50',
  org: {
    id: 'example-bank',
    name: 'Example Bank',
    domain: 'bank.example.test',
  },
};

export type MockBankSyncServer = {
  configured: Partial<Record<ProviderId, 'global' | 'per-budget-file'>>;
  isUnreachable: boolean;
  deletedSecrets: string[];
  requests: string[];
  unexpectedRequests: string[];
};

function isProviderPath(value: string): value is ProviderPath {
  return value in PROVIDER_PATHS;
}

function getResponseData(server: MockBankSyncServer, request: Request) {
  const path = new URL(request.url()).pathname;
  const [, first, second] = path.split('/');

  if (path === '/account/needs-bootstrap') return { bootstrapped: true };
  if (path === '/account/validate') return { validated: true };
  if (path === '/sync/list-user-files') return [];
  if (path === '/api-keys') return [];

  if (isProviderPath(first) && second === 'status') {
    const source = server.configured[PROVIDER_PATHS[first]];
    return { configured: source != null, source };
  }
  if (path === '/simplefin/accounts') {
    return { accounts: [SIMPLEFIN_EXTERNAL_ACCOUNT] };
  }
  if (path === '/simplefin/transactions') {
    return {
      transactions: { all: [], booked: [], pending: [] },
      balances: [],
      startingBalance: 0,
    };
  }

  if (first === 'secret' && request.method() === 'DELETE') {
    server.deletedSecrets.push(second);
    const provider = second.split('_')[0];
    if (isProviderPath(provider)) {
      delete server.configured[PROVIDER_PATHS[provider]];
    }
    return {};
  }

  return undefined;
}

export async function mockBankSyncServer(
  page: Page,
  configured: MockBankSyncServer['configured'] = {},
): Promise<MockBankSyncServer> {
  const server: MockBankSyncServer = {
    configured: { ...configured },
    isUnreachable: false,
    deletedSecrets: [],
    requests: [],
    unexpectedRequests: [],
  };

  await page.context().route(`${SERVER_URL}/**`, async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    server.requests.push(path);

    if (server.isUnreachable) {
      await route.abort('connectionrefused');
      return;
    }

    if (path === '/sync/sync') {
      await route.fulfill({
        status: 503,
        json: { status: 'error', reason: 'network-failure' },
      });
      return;
    }

    if (path === '/account/login-methods') {
      await route.fulfill({
        json: { methods: [{ method: 'password', active: true }] },
      });
      return;
    }

    const data = getResponseData(server, request);
    if (data === undefined) {
      server.unexpectedRequests.push(`${request.method()} ${path}`);
      await route.fulfill({
        status: 404,
        json: { status: 'error', reason: 'not-found' },
      });
      return;
    }

    await route.fulfill({ json: { status: 'ok', data } });
  });

  return server;
}

export async function connectToMockServer(page: Page) {
  await page.evaluate(async url => {
    await window.$send('set-server-url', { url, validate: false });
    await window.$send('subscribe-set-token', { token: 'test-session' });
    await window.$send('save-prefs', { cloudFileId: 'budget' });
  }, SERVER_URL);
  await page.reload();
}

export async function linkAccountToSimpleFin(page: Page, accountName: string) {
  await page.evaluate(async name => {
    const { data } = await window.$query(
      window.$q('accounts').filter({ name }).select('id'),
    );
    await window.$send('simplefin-accounts-link', {
      externalAccount: {
        account_id: `external-${data[0].id}`,
        name,
        institution: 'Example Bank',
        orgDomain: 'bank.example.test',
        orgId: 'example-bank',
        balance: 0,
      },
      upgradingId: data[0].id,
    });
  }, accountName);
}

export async function openBankSyncPage(page: Page) {
  await page.goto('/settings');
  await page
    .getByRole('navigation', { name: 'Settings' })
    .getByRole('link', { name: 'Bank Sync', exact: true })
    .click();
}
