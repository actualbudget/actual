import { v4 as uuidv4 } from 'uuid';

import { getAccountDb } from '../account-db';
import { apiTokenService } from '../services/api-token-service';

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
  describe('Authorization header parsing', () => {
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

    it('should accept standard "Bearer token" format', async () => {
      const req = {
        body: {},
        headers: { authorization: `Bearer ${apiToken}` },
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      expect(result).not.toBeNull();
      expect(result.user_id).toBe(userId);
      expect(result.auth_method).toBe('api_token');
    });

    it('should accept lowercase "bearer token" format', async () => {
      const req = {
        body: {},
        headers: { authorization: `bearer ${apiToken}` },
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      expect(result).not.toBeNull();
      expect(result.user_id).toBe(userId);
    });

    it('should accept uppercase "BEARER token" format', async () => {
      const req = {
        body: {},
        headers: { authorization: `BEARER ${apiToken}` },
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      expect(result).not.toBeNull();
      expect(result.user_id).toBe(userId);
    });

    it('should accept mixed case "BeArEr token" format', async () => {
      const req = {
        body: {},
        headers: { authorization: `BeArEr ${apiToken}` },
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      expect(result).not.toBeNull();
      expect(result.user_id).toBe(userId);
    });

    it('should handle leading/trailing whitespace in header', async () => {
      const req = {
        body: {},
        headers: { authorization: `  Bearer ${apiToken}  ` },
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      expect(result).not.toBeNull();
      expect(result.user_id).toBe(userId);
    });

    it('should handle extra whitespace after Bearer', async () => {
      const req = {
        body: {},
        headers: { authorization: `Bearer  ${apiToken}` },
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      expect(result).not.toBeNull();
      expect(result.user_id).toBe(userId);
    });

    it('should ignore non-string authorization header (array)', async () => {
      const req = {
        body: {},
        headers: { authorization: [`Bearer ${apiToken}`, 'Bearer other'] },
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      // Should fail because array is ignored
      expect(result).toBeNull();
      expect(res.statusCode).toBe(401);
    });

    it('should reject invalid token after parsing', async () => {
      const req = {
        body: {},
        headers: { authorization: 'Bearer act_invalidtoken12345678901234' },
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      expect(result).toBeNull();
      expect(res.statusCode).toBe(401);
      expect(res.body.details).toBe('invalid-api-token');
    });

    it('should prefer x-actual-token header over Authorization', async () => {
      // When both x-actual-token and Authorization are present,
      // x-actual-token should be used first
      const req = {
        body: {},
        headers: {
          'x-actual-token': apiToken,
          authorization: 'Bearer invalid-token',
        },
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      // Should use x-actual-token (valid API token), not Authorization (invalid)
      expect(result).not.toBeNull();
      expect(result.user_id).toBe(userId);
    });

    it('should prefer body token over headers', async () => {
      // When body.token and Authorization are both present,
      // body.token should be used first
      const req = {
        body: { token: apiToken },
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };
      const res = createMockRes();

      const result = await validateSession(req, res);

      // Should use body token (valid API token), not Authorization (invalid)
      expect(result).not.toBeNull();
      expect(result.user_id).toBe(userId);
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
