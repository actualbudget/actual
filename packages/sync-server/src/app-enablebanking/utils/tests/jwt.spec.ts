import { sign } from 'jws';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getJWT } from '#app-enablebanking/utils/jwt';

// Mock jws to avoid needing real RSA keys
vi.mock('jws', () => ({
  sign: vi.fn(({ header, payload }) => {
    return `${JSON.stringify(header)}.${JSON.stringify(payload)}.mock-signature`;
  }),
}));

describe('getJWT', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('should call jws.sign with correct header', () => {
    getJWT('my-app-id', 'my-secret-key');

    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({
        header: {
          typ: 'JWT',
          alg: 'RS256',
          kid: 'my-app-id',
        },
      }),
    );
  });

  it('should include correct payload fields', () => {
    getJWT('my-app-id', 'my-secret-key');

    const callArgs = vi.mocked(sign).mock.calls[0][0];
    const rawPayload = callArgs.payload;
    const payload: { iss: string; aud: string; iat: number; exp: number } =
      typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;

    expect(payload.iss).toBe('enablebanking.com');
    expect(payload.aud).toBe('api.enablebanking.com');
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
    expect(payload.exp - payload.iat).toBe(3600);
  });

  it('should use custom expiry', () => {
    getJWT('my-app-id', 'my-secret-key', 7200);

    const callArgs = vi.mocked(sign).mock.calls[0][0];
    const rawPayload = callArgs.payload;
    const payload: { iat: number; exp: number } =
      typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;

    expect(payload.exp - payload.iat).toBe(7200);
  });

  it('should pass the secret key to jws.sign', () => {
    getJWT('my-app-id', 'my-secret-key');

    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({
        secret: 'my-secret-key',
      }),
    );
  });

  it('should return a string', () => {
    const result = getJWT('my-app-id', 'my-secret-key');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
