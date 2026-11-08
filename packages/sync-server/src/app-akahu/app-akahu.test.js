import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { getAccountDb } from '#account-db';
import { apiTokenService } from '#services/api-token-service';

import { handlers as app } from './app-akahu';

describe('/akahu API token access', () => {
  let userId, sessionToken, fileId;

  beforeEach(() => {
    userId = uuidv4();
    sessionToken = `token-${uuidv4()}`;
    fileId = uuidv4();
    getAccountDb().mutate(
      'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, 1, 0, ?)',
      [userId, `akahu-${userId}`, 'akahu user', 'BASIC'],
    );
    getAccountDb().mutate(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
      [sessionToken, userId, -1],
    );
    getAccountDb().mutate('INSERT INTO files (id, owner) VALUES (?, ?)', [
      fileId,
      userId,
    ]);
  });

  afterEach(() => {
    getAccountDb().mutate(
      'DELETE FROM api_token_budgets WHERE token_id IN (SELECT id FROM api_tokens WHERE user_id = ?)',
      [userId],
    );
    getAccountDb().mutate('DELETE FROM api_tokens WHERE user_id = ?', [userId]);
    getAccountDb().mutate('DELETE FROM sessions WHERE token = ?', [
      sessionToken,
    ]);
    getAccountDb().mutate('DELETE FROM files WHERE id = ?', [fileId]);
    getAccountDb().mutate('DELETE FROM users WHERE id = ?', [userId]);
  });

  it('rejects API tokens on bank-sync endpoints', async () => {
    const { token } = await apiTokenService.createToken(userId, 'script', [
      fileId,
    ]);

    const res = await request(app).post('/status').set('x-actual-token', token);

    expect(res.statusCode).toEqual(403);
    expect(res.body.reason).toEqual('forbidden-auth-method');
  });

  it('allows password sessions', async () => {
    const res = await request(app)
      .post('/status')
      .set('x-actual-token', sessionToken);

    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('ok');
  });
});
