import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { getAccountDb } from './account-db';
import { handlers as app } from './app-api-tokens';

// Helper functions
const createUser = (userId, userName, role = 'BASIC', owner = 0, enabled = 1) => {
  getAccountDb().mutate(
    'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, userName, `${userName} display`, enabled, owner, role],
  );
};

const deleteUser = userId => {
  getAccountDb().mutate('DELETE FROM api_token_budgets WHERE token_id IN (SELECT id FROM api_tokens WHERE user_id = ?)', [userId]);
  getAccountDb().mutate('DELETE FROM api_tokens WHERE user_id = ?', [userId]);
  getAccountDb().mutate('DELETE FROM user_access WHERE user_id = ?', [userId]);
  getAccountDb().mutate('DELETE FROM users WHERE id = ?', [userId]);
};

const createSession = (userId, sessionToken) => {
  getAccountDb().mutate(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    [sessionToken, userId, -1], // Never expires
  );
};

const deleteSession = sessionToken => {
  getAccountDb().mutate('DELETE FROM sessions WHERE token = ?', [sessionToken]);
};

const generateSessionToken = () => `token-${uuidv4()}`;

describe('/api-tokens', () => {
  let userId, sessionToken;

  beforeEach(() => {
    userId = uuidv4();
    sessionToken = generateSessionToken();
    createUser(userId, 'testuser');
    createSession(userId, sessionToken);
  });

  afterEach(() => {
    deleteSession(sessionToken);
    deleteUser(userId);
  });

  describe('POST /', () => {
    it('should create a new API token', async () => {
      const res = await request(app)
        .post('/')
        .send({ name: 'Test Token' })
        .set('x-actual-token', sessionToken);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('ok');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.token).toMatch(/^act_/);
      expect(res.body.data.name).toBe('Test Token');
      expect(res.body.data).toHaveProperty('prefix');
      expect(res.body.data).toHaveProperty('createdAt');
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/')
        .send({})
        .set('x-actual-token', sessionToken);

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('error');
      expect(res.body.reason).toBe('invalid-name');
    });

    it('should return 400 if name is empty', async () => {
      const res = await request(app)
        .post('/')
        .send({ name: '   ' })
        .set('x-actual-token', sessionToken);

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('error');
      expect(res.body.reason).toBe('invalid-name');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/')
        .send({ name: 'Test Token' });

      expect(res.statusCode).toEqual(401);
    });

    it('should create token with budget scopes', async () => {
      const budgetId = uuidv4();
      // Create a file for the budget
      getAccountDb().mutate(
        'INSERT INTO files (id, owner) VALUES (?, ?)',
        [budgetId, userId],
      );

      const res = await request(app)
        .post('/')
        .send({ name: 'Scoped Token', budgetIds: [budgetId] })
        .set('x-actual-token', sessionToken);

      expect(res.statusCode).toEqual(201);
      expect(res.body.data.budgetIds).toContain(budgetId);

      // Cleanup
      getAccountDb().mutate('DELETE FROM files WHERE id = ?', [budgetId]);
    });
  });

  describe('GET /', () => {
    it('should list user tokens', async () => {
      // Create a token first
      await request(app)
        .post('/')
        .send({ name: 'Token 1' })
        .set('x-actual-token', sessionToken);

      await request(app)
        .post('/')
        .send({ name: 'Token 2' })
        .set('x-actual-token', sessionToken);

      const res = await request(app)
        .get('/')
        .set('x-actual-token', sessionToken);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(2);
      // Tokens should not include the actual token value
      expect(res.body.data[0]).not.toHaveProperty('token');
      expect(res.body.data[0]).toHaveProperty('prefix');
      expect(res.body.data[0]).toHaveProperty('name');
    });

    it('should return empty array if no tokens', async () => {
      const res = await request(app)
        .get('/')
        .set('x-actual-token', sessionToken);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.data).toEqual([]);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/');

      expect(res.statusCode).toEqual(401);
    });

    it('should only return tokens for the current user', async () => {
      // Create token for first user
      await request(app)
        .post('/')
        .send({ name: 'User 1 Token' })
        .set('x-actual-token', sessionToken);

      // Create second user
      const userId2 = uuidv4();
      const sessionToken2 = generateSessionToken();
      createUser(userId2, 'testuser2');
      createSession(userId2, sessionToken2);

      // Create token for second user
      await request(app)
        .post('/')
        .send({ name: 'User 2 Token' })
        .set('x-actual-token', sessionToken2);

      // List tokens for first user
      const res = await request(app)
        .get('/')
        .set('x-actual-token', sessionToken);

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('User 1 Token');

      // Cleanup
      deleteSession(sessionToken2);
      deleteUser(userId2);
    });
  });

  describe('DELETE /:id', () => {
    it('should revoke a token', async () => {
      // Create a token first
      const createRes = await request(app)
        .post('/')
        .send({ name: 'Token to Delete' })
        .set('x-actual-token', sessionToken);

      const tokenId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/${tokenId}`)
        .set('x-actual-token', sessionToken);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('ok');

      // Verify token is deleted
      const listRes = await request(app)
        .get('/')
        .set('x-actual-token', sessionToken);

      expect(listRes.body.data.length).toBe(0);
    });

    it('should return 404 for non-existent token', async () => {
      const res = await request(app)
        .delete('/non-existent-id')
        .set('x-actual-token', sessionToken);

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('error');
      expect(res.body.reason).toBe('not-found');
    });

    it('should not allow deleting another user token', async () => {
      // Create token for first user
      const createRes = await request(app)
        .post('/')
        .send({ name: 'User 1 Token' })
        .set('x-actual-token', sessionToken);

      const tokenId = createRes.body.data.id;

      // Create second user
      const userId2 = uuidv4();
      const sessionToken2 = generateSessionToken();
      createUser(userId2, 'testuser2');
      createSession(userId2, sessionToken2);

      // Try to delete first user's token as second user
      const res = await request(app)
        .delete(`/${tokenId}`)
        .set('x-actual-token', sessionToken2);

      expect(res.statusCode).toEqual(404);

      // Cleanup
      deleteSession(sessionToken2);
      deleteUser(userId2);
    });
  });

  describe('PATCH /:id', () => {
    it('should enable/disable a token', async () => {
      // Create a token first
      const createRes = await request(app)
        .post('/')
        .send({ name: 'Token to Toggle' })
        .set('x-actual-token', sessionToken);

      const tokenId = createRes.body.data.id;

      // Disable the token
      let res = await request(app)
        .patch(`/${tokenId}`)
        .send({ enabled: false })
        .set('x-actual-token', sessionToken);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('ok');

      // Verify token is disabled
      let listRes = await request(app)
        .get('/')
        .set('x-actual-token', sessionToken);

      expect(listRes.body.data[0].enabled).toBe(false);

      // Re-enable the token
      res = await request(app)
        .patch(`/${tokenId}`)
        .send({ enabled: true })
        .set('x-actual-token', sessionToken);

      expect(res.statusCode).toEqual(200);

      // Verify token is enabled
      listRes = await request(app)
        .get('/')
        .set('x-actual-token', sessionToken);

      expect(listRes.body.data[0].enabled).toBe(true);
    });

    it('should return 400 if enabled is not a boolean', async () => {
      const createRes = await request(app)
        .post('/')
        .send({ name: 'Test Token' })
        .set('x-actual-token', sessionToken);

      const tokenId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/${tokenId}`)
        .send({ enabled: 'yes' })
        .set('x-actual-token', sessionToken);

      expect(res.statusCode).toEqual(400);
      expect(res.body.reason).toBe('invalid-enabled');
    });

    it('should return 404 for non-existent token', async () => {
      const res = await request(app)
        .patch('/non-existent-id')
        .send({ enabled: false })
        .set('x-actual-token', sessionToken);

      expect(res.statusCode).toEqual(404);
    });
  });
});
