import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handlers as app } from '../app-enablebanking.js';
import { enableBankingService } from '../services/enablebanking-services.js';

vi.mock('../../util/middlewares.js', () => ({
  requestLoggerMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
  validateSessionMiddleware: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
}));

describe('app-enablebanking /complete_auth', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not mark session failed when authorization succeeds', async () => {
    const authorizeSessionSpy = vi
      .spyOn(enableBankingService, 'authorizeSession')
      .mockResolvedValue('session-id');
    const failSessionSpy = vi.spyOn(enableBankingService, 'failSession');

    const response = await request(app)
      .post('/complete_auth')
      .send({ state: 'state-success', code: 'code-success' });

    expect(response.status).toBe(200);
    expect(authorizeSessionSpy).toHaveBeenCalledWith(
      'state-success',
      'code-success',
    );
    expect(failSessionSpy).not.toHaveBeenCalled();
  });

  it('marks session failed when authorization throws', async () => {
    vi.spyOn(enableBankingService, 'authorizeSession').mockRejectedValue(
      new Error('authorization failed'),
    );
    const failSessionSpy = vi.spyOn(enableBankingService, 'failSession');

    const response = await request(app)
      .post('/complete_auth')
      .send({ state: 'state-fail', code: 'code-fail' });

    expect(response.status).toBe(200);
    expect(failSessionSpy).toHaveBeenCalledWith(
      'state-fail',
      'authorization failed',
    );
    expect(response.body.data.error.error_code).toBe('INTERNAL_ERROR');
  });
});
