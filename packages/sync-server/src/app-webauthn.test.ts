import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAccountDb } from './account-db';
import { bootstrapPassword } from './accounts/password';
import * as webauthnAccount from './accounts/webauthn';
import { handlers as app, webauthnRateLimiter } from './app-webauthn';

vi.mock('./accounts/webauthn', async importOriginal => {
  const actual = await importOriginal<typeof webauthnAccount>();
  return {
    ...actual,
    getRegistrationOptions: vi.fn(),
    verifyRegistration: vi.fn(),
    getAuthenticationOptions: vi.fn(),
    verifyAuthentication: vi.fn(),
  };
});

beforeEach(() => {
  webauthnRateLimiter.resetKey('127.0.0.1');
  vi.clearAllMocks();
});

afterEach(() => {
  getAccountDb().mutate('DELETE FROM auth');
});

describe('rate limiting', () => {
  it('returns 429 after exceeding the rate limit on /authentication-options', async () => {
    vi.mocked(webauthnAccount.getAuthenticationOptions).mockResolvedValue({
      error: 'webauthn-not-configured',
    });

    for (let i = 0; i < 5; i++) {
      await request(app).post('/authentication-options').send({});
    }

    const res = await request(app).post('/authentication-options').send({});

    expect(res.statusCode).toEqual(429);
    expect(res.body).toEqual({ status: 'error', reason: 'too-many-requests' });
  });
});

describe('POST /registration-options', () => {
  it('rejects once the server has already been bootstrapped', async () => {
    await bootstrapPassword('bootstrap-password');

    const res = await request(app).post('/registration-options').send({});

    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({
      status: 'error',
      reason: 'already-bootstrapped',
    });
    expect(webauthnAccount.getRegistrationOptions).not.toHaveBeenCalled();
  });

  it('returns options before the server is bootstrapped', async () => {
    vi.mocked(webauthnAccount.getRegistrationOptions).mockResolvedValue({
      options: { challenge: 'abc' } as never,
    });

    const res = await request(app).post('/registration-options').send({});

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ status: 'ok', data: { challenge: 'abc' } });
  });

  it('forwards errors from the underlying options generator', async () => {
    vi.mocked(webauthnAccount.getRegistrationOptions).mockResolvedValue({
      error: 'some-error',
    });

    const res = await request(app).post('/registration-options').send({});

    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({ status: 'error', reason: 'some-error' });
  });
});

describe('POST /registration-verify', () => {
  it('rejects once the server has already been bootstrapped', async () => {
    await bootstrapPassword('bootstrap-password');

    const res = await request(app)
      .post('/registration-verify')
      .send({ response: {} });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({
      status: 'error',
      reason: 'already-bootstrapped',
    });
    expect(webauthnAccount.verifyRegistration).not.toHaveBeenCalled();
  });

  it('verifies the response and reports success before the server is bootstrapped', async () => {
    vi.mocked(webauthnAccount.verifyRegistration).mockResolvedValue({});

    const res = await request(app)
      .post('/registration-verify')
      .send({ response: { id: 'cred' } });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ status: 'ok', data: {} });
    expect(webauthnAccount.verifyRegistration).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'cred' },
    );
  });
});

describe('POST /authentication-options', () => {
  it('is reachable regardless of bootstrap state', async () => {
    await bootstrapPassword('bootstrap-password');
    vi.mocked(webauthnAccount.getAuthenticationOptions).mockResolvedValue({
      options: { challenge: 'auth-challenge' } as never,
    });

    const res = await request(app).post('/authentication-options').send({});

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({
      status: 'ok',
      data: { challenge: 'auth-challenge' },
    });
  });

  it('forwards errors, e.g. when no passkey has been registered yet', async () => {
    vi.mocked(webauthnAccount.getAuthenticationOptions).mockResolvedValue({
      error: 'webauthn-not-configured',
    });

    const res = await request(app).post('/authentication-options').send({});

    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({
      status: 'error',
      reason: 'webauthn-not-configured',
    });
  });
});

describe('POST /authentication-verify', () => {
  it('returns a token on success', async () => {
    vi.mocked(webauthnAccount.verifyAuthentication).mockResolvedValue({
      token: 'session-token',
    });

    const res = await request(app)
      .post('/authentication-verify')
      .send({ response: { id: 'cred' } });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({
      status: 'ok',
      data: { token: 'session-token' },
    });
  });

  it('returns an error when verification fails', async () => {
    vi.mocked(webauthnAccount.verifyAuthentication).mockResolvedValue({
      error: 'verification-failed',
    });

    const res = await request(app)
      .post('/authentication-verify')
      .send({ response: { id: 'cred' } });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toEqual({
      status: 'error',
      reason: 'verification-failed',
    });
  });
});
