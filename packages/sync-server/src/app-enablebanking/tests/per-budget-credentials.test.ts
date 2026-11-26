import { randomUUID } from 'node:crypto';

import request from 'supertest';

import { getAccountDb } from '#account-db';
import { handlers } from '#app-enablebanking/app-enablebanking';
import { enableBankingService } from '#app-enablebanking/services/enablebanking-service';
import { SecretName, secretsService } from '#services/secrets-service';

const application = SecretName.enablebanking_applicationId;
const key = SecretName.enablebanking_secretKey;
const ownedBudget = randomUUID();
const otherBudget = randomUUID();
const user = 'valid-token-user';
const admin = 'valid-token-admin';

beforeAll(() => {
  for (const [id, owner] of [
    [ownedBudget, 'genericUser'],
    [otherBudget, 'genericAdmin'],
  ]) {
    getAccountDb().mutate(
      'INSERT INTO files (id, group_id, owner, sync_version, name) VALUES (?, ?, ?, 2, ?)',
      [id, randomUUID(), owner, 'Budget'],
    );
  }
});

afterEach(() => {
  for (const fileId of [null, ownedBudget, otherBudget]) {
    secretsService.reset(application, fileId);
    secretsService.reset(key, fileId);
  }
  vi.restoreAllMocks();
});

afterAll(() => {
  getAccountDb().mutate('DELETE FROM files WHERE id IN (?, ?)', [
    ownedBudget,
    otherBudget,
  ]);
});

function configure(token: string, fileId?: string) {
  const req = request(handlers).post('/configure').set('x-actual-token', token);
  if (fileId) req.set('X-Actual-File-Id', fileId);
  return req.send({ applicationId: 'budget-id', secretKey: 'budget-key' });
}

function status(token: string, fileId?: string) {
  const req = request(handlers).post('/status').set('x-actual-token', token);
  if (fileId) req.set('X-Actual-File-Id', fileId);
  return req.send({});
}

it('lets a budget owner set credentials for that budget only', async () => {
  vi.spyOn(enableBankingService, 'validateCredentials').mockResolvedValue({});

  await configure(user, otherBudget).expect(403);
  await configure(user, 'not/a/file').expect(400);
  expect(secretsService.get(application, otherBudget)).toBeNull();

  const response = await configure(user, ownedBudget).expect(200);
  expect(response.body.data).toEqual({
    configured: true,
    source: 'per-budget-file',
  });
  expect(secretsService.get(application, ownedBudget)).toBe('budget-id');
  expect(secretsService.get(key, ownedBudget)).toBe('budget-key');
  expect(secretsService.get(application)).toBeNull();
  expect(secretsService.get(key)).toBeNull();

  await configure(admin, otherBudget).expect(200);
  expect(secretsService.get(application, otherBudget)).toBe('budget-id');
});

it("prefers a budget's own credentials and falls back to the global ones", async () => {
  expect((await status(user, ownedBudget)).body.data).toEqual({
    configured: false,
  });

  secretsService.set(application, 'global-id');
  secretsService.set(key, 'global-key');
  expect((await status(user, ownedBudget)).body.data).toEqual({
    configured: true,
    source: 'global',
  });

  secretsService.set(application, 'budget-id', ownedBudget);
  secretsService.set(key, 'budget-key', ownedBudget);
  expect((await status(user, ownedBudget)).body.data).toEqual({
    configured: true,
    source: 'per-budget-file',
  });
  expect((await status(user)).body.data.source).toBe('global');

  // A budget the user cannot open reveals nothing.
  await status(user, otherBudget).expect(403);
});

it('uses the selected credentials for bank requests', async () => {
  secretsService.set(application, 'global-id');
  secretsService.set(key, 'global-key');
  secretsService.set(application, 'budget-id', ownedBudget);
  secretsService.set(key, 'budget-key', ownedBudget);
  const getAspsps = vi
    .spyOn(enableBankingService, 'getAspsps')
    .mockResolvedValue([]);

  await request(handlers)
    .post('/aspsps')
    .set('x-actual-token', user)
    .set('X-Actual-File-Id', ownedBudget)
    .send({ country: 'FI' })
    .expect(200);
  expect(getAspsps).toHaveBeenLastCalledWith('FI', ownedBudget);

  await request(handlers)
    .post('/aspsps')
    .set('x-actual-token', user)
    .send({ country: 'FI' })
    .expect(200);
  expect(getAspsps).toHaveBeenLastCalledWith('FI', null);
});

it('finishes an authorization with the credentials it was started with', async () => {
  secretsService.set(application, 'global-id');
  secretsService.set(key, 'global-key');
  secretsService.set(application, 'budget-id', ownedBudget);
  secretsService.set(key, 'budget-key', ownedBudget);
  vi.spyOn(enableBankingService, 'startAuth').mockResolvedValue({
    url: 'https://bank.example/auth',
    authorization_id: 'authorization',
  });
  const createSession = vi
    .spyOn(enableBankingService, 'createSession')
    .mockResolvedValue({ session_id: 'session', accounts: [] });

  const started = await request(handlers)
    .post('/start-auth')
    .set('x-actual-token', user)
    .set('X-Actual-File-Id', ownedBudget)
    .send({
      aspsp: { name: 'Bank', country: 'FI' },
      redirectUrl: 'https://actual.example/enablebanking/auth_callback',
    })
    .expect(200);
  const { state } = started.body.data;

  // The window completing the flow names no budget.
  await request(handlers)
    .post('/complete-auth')
    .set('x-actual-token', user)
    .send({ code: 'code', state })
    .expect(200);
  expect(createSession).toHaveBeenCalledWith('code', ownedBudget);
});
