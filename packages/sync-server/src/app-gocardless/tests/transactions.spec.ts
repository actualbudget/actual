import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock external dependencies before importing the app (mirrors the
// app-enablebanking transactions test).

// Return falsy secrets so the *real* isConfigured() resolves to `false` — this
// reproduces the "GoCardless credentials missing after a backup restore" state
// from issue #4742 without faking our own code.
vi.mock('../../services/secrets-service', () => ({
  SecretName: {
    gocardless_secretId: 'gocardless_secretId',
    gocardless_secretKey: 'gocardless_secretKey',
  },
  secretsService: {
    get: vi.fn(() => null),
    set: vi.fn(),
  },
}));

// Bypass the session guard so requests actually reach the route handler.
vi.mock('../../util/middlewares', () => ({
  requestLoggerMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
  validateSessionMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
}));

const { handlers } = await import('../app-gocardless');

const app = express();
app.use(express.json());
app.use('/', handlers);

describe('POST /transactions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns GOCARDLESS_NOT_CONFIGURED when credentials are missing', async () => {
    const res = await request(app)
      .post('/transactions')
      // IDs must be sanitizeId-safe (alphanumeric/_/-) so the request reaches
      // the configuration guard instead of failing validation first.
      .send({ requisitionId: 'req-1', accountId: 'acc-1' });

    // The HTTP envelope is always "ok"; the real error lives inside `data`.
    expect(res.body.status).toBe('ok');
    expect(res.body.data.error_type).toBe('GOCARDLESS_NOT_CONFIGURED');
    expect(res.body.data.error_code).toBe('GOCARDLESS_NOT_CONFIGURED');
  });
});
