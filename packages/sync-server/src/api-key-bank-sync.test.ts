import { randomUUID } from 'node:crypto';

import express from 'express';
import request from 'supertest';
import { fetch, Response } from 'undici';

import { getAccountDb } from './account-db';
import { handlers as akahuApp } from './app-akahu/app-akahu';
import { handlers as keysApp } from './app-api-keys';
import { handlers as enableApp } from './app-enablebanking/app-enablebanking';
import { handlers as gcApp } from './app-gocardless/app-gocardless';
import { handlers as pluggyApp } from './app-pluggyai/app-pluggyai';
import { handlers as simplefinApp } from './app-simplefin/app-simplefin';
import { SecretName, secretsService } from './services/secrets-service';

const pluggy = vi.hoisted(() => ({
  fetchAccount: vi.fn(),
  fetchAllTransactions: vi.fn(),
}));
vi.mock('pluggy-sdk', () => ({
  PluggyClient: class {
    fetchAccount = pluggy.fetchAccount;
    fetchAllTransactions = pluggy.fetchAllTransactions;
  },
}));
vi.mock(import('undici'), async original => ({
  ...(await original()),
  fetch: vi.fn(),
}));
vi.mock(import('./util/ssrf'), async original => ({
  ...(await original()),
  assertUrlAllowed: vi.fn(),
  createSsrfDispatcher: vi.fn(),
}));

vi.mock('./app-gocardless/services/gocardless-service', () => ({
  goCardlessService: {
    isConfigured: () => true,
    getTransactionsWithBalance: vi.fn().mockResolvedValue({
      balances: [],
      transactions: { all: [], booked: [], pending: [] },
    }),
  },
}));
vi.mock(
  import('./app-enablebanking/services/enablebanking-service'),
  async original => {
    const actual = await original();
    return {
      ...actual,
      enableBankingService: {
        ...actual.enableBankingService,
        isConfigured: () => true,
        getBalances: vi.fn().mockResolvedValue([]),
        getAllTransactions: vi.fn().mockResolvedValue([]),
      },
    };
  },
);
vi.mock('akahu', () => ({
  AkahuClient: class {
    accounts = {
      get: vi
        .fn()
        .mockResolvedValue({ balance: { current: 0, currency: 'NZD' } }),
      listTransactions: vi.fn().mockResolvedValue({ items: [] }),
      listPendingTransactions: vi.fn().mockResolvedValue([]),
    };
  },
}));

const app = express();
app.use('/api-keys', keysApp);
app.use('/gocardless', gcApp);
app.use('/akahu', akahuApp);
app.use('/enablebanking', enableApp);
app.use('/simplefin', simplefinApp);
app.use('/pluggyai', pluggyApp);
const db = getAccountDb();
const session = 'valid-token-admin';
const budget = randomUUID();
const otherBudget = randomUUID();
let key: string;
let keyId: string;
let sharedKey: string;
let sharedKeyId: string;
const credentials = {
  [SecretName.akahu_appToken]: 'app-token',
  [SecretName.akahu_userToken]: 'user-token',
  [SecretName.simplefin_token]: 'setup-token',
  [SecretName.simplefin_accessKey]: 'https://user:pass@bridge.example/accounts',
  [SecretName.pluggyai_clientId]: 'client-id',
  [SecretName.pluggyai_clientSecret]: 'client-secret',
  [SecretName.pluggyai_itemIds]: 'allowed-item',
};

beforeAll(async () => {
  for (const id of [budget, otherBudget]) {
    db.mutate(
      'INSERT INTO files (id, group_id, owner, sync_version, name) VALUES (?, ?, ?, 2, ?)',
      [id, randomUUID(), 'genericAdmin', 'Budget'],
    );
  }
  const created = await request(app)
    .post('/api-keys')
    .set('X-ACTUAL-TOKEN', session)
    .send({ name: 'Sync', fileIds: [budget] })
    .expect(201);
  key = created.body.data.key;
  keyId = created.body.data.id;
  const shared = await request(app)
    .post('/api-keys')
    .set('X-ACTUAL-TOKEN', session)
    .send({
      name: 'Shared sync',
      fileIds: [budget],
      permissions: ['bank-sync-global'],
    })
    .expect(201);
  sharedKey = shared.body.data.key;
  sharedKeyId = shared.body.data.id;
});
beforeEach(() => {
  vi.clearAllMocks();
  for (const [name, value] of Object.entries(credentials)) {
    secretsService.set(name, value, budget);
    secretsService.set(name, value);
  }
  pluggy.fetchAccount.mockResolvedValue({
    itemId: 'allowed-item',
    balance: 0,
    updatedAt: new Date('2026-01-01'),
  });
  pluggy.fetchAllTransactions.mockResolvedValue([
    {
      id: 'transaction',
      date: new Date('2026-01-02'),
      amount: 3,
      status: 'POSTED',
    },
  ]);
  vi.mocked(fetch).mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          accounts: [
            {
              id: 'account',
              balance: '0',
              'balance-date': 1,
              transactions: [
                { id: 'transaction', posted: 1767312000, amount: '3' },
              ],
            },
          ],
          errors: [],
        }),
      ),
  );
});
afterEach(() => {
  for (const name of Object.keys(credentials)) {
    secretsService.reset(name, budget);
    secretsService.reset(name);
  }
});
afterAll(() => {
  db.mutate('DELETE FROM api_keys WHERE id IN (?, ?)', [keyId, sharedKeyId]);
  db.mutate('DELETE FROM files WHERE id IN (?, ?)', [budget, otherBudget]);
});
function sync(provider: string, token = key, fileId: string | null = budget) {
  const req = request(app)
    .post(`/${provider}/transactions`)
    .set('X-ACTUAL-TOKEN', token);
  if (fileId !== null) req.set('X-Actual-File-Id', fileId);
  return req.send({
    accountId: 'account',
    requisitionId: 'requisition',
    startDate: '2026-01-01',
  });
}

it.each(['simplefin', 'pluggyai'])(
  'syncs %s with scoped credentials and rejects missing or ungranted budgets',
  async provider => {
    const response = await sync(provider).expect(200);
    expect(response.body.data.transactions.all).toEqual([
      expect.objectContaining({ transactionId: 'transaction' }),
    ]);
    vi.clearAllMocks();
    await sync(provider, key, null).expect(403);
    await sync(provider, key, otherBudget).expect(403);
    expect(fetch).not.toHaveBeenCalled();
    expect(pluggy.fetchAccount).not.toHaveBeenCalled();
  },
);
it.each(['simplefin', 'pluggyai'])(
  'never falls back to global %s credentials for keys, but preserves session fallback',
  async provider => {
    for (const name of Object.keys(credentials)) {
      secretsService.reset(name, budget);
    }
    const response = await sync(provider);
    expect(response.body.data?.transactions).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
    expect(pluggy.fetchAccount).not.toHaveBeenCalled();
    const sharedResponse = await sync(provider, sharedKey).expect(200);
    expect(sharedResponse.body.data.transactions.all).toEqual([
      expect.objectContaining({ transactionId: 'transaction' }),
    ]);
    const sessionResponse = await sync(provider, session).expect(200);
    expect(sessionResponse.body.data.transactions.all).toEqual([
      expect.objectContaining({ transactionId: 'transaction' }),
    ]);
  },
);
it('rejects Pluggy accounts outside the configured budget items', async () => {
  pluggy.fetchAccount.mockResolvedValue({ itemId: 'other-item' });
  await sync('pluggyai').expect(403);
  expect(pluggy.fetchAllTransactions).not.toHaveBeenCalled();
});

it.each(['gocardless', 'akahu', 'enablebanking'])(
  'requires explicit permission to sync global %s connections',
  async provider => {
    await sync(provider).expect(403);
    const response = await sync(provider, sharedKey, null).expect(200);
    expect(response.body.data.transactions.all).toEqual([]);
    const ordinary = await sync(provider, session, null).expect(200);
    expect(ordinary.body.data.transactions.all).toEqual([]);
  },
);
it.each([
  '/gocardless/create-web-token',
  '/gocardless/remove-account',
  '/enablebanking/configure',
  '/enablebanking/start-auth',
  '/enablebanking/complete-auth',
  '/enablebanking/poll-auth',
  '/akahu/accounts',
  '/simplefin/accounts',
  '/pluggyai/accounts',
])(
  'does not grant shared connection setup or discovery through %s',
  async path => {
    const response = await request(app)
      .post(path)
      .set('X-ACTUAL-TOKEN', sharedKey)
      .send({});
    expect(response.status).toBe(
      path.startsWith('/simplefin') || path.startsWith('/pluggyai') ? 403 : 401,
    );
  },
);
it('lists shared permissions and removes them on revocation', async () => {
  const listed = await request(app)
    .get('/api-keys')
    .set('X-ACTUAL-TOKEN', session)
    .expect(200);
  expect(
    listed.body.data.find((key: { id: string }) => key.id === sharedKeyId)
      .permissions,
  ).toEqual(['bank-sync-global']);
  await request(app)
    .delete(`/api-keys/${sharedKeyId}`)
    .set('X-ACTUAL-TOKEN', session)
    .expect(200);
  await sync('gocardless', sharedKey).expect(401);
  expect(
    db.all('SELECT * FROM api_key_permissions WHERE key_id = ?', [sharedKeyId]),
  ).toEqual([]);
});
