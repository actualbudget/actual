import { v4 as uuidv4 } from 'uuid';

import { getAccountDb } from '#account-db';
import { apiTokenService } from '#services/api-token-service';

import { validateSession } from './validate-user';

// Helper functions
const createUser = (userId, userName) => {
  getAccountDb().mutate(
    'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, userName, `${userName} display`, 1, 0, 'BASIC'],
  );
};

const deleteUser = userId => {
  getAccountDb().mutate(
    'DELETE FROM api_token_budgets WHERE token_id IN (SELECT id FROM api_tokens WHERE user_id = ?)',
    [userId],
  );
  getAccountDb().mutate('DELETE FROM api_tokens WHERE user_id = ?', [userId]);
  getAccountDb().mutate('DELETE FROM users WHERE id = ?', [userId]);
};

const createSession = (userId, sessionToken) => {
  getAccountDb().mutate(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    [sessionToken, userId, -1],
  );
};

const deleteSession = sessionToken => {
  getAccountDb().mutate('DELETE FROM sessions WHERE token = ?', [sessionToken]);
};

// Mock response helper
const createMockRes = () => {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
  return res;
};

describe('validateSession', () => {
  describe('API token validation', () => {
    let userId, apiToken;

    beforeEach(async () => {
      userId = uuidv4();
      createUser(userId, 'testuser');
      const result = await apiTokenService.createToken(userId, 'Test Token');
      apiToken = result.token;
    });

    afterEach(() => {
      deleteUser(userId);
    });

    it('should accept API token from x-actual-token header', async () => {
      const req = {
        body: {},
        headers: { 'x-actual-token': apiToken },
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      expect(result).not.toBeNull();
      expect(result.user_id).toBe(userId);
      expect(result.auth_method).toBe('api_token');
    });

    it('should accept API token from body', async () => {
      const req = {
        body: { token: apiToken },
        headers: {},
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      expect(result).not.toBeNull();
      expect(result.user_id).toBe(userId);
    });

    it('should ignore the Authorization header', async () => {
      const req = {
        body: {},
        headers: { authorization: `Bearer ${apiToken}` },
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      expect(result).toBeNull();
      expect(res.statusCode).toBe(401);
    });

    it('should reject an invalid API token', async () => {
      const req = {
        body: {},
        headers: { 'x-actual-token': 'act_invalidtoken12345678901234' },
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      expect(result).toBeNull();
      expect(res.statusCode).toBe(401);
      expect(res.body.details).toBe('invalid-api-token');
    });
  });

  describe('session token validation', () => {
    let userId, sessionToken;

    beforeEach(() => {
      userId = uuidv4();
      sessionToken = `session-${uuidv4()}`;
      createUser(userId, 'testuser');
      createSession(userId, sessionToken);
    });

    afterEach(() => {
      deleteSession(sessionToken);
      deleteUser(userId);
    });

    it('should validate session token from body', async () => {
      const req = {
        body: { token: sessionToken },
        headers: {},
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      expect(result).not.toBeNull();
      expect(result.user_id).toBe(userId);
    });

    it('should validate session token from x-actual-token header', async () => {
      const req = {
        body: {},
        headers: { 'x-actual-token': sessionToken },
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      expect(result).not.toBeNull();
      expect(result.user_id).toBe(userId);
    });

    it('should reject invalid session token', async () => {
      const req = {
        body: { token: 'invalid-token' },
        headers: {},
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      expect(result).toBeNull();
      expect(res.statusCode).toBe(401);
      expect(res.body.details).toBe('token-not-found');
    });

    it('should reject expired session token', async () => {
      // Create an expired session
      const expiredToken = `expired-${uuidv4()}`;
      getAccountDb().mutate(
        'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
        [expiredToken, userId, 1], // Expired (timestamp 1 = 1970)
      );

      const req = {
        body: { token: expiredToken },
        headers: {},
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      expect(result).toBeNull();
      expect(res.statusCode).toBe(401);
      expect(res.body.reason).toBe('token-expired');

      getAccountDb().mutate('DELETE FROM sessions WHERE token = ?', [
        expiredToken,
      ]);
    });
  });
});
