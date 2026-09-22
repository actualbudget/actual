import {
  GoCardlessApi,
  GoCardlessApiError,
} from '#app-gocardless/services/gocardless-api';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    headers: new Headers(),
    json: async () => body,
  } as Response;
}

function urlOf(call: unknown[]): string {
  const target = call[0] as URL | string;
  return target instanceof URL ? target.pathname : String(target);
}

describe('GoCardlessApi token refresh', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function newApi() {
    return new GoCardlessApi({ secretId: 'id', secretKey: 'key' });
  }

  function endpointResponse() {
    return jsonResponse({ account: { id: 'acc-1' } });
  }

  test('fresh token with realistic TTL triggers no refresh', async () => {
    const api = newApi();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access: 'access-1',
        refresh: 'refresh-1',
        access_expires: 86400,
        refresh_expires: 2592000,
      }),
    );
    await api.generateToken();

    vi.setSystemTime(Date.now() + 5000);

    fetchMock.mockResolvedValueOnce(endpointResponse());
    await api.getAccountDetails('acc-1' as never);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(urlOf(fetchMock.mock.calls[1])).toContain('/accounts/');
  });

  test('token expiring within the buffer triggers a proactive refresh', async () => {
    const api = newApi();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access: 'access-1',
        refresh: 'refresh-1',
        access_expires: 90,
        refresh_expires: 2592000,
      }),
    );
    await api.generateToken();

    vi.setSystemTime(Date.now() + 35000);

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ access: 'access-2', access_expires: 86400 }),
    );
    fetchMock.mockResolvedValueOnce(endpointResponse());

    await api.getAccountDetails('acc-1' as never);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(urlOf(fetchMock.mock.calls[1])).toContain('/token/refresh/');
    expect(urlOf(fetchMock.mock.calls[2])).toContain('/accounts/');
  });

  test('expired token refreshes via exchangeToken and preserves refresh token across a missing refresh field', async () => {
    const api = newApi();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access: 'access-1',
        refresh: 'refresh-1',
        access_expires: 60,
        refresh_expires: 2592000,
      }),
    );
    await api.generateToken();

    vi.setSystemTime(Date.now() + 120000);

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ access: 'access-2', access_expires: 60 }),
    );
    fetchMock.mockResolvedValueOnce(endpointResponse());

    await api.getAccountDetails('acc-1' as never);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(urlOf(fetchMock.mock.calls[1])).toContain('/token/refresh/');
    expect(urlOf(fetchMock.mock.calls[2])).toContain('/accounts/');

    // Force a second expiry and confirm the refresh token survived the
    // missing `refresh` field in the previous refresh response.
    vi.setSystemTime(Date.now() + 120000);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ access: 'access-3', access_expires: 86400 }),
    );
    fetchMock.mockResolvedValueOnce(endpointResponse());

    await api.getAccountDetails('acc-1' as never);

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(urlOf(fetchMock.mock.calls[3])).toContain('/token/refresh/');
    expect(urlOf(fetchMock.mock.calls[4])).toContain('/accounts/');
  });

  test('concurrent calls during expiry share a single refresh', async () => {
    const api = newApi();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access: 'access-1',
        refresh: 'refresh-1',
        access_expires: 60,
        refresh_expires: 2592000,
      }),
    );
    await api.generateToken();

    vi.setSystemTime(Date.now() + 120000);

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ access: 'access-2', access_expires: 86400 }),
    );
    fetchMock.mockResolvedValue(endpointResponse());

    await Promise.all([
      api.getAccountDetails('acc-1' as never),
      api.getAccountDetails('acc-1' as never),
      api.getAccountDetails('acc-1' as never),
    ]);

    const refreshCalls = fetchMock.mock.calls.filter(call =>
      urlOf(call).includes('/token/refresh/'),
    );
    expect(refreshCalls).toHaveLength(1);
    // 1 initial generateToken() + 1 shared refresh + 3 endpoint calls.
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  test('failed exchangeToken falls back to generateToken', async () => {
    const api = newApi();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access: 'access-1',
        refresh: 'refresh-1',
        access_expires: 60,
        refresh_expires: 2592000,
      }),
    );
    await api.generateToken();

    vi.setSystemTime(Date.now() + 120000);

    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 401));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access: 'access-2',
        refresh: 'refresh-2',
        access_expires: 86400,
        refresh_expires: 2592000,
      }),
    );
    fetchMock.mockResolvedValueOnce(endpointResponse());

    await api.getAccountDetails('acc-1' as never);

    // 1 initial generateToken() + failed refresh + fallback generateToken() + endpoint.
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(urlOf(fetchMock.mock.calls[1])).toContain('/token/refresh/');
    expect(urlOf(fetchMock.mock.calls[2])).toContain('/token/new/');
    expect(urlOf(fetchMock.mock.calls[3])).toContain('/accounts/');
  });

  test('both refresh paths failing propagates the error and never calls the endpoint', async () => {
    const api = newApi();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access: 'access-1',
        refresh: 'refresh-1',
        access_expires: 60,
        refresh_expires: 2592000,
      }),
    );
    await api.generateToken();

    vi.setSystemTime(Date.now() + 120000);

    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 401));
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 401));

    const err = await api.getAccountDetails('acc-1' as never).catch(e => e);

    expect(err).toBeInstanceOf(GoCardlessApiError);
    expect(err.response.status).toBe(401);
    // 1 initial generateToken() + failed refresh + failed fallback generateToken();
    // the endpoint itself is never reached.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(
      fetchMock.mock.calls.some(call => urlOf(call).includes('/accounts/')),
    ).toBe(false);
  });

  test('brand-new instance with no refresh token uses generateToken directly', async () => {
    const api = newApi();

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access: 'access-1',
        refresh: 'refresh-1',
        access_expires: 86400,
        refresh_expires: 2592000,
      }),
    );
    fetchMock.mockResolvedValueOnce(endpointResponse());

    await api.getAccountDetails('acc-1' as never);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(urlOf(fetchMock.mock.calls[0])).toContain('/token/new/');
    expect(urlOf(fetchMock.mock.calls[1])).toContain('/accounts/');
  });

  test('calling generateToken directly does not recurse into a refresh', async () => {
    const api = newApi();
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access: 'access-1',
        refresh: 'refresh-1',
        access_expires: 60,
        refresh_expires: 2592000,
      }),
    );
    await api.generateToken();

    vi.setSystemTime(Date.now() + 120000);

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        access: 'access-2',
        refresh: 'refresh-2',
        access_expires: 86400,
        refresh_expires: 2592000,
      }),
    );

    await api.generateToken();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
