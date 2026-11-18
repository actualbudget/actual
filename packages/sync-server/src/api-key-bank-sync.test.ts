import { randomUUID } from 'node:crypto';

import express from 'express';
import request from 'supertest';
import { fetch, Response } from 'undici';

import { getAccountDb } from './account-db';
import { handlers as keysApp } from './app-api-keys';
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

const app = express();
app.use('/api-keys', keysApp);
app.use('/simplefin', simplefinApp);
app.use('/pluggyai', pluggyApp);
const db = getAccountDb();
const session = 'valid-token-admin';
const budget = randomUUID();
const otherBudget = randomUUID();
let key: string;
let keyId: string;
const credentials = {
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
  vi.mocked(fetch).mockResolvedValue(
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
  db.mutate('DELETE FROM api_keys WHERE id = ?', [keyId]);
  db.mutate('DELETE FROM files WHERE id IN (?, ?)', [budget, otherBudget]);
});
function sync(provider: string, token = key, fileId: string | null = budget) {
  const req = request(app)
    .post(`/${provider}/transactions`)
    .set('X-ACTUAL-TOKEN', token);
  if (fileId !== null) req.set('X-Actual-File-Id', fileId);
  return req.send({ accountId: 'account', startDate: '2026-01-01' });
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
