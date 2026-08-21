import * as asyncStorage from '#platform/server/asyncStorage';
import { PostError } from '#server/errors';
import { post } from '#server/post';
import { setServer } from '#server/server-config';

import { app } from './app';

vi.mock('#server/post', () => ({ post: vi.fn() }));

beforeEach(() => {
  setServer('https://example.com');
  vi.mocked(post).mockReset();
  vi.mocked(asyncStorage.setItem).mockReset();
});

describe('webauthn-get-registration-options', () => {
  it('fetches options from the server', async () => {
    const options = { challenge: 'reg-challenge' };
    vi.mocked(post).mockResolvedValueOnce(options);

    const result = await app.handlers['webauthn-get-registration-options']();

    expect(post).toHaveBeenCalledWith(
      'https://example.com/webauthn/registration-options',
      {},
    );
    expect(result).toEqual({ options });
  });

  it('translates a PostError into an error result', async () => {
    vi.mocked(post).mockRejectedValueOnce(
      new PostError('already-bootstrapped'),
    );

    const result = await app.handlers['webauthn-get-registration-options']();

    expect(result).toEqual({ error: 'already-bootstrapped' });
  });
});

describe('webauthn-verify-registration', () => {
  it('posts the response and resolves with no error on success', async () => {
    vi.mocked(post).mockResolvedValueOnce({});

    const response = { id: 'cred' };
    const result = await app.handlers['webauthn-verify-registration']({
      response,
    });

    expect(post).toHaveBeenCalledWith(
      'https://example.com/webauthn/registration-verify',
      { response },
    );
    expect(result).toEqual({});
  });

  it('translates a PostError into an error result', async () => {
    vi.mocked(post).mockRejectedValueOnce(new PostError('verification-failed'));

    const result = await app.handlers['webauthn-verify-registration']({
      response: { id: 'cred' },
    });

    expect(result).toEqual({ error: 'verification-failed' });
  });
});

describe('webauthn-get-authentication-options', () => {
  it('fetches options from the server', async () => {
    const options = { challenge: 'auth-challenge' };
    vi.mocked(post).mockResolvedValueOnce(options);

    const result = await app.handlers['webauthn-get-authentication-options']();

    expect(post).toHaveBeenCalledWith(
      'https://example.com/webauthn/authentication-options',
      {},
    );
    expect(result).toEqual({ options });
  });

  it('translates a PostError into an error result', async () => {
    vi.mocked(post).mockRejectedValueOnce(
      new PostError('webauthn-not-configured'),
    );

    const result = await app.handlers['webauthn-get-authentication-options']();

    expect(result).toEqual({ error: 'webauthn-not-configured' });
  });
});

describe('webauthn-verify-authentication', () => {
  it('stores the returned token exactly like signIn does', async () => {
    vi.mocked(post).mockResolvedValueOnce({ token: 'session-token' });

    const response = { id: 'cred' };
    const result = await app.handlers['webauthn-verify-authentication']({
      response,
    });

    expect(post).toHaveBeenCalledWith(
      'https://example.com/webauthn/authentication-verify',
      { response },
    );
    expect(asyncStorage.setItem).toHaveBeenCalledWith(
      'user-token',
      'session-token',
    );
    expect(result).toEqual({});
  });

  it('translates a PostError into an error result without storing a token', async () => {
    vi.mocked(post).mockRejectedValueOnce(new PostError('verification-failed'));

    const result = await app.handlers['webauthn-verify-authentication']({
      response: { id: 'cred' },
    });

    expect(result).toEqual({ error: 'verification-failed' });
    expect(asyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('throws when the server responds without a token', async () => {
    vi.mocked(post).mockResolvedValueOnce({});

    await expect(
      app.handlers['webauthn-verify-authentication']({
        response: { id: 'cred' },
      }),
    ).rejects.toThrow('User token not set');
  });
});
