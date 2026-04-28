import { validateBudgetScopeMiddleware } from './middlewares';

// Mock request/response/next helpers
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

describe('validateBudgetScopeMiddleware', () => {
  describe('non-API token auth', () => {
    it('should pass through for session auth', () => {
      const req = createMockReq();
      const res = createMockRes({ auth_method: 'password', user_id: 'user1' });
      const next = vi.fn();

      validateBudgetScopeMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBeNull();
    });

    it('should pass through when auth_method is undefined', () => {
      const req = createMockReq();
      const res = createMockRes({ user_id: 'user1' });
      const next = vi.fn();

      validateBudgetScopeMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBeNull();
    });
  });

  describe('API token with no scopes (empty array)', () => {
    it('should allow access to any budget', () => {
      const req = createMockReq({
        headers: { 'x-actual-file-id': 'any-budget-id' },
      });
      const res = createMockRes({
        auth_method: 'api_token',
        user_id: 'user1',
        budget_ids: [],
      });
      const next = vi.fn();

      validateBudgetScopeMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBeNull();
    });

    it('should allow access when budget_ids is undefined', () => {
      const req = createMockReq({
        headers: { 'x-actual-file-id': 'any-budget-id' },
      });
      const res = createMockRes({
        auth_method: 'api_token',
        user_id: 'user1',
        budget_ids: undefined,
      });
      const next = vi.fn();

      validateBudgetScopeMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBeNull();
    });
  });

  describe('API token with scopes', () => {
    it('should allow access to budget in scopes', () => {
      const req = createMockReq({
        headers: { 'x-actual-file-id': 'budget-1' },
      });
      const res = createMockRes({
        auth_method: 'api_token',
        user_id: 'user1',
        budget_ids: ['budget-1', 'budget-2'],
      });
      const next = vi.fn();

      validateBudgetScopeMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBeNull();
    });

    it('should block access to budget not in scopes', () => {
      const req = createMockReq({
        headers: { 'x-actual-file-id': 'budget-3' },
      });
      const res = createMockRes({
        auth_method: 'api_token',
        user_id: 'user1',
        budget_ids: ['budget-1', 'budget-2'],
      });
      const next = vi.fn();

      validateBudgetScopeMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body.reason).toBe('token-scope-error');
    });

    it('should allow access when no file ID in request', () => {
      const req = createMockReq();
      const res = createMockRes({
        auth_method: 'api_token',
        user_id: 'user1',
        budget_ids: ['budget-1'],
      });
      const next = vi.fn();

      validateBudgetScopeMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBeNull();
    });
  });

  describe('file ID from different sources', () => {
    const testCases = [
      {
        name: 'x-actual-file-id header',
        reqOverride: { headers: { 'x-actual-file-id': 'budget-1' } },
      },
      { name: 'body.fileId', reqOverride: { body: { fileId: 'budget-1' } } },
      { name: 'query.fileId', reqOverride: { query: { fileId: 'budget-1' } } },
      {
        name: 'params.fileId',
        reqOverride: { params: { fileId: 'budget-1' } },
      },
    ];

    testCases.forEach(({ name, reqOverride }) => {
      it(`should extract file ID from ${name} and allow if in scopes`, () => {
        const req = createMockReq(reqOverride);
        const res = createMockRes({
          auth_method: 'api_token',
          user_id: 'user1',
          budget_ids: ['budget-1'],
        });
        const next = vi.fn();

        validateBudgetScopeMiddleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.statusCode).toBeNull();
      });

      it(`should extract file ID from ${name} and block if not in scopes`, () => {
        const req = createMockReq(reqOverride);
        const res = createMockRes({
          auth_method: 'api_token',
          user_id: 'user1',
          budget_ids: ['budget-2'],
        });
        const next = vi.fn();

        validateBudgetScopeMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
      });
    });

    it('should prioritize header over body/query/params', () => {
      const req = createMockReq({
        headers: { 'x-actual-file-id': 'budget-header' },
        body: { fileId: 'budget-body' },
        query: { fileId: 'budget-query' },
        params: { fileId: 'budget-params' },
      });
      const res = createMockRes({
        auth_method: 'api_token',
        user_id: 'user1',
        budget_ids: ['budget-header'],
      });
      const next = vi.fn();

      validateBudgetScopeMiddleware(req, res, next);

      // Should allow because header value is in scopes
      expect(next).toHaveBeenCalled();
    });
  });
});
