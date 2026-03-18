import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { getAccountDb, getLoginMethod, getServerPrefs } from './account-db';
import { bootstrapPassword } from './accounts/password';
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

const createSession = (userId, sessionToken, authMethod = null) => {
  getAccountDb().mutate(
    'INSERT INTO sessions (token, user_id, expires_at, auth_method) VALUES (?, ?, ?, ?)',
    [sessionToken, userId, Math.floor(Date.now() / 1000) + 60 * 60, authMethod], // Expire in 1 hour (stored in seconds)
  );
};

const generateSessionToken = () => `token-${uuidv4()}`;

const clearServerPrefs = () => {
  getAccountDb().mutate('DELETE FROM server_prefs');
};

const insertAuthRow = (method, active, extraData = null) => {
  getAccountDb().mutate(
    'INSERT INTO auth (method, display_name, extra_data, active) VALUES (?, ?, ?, ?)',
    [method, method, extraData, active],
  );
};

const clearAuth = () => {
  getAccountDb().mutate('DELETE FROM auth');
};

describe('/change-password', () => {
  let adminUserId,
    basicUserId,
    adminPasswordToken,
    adminOpenidToken,
    basicPasswordToken;

  beforeEach(() => {
    adminUserId = uuidv4();
    basicUserId = uuidv4();
    adminPasswordToken = generateSessionToken();
    adminOpenidToken = generateSessionToken();
    basicPasswordToken = generateSessionToken();
    createUser(adminUserId, 'admin', ADMIN_ROLE);
    createUser(basicUserId, 'basic', BASIC_ROLE);
    createSession(adminUserId, adminPasswordToken, 'password');
    createSession(adminUserId, adminOpenidToken, 'openid');
    createSession(basicUserId, basicPasswordToken, 'password');
  });

  afterEach(() => {
    deleteUser(adminUserId);
    deleteUser(basicUserId);
    clearAuth();
  });

  it('should return 401 if no session token is provided', async () => {
    const res = await request(app).post('/change-password').send({
      password: 'newpassword',
    });

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('status', 'error');
    expect(res.body).toHaveProperty('reason', 'unauthorized');
  });

  it('should return 403 when user is not an admin', async () => {
    bootstrapPassword('oldpassword');

    const res = await request(app)
      .post('/change-password')
      .set('x-actual-token', basicPasswordToken)
      .send({ password: 'newpassword' });

    expect(res.statusCode).toEqual(403);
    expect(res.body).toEqual({
      status: 'error',
      reason: 'forbidden',
      details: 'permission-not-found',
    });
  });

  it('should return 403 when admin session uses openid auth method', async () => {
    bootstrapPassword('oldpassword');

    const res = await request(app)
      .post('/change-password')
      .set('x-actual-token', adminOpenidToken)
      .send({ password: 'newpassword' });

    expect(res.statusCode).toEqual(403);
    expect(res.body).toEqual({
      status: 'error',
      reason: 'forbidden',
      details: 'password-auth-not-active',
    });
  });

  it('should return 400 when admin password-auth session sends empty password', async () => {
    bootstrapPassword('oldpassword');

    const res = await request(app)
      .post('/change-password')
      .set('x-actual-token', adminPasswordToken)
      .send({ password: '' });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({ status: 'error', reason: 'invalid-password' });
  });

  it('should return 200 when admin with password-auth session sends valid password', async () => {
    bootstrapPassword('oldpassword');

    const res = await request(app)
      .post('/change-password')
      .set('x-actual-token', adminPasswordToken)
      .send({ password: 'newpassword' });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ status: 'ok', data: {} });
  });
});

describe('getLoginMethod()', () => {
  afterEach(() => {
    clearAuth();
  });

  it('returns the active DB method when no req is provided', () => {
    insertAuthRow('password', 1);
    expect(getLoginMethod(undefined)).toBe('password');
  });

  it('honors a client-requested method when it is active in DB', () => {
    insertAuthRow('openid', 1);
    const req = { body: { loginMethod: 'openid' } };
    expect(getLoginMethod(req)).toBe('openid');
  });

  it('ignores a client-requested method that is inactive in DB', () => {
    insertAuthRow('openid', 1);
    insertAuthRow('password', 0);
    const req = { body: { loginMethod: 'password' } };
    expect(getLoginMethod(req)).toBe('openid');
  });

  it('ignores a client-requested method that is not in DB', () => {
    insertAuthRow('openid', 1);
    const req = { body: { loginMethod: 'password' } };
    expect(getLoginMethod(req)).toBe('openid');
  });

  it('falls back to config default when auth table is empty and no req', () => {
    // auth table is empty — getActiveLoginMethod() returns undefined
    // config default for loginMethod is 'password'
    expect(getLoginMethod(undefined)).toBe('password');
  });
});

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
