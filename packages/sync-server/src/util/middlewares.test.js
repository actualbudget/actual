import { enforceBudgetScope, rejectApiTokenMiddleware } from './middlewares';

const createMockReq = (overrides = {}) => ({
  headers: {},
  body: {},
  query: {},
  params: {},
  ...overrides,
});

const createMockRes = (locals = {}) => {
  const res = {
    locals,
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

describe('enforceBudgetScope', () => {
  describe('non-API token auth', () => {
    it('allows session auth', () => {
      const res = createMockRes({ auth_method: 'password', user_id: 'user1' });

      expect(enforceBudgetScope(res, 'any-budget-id')).toBe(true);
      expect(res.statusCode).toBeNull();
    });

    it('allows when auth_method is undefined', () => {
      const res = createMockRes({ user_id: 'user1' });

      expect(enforceBudgetScope(res, 'any-budget-id')).toBe(true);
      expect(res.statusCode).toBeNull();
    });
  });

  describe('API token with no scopes (empty array)', () => {
    it('allows access to any budget', () => {
      const res = createMockRes({
        auth_method: 'api_token',
        user_id: 'user1',
        budget_ids: [],
      });

      expect(enforceBudgetScope(res, 'any-budget-id')).toBe(true);
      expect(res.statusCode).toBeNull();
    });

    it('allows access when budget_ids is undefined', () => {
      const res = createMockRes({
        auth_method: 'api_token',
        user_id: 'user1',
        budget_ids: undefined,
      });

      expect(enforceBudgetScope(res, 'any-budget-id')).toBe(true);
      expect(res.statusCode).toBeNull();
    });
  });

  describe('API token with scopes', () => {
    it('allows access to budget in scopes', () => {
      const res = createMockRes({
        auth_method: 'api_token',
        user_id: 'user1',
        budget_ids: ['budget-1', 'budget-2'],
      });

      expect(enforceBudgetScope(res, 'budget-1')).toBe(true);
      expect(res.statusCode).toBeNull();
    });

    it('blocks access to budget not in scopes', () => {
      const res = createMockRes({
        auth_method: 'api_token',
        user_id: 'user1',
        budget_ids: ['budget-1', 'budget-2'],
      });

      expect(enforceBudgetScope(res, 'budget-3')).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body.reason).toBe('token-scope-error');
    });

    it('blocks a scoped token when no file id is provided', () => {
      const res = createMockRes({
        auth_method: 'api_token',
        user_id: 'user1',
        budget_ids: ['budget-1'],
      });

      expect(enforceBudgetScope(res, null)).toBe(false);
      expect(res.statusCode).toBe(403);
      expect(res.body.reason).toBe('token-scope-error');
    });

    it('blocks a scoped token when file id is empty string', () => {
      const res = createMockRes({
        auth_method: 'api_token',
        user_id: 'user1',
        budget_ids: ['budget-1'],
      });

      expect(enforceBudgetScope(res, '')).toBe(false);
      expect(res.statusCode).toBe(403);
    });
  });
});

describe('rejectApiTokenMiddleware', () => {
  it('rejects API token auth with 403', () => {
    const req = createMockReq();
    const res = createMockRes({ auth_method: 'api_token', user_id: 'user1' });
    const next = vi.fn();

    rejectApiTokenMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body.reason).toBe('forbidden-auth-method');
  });

  it('passes through password auth', () => {
    const req = createMockReq();
    const res = createMockRes({ auth_method: 'password', user_id: 'user1' });
    const next = vi.fn();

    rejectApiTokenMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('passes through when auth_method is undefined', () => {
    const req = createMockReq();
    const res = createMockRes({ user_id: 'user1' });
    const next = vi.fn();

    rejectApiTokenMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });
});
