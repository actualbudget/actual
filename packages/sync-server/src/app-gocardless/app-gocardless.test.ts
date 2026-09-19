import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GoCardlessRequisitionId } from './gocardless-node.types';

vi.mock('#util/middlewares', () => ({
  requestLoggerMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
  validateSessionMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
}));

vi.mock('./services/gocardless-service', () => ({
  goCardlessService: {
    createRequisition: vi.fn(),
    isConfigured: vi.fn(() => true),
  },
}));

const { goCardlessService } = await import('./services/gocardless-service');
const { handlers } = await import('./app-gocardless');

const app = express();
app.use(express.json());
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

describe('/link', () => {
  it('serves the completion page', async () => {
    const res = await request(app).get('/link');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('window.close()');
  });
});

describe('when GoCardless credentials are missing (not configured)', () => {
  const isConfigured = vi.mocked(goCardlessService.isConfigured);

  beforeEach(() => {
    isConfigured.mockReturnValue(false);
  });

  afterEach(() => {
    isConfigured.mockReturnValue(true);
  });

  it('reports configured: false from /status', async () => {
    const res = await request(app).post('/status');
    expect(res.body).toEqual({
      status: 'ok',
      data: { configured: false },
    });
  });

  it('returns GOCARDLESS_NOT_CONFIGURED from POST /transactions', async () => {
    const res = await request(app)
      .post('/transactions')
      .send({ requisitionId: 'req-1', accountId: 'acc-1' });

    expect(res.body).toEqual({
      status: 'ok',
      data: {
        error_type: 'GOCARDLESS_NOT_CONFIGURED',
        error_code: 'GOCARDLESS_NOT_CONFIGURED',
        reason: 'GoCardless credentials are missing',
      },
    });
  });
});
