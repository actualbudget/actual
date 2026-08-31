import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GoCardlessRequisitionId } from './gocardless-node.types';
import { mockInstitution } from './services/tests/fixtures';

vi.mock('#util/middlewares', () => ({
  requestLoggerMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
  validateSessionMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
}));

vi.mock('./services/gocardless-service', () => ({
  goCardlessService: {
    createRequisition: vi.fn(),
    setToken: vi.fn(),
    getInstitutions: vi.fn(),
  },
}));

const { goCardlessService } = await import('./services/gocardless-service');
const { handlers } = await import('./app-gocardless');
const { GoCardlessApiError } = await import('./services/gocardless-api');
const { AccessDeniedError, RateLimitError, InvalidInputDataError } =
  await import('./errors');

const app = express();
app.use('/', handlers);

describe('/create-web-token', () => {
  const createRequisition = vi.mocked(goCardlessService.createRequisition);

  beforeEach(() => {
    createRequisition.mockReset();
    createRequisition.mockResolvedValue({
      link: 'https://gocardless.example/start',
      requisitionId: 'req-1' as GoCardlessRequisitionId,
    });
  });

  it('passes an http(s) origin through as the redirect host', async () => {
    const res = await request(app)
      .post('/create-web-token')
      .set('Origin', 'https://budget.example.com')
      .send({ institutionId: 'SANDBOXFINANCE_SFIN0000' });

    expect(res.body).toEqual({
      status: 'ok',
      data: {
        link: 'https://gocardless.example/start',
        requisitionId: 'req-1',
      },
    });
    expect(createRequisition).toHaveBeenCalledWith({
      institutionId: 'SANDBOXFINANCE_SFIN0000',
      host: 'https://budget.example.com',
    });
  });

  it('redirects the electron app origin to the server itself', async () => {
    const res = await request(app)
      .post('/create-web-token')
      .set('Origin', 'app://actual')
      .send({ institutionId: 'SANDBOXFINANCE_SFIN0000' });

    expect(res.body.status).toBe('ok');
    expect(res.body.data.link).toBe('https://gocardless.example/start');
    expect(createRequisition).toHaveBeenCalledWith({
      institutionId: 'SANDBOXFINANCE_SFIN0000',
      host: expect.stringMatching(/^http:\/\/127\.0\.0\.1:\d+$/),
    });
  });

  it('rejects a missing Origin header', async () => {
    const res = await request(app)
      .post('/create-web-token')
      .send({ institutionId: 'SANDBOXFINANCE_SFIN0000' });

    expect(res.body.data).toEqual({
      error_code: 'INTERNAL_ERROR',
      error_type: 'Invalid Origin header',
    });
    expect(createRequisition).not.toHaveBeenCalled();
  });

  it('rejects non-http(s) origins', async () => {
    const res = await request(app)
      .post('/create-web-token')
      .set('Origin', 'file://actual')
      .send({ institutionId: 'SANDBOXFINANCE_SFIN0000' });

    expect(res.body.data).toEqual({
      error_code: 'INTERNAL_ERROR',
      error_type: 'Invalid Origin header',
    });
    expect(createRequisition).not.toHaveBeenCalled();
  });

  it('rejects a missing institutionId', async () => {
    const res = await request(app)
      .post('/create-web-token')
      .set('Origin', 'https://budget.example.com')
      .send({});

    expect(res.body.data).toEqual({
      error_code: 'INTERNAL_ERROR',
      error_type: 'Invalid GoCardless identifier: undefined',
    });
    expect(createRequisition).not.toHaveBeenCalled();
  });
});

describe('/get-banks', () => {
  const setToken = vi.mocked(goCardlessService.setToken);
  const getInstitutions = vi.mocked(goCardlessService.getInstitutions);

  function apiError(status: number, data?: unknown) {
    const error = new GoCardlessApiError(
      `GoCardless API error: ${status}`,
      status,
      {},
    );
    error.response.data = data;
    return error;
  }

  beforeEach(() => {
    setToken.mockReset();
    setToken.mockResolvedValue(undefined);
    getInstitutions.mockReset();
  });

  it('surfaces the reason GoCardless denied the request', async () => {
    getInstitutions.mockRejectedValue(
      new AccessDeniedError(
        apiError(403, {
          summary: 'IP address access denied',
          detail:
            "Your IP 203.0.113.7 isn't whitelisted to perform this action",
          status_code: 403,
        }),
      ),
    );

    const res = await request(app).post('/get-banks').send({ country: 'GB' });

    expect(res.body.data).toEqual({
      error_code: 'INTERNAL_ERROR',
      error_type: 'IP address access denied',
      error_details: {
        status: 403,
        summary: 'IP address access denied',
        detail: "Your IP 203.0.113.7 isn't whitelisted to perform this action",
      },
    });
  });

  it('surfaces the reason GoCardless rate limited the request', async () => {
    getInstitutions.mockRejectedValue(
      new RateLimitError(
        apiError(429, {
          summary: 'Rate limit exceeded',
          detail: 'The rate limit for this resource is 4/day',
        }),
      ),
    );

    const res = await request(app).post('/get-banks').send({ country: 'GB' });

    expect(res.body.data.error_details).toEqual({
      status: 429,
      summary: 'Rate limit exceeded',
      detail: 'The rate limit for this resource is 4/day',
    });
  });

  it('surfaces the field GoCardless rejected on a 400', async () => {
    getInstitutions.mockRejectedValue(
      new InvalidInputDataError(
        apiError(400, {
          country: {
            summary: 'Invalid country choice.',
            detail: '"ZZ" is not a valid choice.',
          },
        }),
      ),
    );

    const res = await request(app).post('/get-banks').send({ country: 'ZZ' });

    expect(res.body.data.error_details).toEqual({
      status: 400,
      summary: 'Invalid country choice.',
      detail: '"ZZ" is not a valid choice.',
    });
  });

  it('omits error_details for failures that did not come from GoCardless', async () => {
    getInstitutions.mockRejectedValue(new Error('socket hang up'));

    const res = await request(app).post('/get-banks').send({ country: 'GB' });

    expect(res.body.data).toEqual({
      error_code: 'INTERNAL_ERROR',
      error_type: 'socket hang up',
    });
  });

  it('still returns the bank list on success', async () => {
    getInstitutions.mockResolvedValue([mockInstitution]);

    const res = await request(app).post('/get-banks').send({ country: 'GB' });

    expect(res.body.status).toBe('ok');
    expect(res.body.data).toEqual([mockInstitution]);
  });
});

describe('/link', () => {
  it('serves the completion page', async () => {
    const res = await request(app).get('/link');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('window.close()');
  });
});
