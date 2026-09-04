import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

// Every other test in this directory hands the route a pre-built error, which
// only proves the route's own switch. This one drives the real GoCardless
// service through the real route with nothing between them, so a mismatch
// between what the service throws and what the route recognises fails here.

vi.mock('#util/middlewares', () => ({
  requestLoggerMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
  validateSessionMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
}));

const { secretsService } = await import('#services/secrets-service');
const { client } = await import('./services/gocardless-service');
const { GoCardlessApiError } = await import('./services/gocardless-api');
const { handlers } = await import('./app-gocardless');

const app = express();
app.use('/', handlers);

const syncRequest = () =>
  request(app).post('/transactions').send({
    requisitionId: 'req-1',
    accountId: 'acc-1',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
  });

describe('/transactions with the real GoCardless service', () => {
  it('reports a server with no secrets as GOCARDLESS_NOT_CONFIGURED', async () => {
    // exactly the state a budget is restored into: the accounts are linked in
    // the budget file, but the server's secrets never came with it
    vi.spyOn(secretsService, 'get').mockReturnValue(null);

    const res = await syncRequest();

    expect(res.body.data).toMatchObject({
      error_type: 'CONFIG_ERROR',
      error_code: 'GOCARDLESS_NOT_CONFIGURED',
      status: 'rejected',
    });
  });

  it('reports secrets GoCardless rejects as GOCARDLESS_INVALID_CREDENTIALS', async () => {
    // and the state the user lands in if they mistype the replacement secrets
    vi.spyOn(secretsService, 'get').mockReturnValue('wrong-secret');
    vi.spyOn(client, 'generateToken').mockRejectedValue(
      new GoCardlessApiError('error: 401', 401, {}),
    );

    const res = await syncRequest();

    expect(res.body.data).toMatchObject({
      error_type: 'CONFIG_ERROR',
      error_code: 'GOCARDLESS_INVALID_CREDENTIALS',
      status: 'rejected',
    });
  });
});
