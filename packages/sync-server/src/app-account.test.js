import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { getAccountDb, getServerPrefs } from './account-db';
import { handlers as app } from './app-account';

const ADMIN_ROLE = 'ADMIN';
const BASIC_ROLE = 'BASIC';

// Create user helper function
const createUser = (userId, userName, role, owner = 0, enabled = 1) => {
  getAccountDb().mutate(
    'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, userName, `${userName} display`, enabled, owner, role],
  );
};

const deleteUser = userId => {
  getAccountDb().mutate('DELETE FROM user_access WHERE user_id = ?', [userId]);
  getAccountDb().mutate('DELETE FROM users WHERE id = ?', [userId]);
};

const createSession = (userId, sessionToken) => {
  getAccountDb().mutate(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    [sessionToken, userId, Math.floor(Date.now() / 1000) + 60 * 60], // Expire in 1 hour (stored in seconds)
  );
};

const generateSessionToken = () => `token-${uuidv4()}`;

const clearServerPrefs = () => {
  getAccountDb().mutate('DELETE FROM server_prefs');
};

describe('/server-prefs', () => {
  describe('POST /server-prefs', () => {
    let adminUserId, basicUserId, adminSessionToken, basicSessionToken;

    beforeEach(() => {
      adminUserId = uuidv4();
      basicUserId = uuidv4();
      adminSessionToken = generateSessionToken();
      basicSessionToken = generateSessionToken();

      createUser(adminUserId, 'admin', ADMIN_ROLE);
      createUser(basicUserId, 'user', BASIC_ROLE);
      createSession(adminUserId, adminSessionToken);
      createSession(basicUserId, basicSessionToken);
    });

    afterEach(() => {
      deleteUser(adminUserId);
      deleteUser(basicUserId);
      clearServerPrefs();
    });

    it('should return 401 if no session token is provided', async () => {
      const res = await request(app)
        .post('/server-prefs')
        .send({
          prefs: { 'flags.plugins': 'true' },
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('status', 'error');
      expect(res.body).toHaveProperty('reason', 'unauthorized');
    });

    it('should return 403 if user is not an admin', async () => {
      const res = await request(app)
        .post('/server-prefs')
        .set('x-actual-token', basicSessionToken)
        .send({
          prefs: { 'flags.plugins': 'true' },
        });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toEqual({
        status: 'error',
        reason: 'forbidden',
        details: 'permission-not-found',
      });
    });

    it('should return 400 if prefs is not an object', async () => {
      const res = await request(app)
        .post('/server-prefs')
        .set('x-actual-token', adminSessionToken)
        .send({
          prefs: 'invalid',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({
        status: 'error',
        reason: 'invalid-prefs',
      });
    });

    it('should return 400 if prefs is missing', async () => {
      const res = await request(app)
        .post('/server-prefs')
        .set('x-actual-token', adminSessionToken)
        .send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({
        status: 'error',
        reason: 'invalid-prefs',
      });
    });

    it('should return 400 if prefs is null', async () => {
      const res = await request(app)
        .post('/server-prefs')
        .set('x-actual-token', adminSessionToken)
        .send({
          prefs: null,
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({
        status: 'error',
        reason: 'invalid-prefs',
      });
    });

    it('should return 200 and save server preferences for admin user', async () => {
      const prefs = { 'flags.plugins': 'true' };

      const res = await request(app)
        .post('/server-prefs')
        .set('x-actual-token', adminSessionToken)
        .send({ prefs });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        status: 'ok',
        data: {},
      });

      // Verify that preferences were saved
      const savedPrefs = getServerPrefs();
      expect(savedPrefs).toEqual(prefs);
    });

    it('should update existing server preferences', async () => {
      // First, set initial preferences
      getAccountDb().mutate(
        'INSERT INTO server_prefs (key, value) VALUES (?, ?)',
        ['flags.plugins', 'false'],
      );

      // Update preferences
      const updatedPrefs = { 'flags.plugins': 'true' };
      const res = await request(app)
        .post('/server-prefs')
        .set('x-actual-token', adminSessionToken)
        .send({ prefs: updatedPrefs });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        status: 'ok',
        data: {},
      });

      // Verify that preferences were updated
      const savedPrefs = getServerPrefs();
      expect(savedPrefs).toEqual(updatedPrefs);
    });

    it('should save multiple server preferences', async () => {
      const prefs = {
        'flags.plugins': 'true',
        anotherKey: 'anotherValue',
      };

      const res = await request(app)
        .post('/server-prefs')
        .set('x-actual-token', adminSessionToken)
        .send({ prefs });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        status: 'ok',
        data: {},
      });

      // Verify that all preferences were saved
      const savedPrefs = getServerPrefs();
      expect(savedPrefs).toEqual(prefs);
    });
  });
});
