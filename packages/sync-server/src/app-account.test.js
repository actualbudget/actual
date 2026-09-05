import { Secret, TOTP } from 'otpauth';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

import { getAccountDb, getLoginMethod, getServerPrefs } from './account-db';
import { bootstrapPassword } from './accounts/password';
import { confirmTotpEnrollment, generateTotpSecret } from './accounts/totp';
import {
  handlers as app,
  authRateLimiter,
  mfaRateLimiter,
} from './app-account';

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

const PERIOD_MS = 30 * 1000;

const totpCodeAt = (secret, timestamp) =>
  new TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  }).generate({ timestamp });

// Enable TOTP with the confirming code taken from the previous step, so codes
// for the current step are still unused and can be spent by a login.
const enableTotp = () => {
  const { secret } = generateTotpSecret();
  const past = Date.now() - PERIOD_MS;
  confirmTotpEnrollment(totpCodeAt(secret, past), past);
  return secret;
};

const clearTotp = () => {
  getAccountDb().mutate('DELETE FROM auth_totp');
  getAccountDb().mutate('DELETE FROM pending_mfa_challenges');
};

beforeEach(() => {
  authRateLimiter.resetKey('127.0.0.1');
  mfaRateLimiter.resetKey('127.0.0.1');
});

describe('auth rate limiting', () => {
  it('should return 429 after exceeding the rate limit on /login', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/login').send({ password: 'wrong' });
    }

    const res = await request(app).post('/login').send({ password: 'wrong' });

    expect(res.statusCode).toEqual(429);
    expect(res.body).toEqual({
      status: 'error',
      reason: 'too-many-requests',
    });
  });

  it('should apply the same rate limit across /login and /bootstrap', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/login').send({ password: 'wrong' });
    }

    const res = await request(app)
      .post('/bootstrap')
      .send({ password: 'test' });

    expect(res.statusCode).toEqual(429);
    expect(res.body).toEqual({
      status: 'error',
      reason: 'too-many-requests',
    });
  });

  it('should not rate limit non-auth endpoints', async () => {
    for (let i = 0; i < 6; i++) {
      await request(app).post('/login').send({ password: 'wrong' });
    }

    const res = await request(app).get('/needs-bootstrap');
    expect(res.statusCode).toEqual(200);
  });
});

describe('/needs-bootstrap', () => {
  it('advertises two-factor support so newer clients can offer it', async () => {
    const res = await request(app).get('/needs-bootstrap');

    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('supportsTotp', true);
  });
});

describe('/totp/enroll', () => {
  let adminUserId, adminPasswordToken;

  beforeEach(async () => {
    adminUserId = uuidv4();
    adminPasswordToken = generateSessionToken();
    createUser(adminUserId, 'admin', ADMIN_ROLE);
    createSession(adminUserId, adminPasswordToken, 'password');
    await bootstrapPassword('testpassword');
  });

  afterEach(() => {
    deleteUser(adminUserId);
    clearTotp();
    clearAuth();
  });

  const enroll = body =>
    request(app)
      .post('/totp/enroll')
      .set('X-ACTUAL-TOKEN', adminPasswordToken)
      .send({ clientSupportsMfa: true, ...body });

  it('refuses without a password', async () => {
    const res = await enroll({});

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('reason', 'invalid-password');
  });

  it('refuses a wrong password', async () => {
    const res = await enroll({ password: 'nope' });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('reason', 'invalid-password');
  });

  it('issues a secret once the password is confirmed', async () => {
    const res = await enroll({ password: 'testpassword' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('secret');
    expect(res.body.data.otpauthUrl).toContain('otpauth://totp/');
  });

  it('still requires the MFA-capable client marker', async () => {
    const res = await request(app)
      .post('/totp/enroll')
      .set('X-ACTUAL-TOKEN', adminPasswordToken)
      .send({ password: 'testpassword' });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('reason', 'mfa-client-unsupported');
  });

  it('rejects an unauthenticated request before looking at the password', async () => {
    const res = await request(app)
      .post('/totp/enroll')
      .send({ clientSupportsMfa: true, password: 'testpassword' });

    expect(res.statusCode).toEqual(401);
  });
});

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
    await bootstrapPassword('oldpassword');

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
    await bootstrapPassword('oldpassword');

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
    await bootstrapPassword('oldpassword');

    const res = await request(app)
      .post('/change-password')
      .set('x-actual-token', adminPasswordToken)
      .send({ password: '' });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({ status: 'error', reason: 'invalid-password' });
  });

  it('should return 200 when admin with password-auth session sends valid password', async () => {
    await bootstrapPassword('oldpassword');

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

  it('honors a client-requested method that exists but is inactive in DB', () => {
    insertAuthRow('openid', 1);
    insertAuthRow('password', 0);
    const req = { body: { loginMethod: 'password' } };
    expect(getLoginMethod(req)).toBe('password');
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

describe('/login', () => {
  afterEach(() => {
    clearAuth();
  });

  it('should allow password login when OIDC is the active method', async () => {
    await bootstrapPassword('testpassword');
    insertAuthRow('openid', 1);
    getAccountDb().mutate(
      "UPDATE auth SET active = 0 WHERE method = 'password'",
    );

    const res = await request(app)
      .post('/login')
      .send({ loginMethod: 'password', password: 'testpassword' });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body.data).toHaveProperty('token');
  });

  it('should reject wrong password even when method is explicitly requested', async () => {
    await bootstrapPassword('testpassword');
    insertAuthRow('openid', 1);
    getAccountDb().mutate(
      "UPDATE auth SET active = 0 WHERE method = 'password'",
    );

    const res = await request(app)
      .post('/login')
      .send({ loginMethod: 'password', password: 'wrongpassword' });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('reason', 'invalid-password');
  });
});

describe('/login with TOTP enabled', () => {
  afterEach(() => {
    clearTotp();
    clearAuth();
  });

  const signInWithPassword = (password = 'testpassword') =>
    request(app)
      .post('/login')
      .send({ loginMethod: 'password', password, clientSupportsMfa: true });

  const verifyCode = (mfaToken, code) =>
    request(app)
      .post('/login')
      .send({ loginMethod: 'password', mfaToken, code });

  it('refuses a client that cannot complete the second step', async () => {
    await bootstrapPassword('testpassword');
    enableTotp();

    // An older client omits the marker. It must be refused, never let through
    // without the second factor.
    const res = await request(app)
      .post('/login')
      .send({ loginMethod: 'password', password: 'testpassword' });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('reason', 'mfa-client-unsupported');
    expect(res.body.data).toBeUndefined();
  });

  it('returns a challenge instead of a token after the password step', async () => {
    await bootstrapPassword('testpassword');
    enableTotp();

    const res = await signInWithPassword();

    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('mfaRequired', true);
    expect(res.body.data).toHaveProperty('mfaToken');
    expect(res.body.data).not.toHaveProperty('token');
  });

  it('issues a token once a valid code is presented', async () => {
    await bootstrapPassword('testpassword');
    const secret = enableTotp();

    const { body } = await signInWithPassword();
    const res = await verifyCode(
      body.data.mfaToken,
      totpCodeAt(secret, Date.now()),
    );

    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('token');
  });

  it('does not issue a challenge for a wrong password', async () => {
    await bootstrapPassword('testpassword');
    enableTotp();

    const res = await signInWithPassword('wrongpassword');

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('reason', 'invalid-password');
  });

  it('rejects an invalid code', async () => {
    await bootstrapPassword('testpassword');
    enableTotp();

    const { body } = await signInWithPassword();
    const res = await verifyCode(body.data.mfaToken, '000000');

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('reason', 'invalid-totp-code');
  });

  it('rejects an unknown challenge token', async () => {
    await bootstrapPassword('testpassword');
    const secret = enableTotp();

    const res = await verifyCode(
      'not-a-real-token',
      totpCodeAt(secret, Date.now()),
    );

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('reason', 'mfa-challenge-expired');
  });

  it('destroys the challenge after too many wrong codes', async () => {
    await bootstrapPassword('testpassword');
    const secret = enableTotp();

    const { body } = await signInWithPassword();
    const { mfaToken } = body.data;

    // The per-IP limiter would otherwise trip first; this test is about the
    // per-challenge attempt cap, which also holds behind a shared proxy IP.
    const attempt = code => {
      authRateLimiter.resetKey('127.0.0.1');
      return verifyCode(mfaToken, code);
    };

    for (let i = 0; i < 4; i++) {
      const res = await attempt('000000');
      expect(res.body).toHaveProperty('reason', 'invalid-totp-code');
    }

    const exhausted = await attempt('000000');
    expect(exhausted.body).toHaveProperty('reason', 'mfa-challenge-expired');

    // Even the correct code no longer works: the challenge is gone.
    const afterwards = await attempt(totpCodeAt(secret, Date.now()));
    expect(afterwards.body).toHaveProperty('reason', 'mfa-challenge-expired');
  });

  it('consumes the challenge so it cannot be reused', async () => {
    await bootstrapPassword('testpassword');
    const secret = enableTotp();

    const { body } = await signInWithPassword();
    const code = totpCodeAt(secret, Date.now());

    const first = await verifyCode(body.data.mfaToken, code);
    expect(first.statusCode).toEqual(200);

    const second = await verifyCode(body.data.mfaToken, code);
    expect(second.statusCode).toEqual(400);
    expect(second.body).toHaveProperty('reason', 'mfa-challenge-expired');
  });

  it('does not require a code when TOTP is not enabled', async () => {
    await bootstrapPassword('testpassword');

    const res = await signInWithPassword();

    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).not.toHaveProperty('mfaRequired');
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
