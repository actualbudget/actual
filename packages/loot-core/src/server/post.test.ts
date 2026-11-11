import { fetch } from '#platform/server/fetch';

import { PostError } from './errors';
import { del, patch, post, postBinary, redactSensitive } from './post';

vi.unmock('#server/post');
vi.mock('#platform/server/fetch', () => ({
  fetch: vi.fn(),
}));

const mockedFetch = vi.mocked(fetch);

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    return null;
  } catch (err) {
    return err;
  }
}

describe('postBinary', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('does not set Content-Length manually and lets fetch derive it', async () => {
    mockedFetch.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
    );

    await postBinary('https://test.env/sync/sync', new Uint8Array([9, 9, 9]), {
      'X-ACTUAL-TOKEN': 'token',
    });

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    const options = mockedFetch.mock.calls[0][1];
    expect(options?.headers).not.toHaveProperty('Content-Length');
    expect(options?.headers).toMatchObject({
      'Content-Type': 'application/actual-sync',
      'X-ACTUAL-TOKEN': 'token',
    });
  });

  it('preserves the underlying fetch error as cause on network failure', async () => {
    const underlying = new TypeError('fetch failed');
    mockedFetch.mockRejectedValue(underlying);

    const error = await captureError(
      postBinary('https://test.env/sync/sync', new Uint8Array([1]), {}),
    );

    expect(error).toBeInstanceOf(PostError);
    expect((error as PostError).reason).toBe('network-failure');
    expect((error as PostError).cause).toBe(underlying);
  });

  it('treats a missing server session as an expired token', async () => {
    mockedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'error',
          reason: 'unauthorized',
          details: 'token-not-found',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const error = await captureError(
      postBinary('https://test.env/sync/sync', new Uint8Array([1]), {}),
    );

    expect(error).toBeInstanceOf(PostError);
    expect((error as PostError).reason).toBe('token-expired');
  });
});

describe('post', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('preserves the underlying fetch error as cause on network failure', async () => {
    const underlying = new TypeError('fetch failed');
    mockedFetch.mockRejectedValue(underlying);

    const error = await captureError(
      post('https://test.env/sync/sync', { foo: 'bar' }),
    );

    expect(error).toBeInstanceOf(PostError);
    expect((error as PostError).reason).toBe('network-failure');
    expect((error as PostError).cause).toBe(underlying);
  });
});

describe('del', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('preserves the underlying fetch error as cause on network failure', async () => {
    const underlying = new TypeError('fetch failed');
    mockedFetch.mockRejectedValue(underlying);

    const error = await captureError(
      del('https://test.env/sync/sync', { foo: 'bar' }),
    );

    expect(error).toBeInstanceOf(PostError);
    expect((error as PostError).reason).toBe('network-failure');
    expect((error as PostError).cause).toBe(underlying);
  });
});

describe('patch', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('preserves the underlying fetch error as cause on network failure', async () => {
    const underlying = new TypeError('fetch failed');
    mockedFetch.mockRejectedValue(underlying);

    const error = await captureError(
      patch('https://test.env/sync/sync', { foo: 'bar' }),
    );

    expect(error).toBeInstanceOf(PostError);
    expect((error as PostError).reason).toBe('network-failure');
    expect((error as PostError).cause).toBe(underlying);
  });
});

describe('redactSensitive', () => {
  it('replaces values stored under sensitive keys', () => {
    expect(
      redactSensitive({ password: 'hunter2', code: '123456', keep: 'me' }),
    ).toEqual({
      password: '<redacted>',
      code: '<redacted>',
      keep: 'me',
    });
  });

  it('redacts nested values', () => {
    // How the OpenID client secret actually arrives.
    expect(
      redactSensitive({ openId: { issuer: 'https://x', client_secret: 's3' } }),
    ).toEqual({
      openId: { issuer: 'https://x', client_secret: '<redacted>' },
    });
  });

  it('matches keys case-insensitively', () => {
    expect(redactSensitive({ mfaToken: 'abc', Password: 'p' })).toEqual({
      mfaToken: '<redacted>',
      Password: '<redacted>',
    });
  });

  it('walks arrays', () => {
    expect(redactSensitive([{ token: 't' }, { safe: 1 }])).toEqual([
      { token: '<redacted>' },
      { safe: 1 },
    ]);
  });

  it('passes through values that are not objects', () => {
    expect(redactSensitive('plain')).toBe('plain');
    expect(redactSensitive(7)).toBe(7);
    expect(redactSensitive(null)).toBe(null);
    expect(redactSensitive(undefined)).toBe(undefined);
  });

  it('leaves unrelated payloads untouched', () => {
    const payload = { name: 'Groceries', amount: -1234, tags: ['food'] };
    expect(redactSensitive(payload)).toEqual(payload);
  });
});
