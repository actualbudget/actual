const { mockedFetch, mockedGetItem, mockedRemoveItem } = vi.hoisted(() => ({
  mockedFetch: vi.fn(),
  mockedGetItem: vi.fn(),
  mockedRemoveItem: vi.fn(),
}));

vi.unmock('#server/post');
vi.unmock('./post');

vi.mock('#platform/server/fetch', () => ({
  fetch: mockedFetch,
}));

vi.mock('#platform/server/asyncStorage', () => ({
  getItem: mockedGetItem,
  removeItem: mockedRemoveItem,
}));

describe('listRemoteFiles', () => {
  beforeEach(() => {
    vi.resetModules();
    mockedFetch.mockReset();
    mockedGetItem.mockReset().mockResolvedValue('stale-token');
    mockedRemoveItem.mockReset();
  });

  it('removes a token whose server session no longer exists', async () => {
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

    const { setServer } = await import('./server-config');
    setServer('https://test.env');
    const { listRemoteFiles } = await import('./cloud-storage');
    await listRemoteFiles();

    expect(mockedGetItem).toHaveBeenCalledWith('user-token');
    expect(mockedFetch).toHaveBeenCalledOnce();
    expect(mockedRemoveItem).toHaveBeenCalledWith('user-token');
  });

  it('removes an expired token reported by an older server', async () => {
    mockedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'error',
          data: { reason: 'token-expired' },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const { setServer } = await import('./server-config');
    setServer('https://test.env');
    const { listRemoteFiles } = await import('./cloud-storage');
    await listRemoteFiles();

    expect(mockedRemoveItem).toHaveBeenCalledWith('user-token');
  });
});
