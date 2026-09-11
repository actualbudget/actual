const {
  mockedFetch,
  mockedGetItem,
  mockedRemoveItem,
  mockedGetPrefs,
  mockedSavePrefs,
} = vi.hoisted(() => ({
  mockedFetch: vi.fn(),
  mockedGetItem: vi.fn(),
  mockedRemoveItem: vi.fn(),
  mockedGetPrefs: vi.fn(),
  mockedSavePrefs: vi.fn(),
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

vi.mock('#platform/server/fs', () => ({
  getBudgetDir: () => '/budget',
  join: (...parts: string[]) => parts.join('/'),
  readFile: async (path: string) =>
    path.endsWith('metadata.json')
      ? JSON.stringify({ id: 'budget-id' })
      : Buffer.from('db'),
}));

vi.mock('#platform/server/sqlite', () => ({
  openDatabase: async () => ({}),
  execQuery: vi.fn(),
  exportDatabase: async () => Buffer.from('exported-db'),
  closeDatabase: vi.fn(),
}));

vi.mock('#platform/server/memory', () => ({
  getAvailableMemory: () => null,
}));

vi.mock('./mutators', () => ({
  runMutator: (fn: () => unknown) => fn(),
}));

vi.mock('./prefs', () => ({
  getPrefs: mockedGetPrefs,
  savePrefs: mockedSavePrefs,
}));

vi.mock('./util/zip', () => ({
  safeZip: () => new Uint8Array([1, 2, 3]),
  safeUnzip: () => ({}),
  exceedsSafeUnzipLimits: () => false,
  UnsafeZipError: class UnsafeZipError extends Error {},
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

describe('upload', () => {
  beforeEach(() => {
    vi.resetModules();
    mockedFetch.mockReset();
    mockedGetItem.mockReset().mockResolvedValue('token');
    mockedRemoveItem.mockReset();
    mockedSavePrefs.mockReset();
    mockedGetPrefs.mockReset().mockReturnValue({
      id: 'budget-id',
      budgetName: 'My Budget',
      cloudFileId: 'cloud-file-id',
      groupId: 'group-id',
      encryptKeyId: null,
    });
  });

  // Setting Content-Length by hand is not just redundant, it is rejected: fetch appends its own
  // content-length derived from the body, the Headers list combines the two into "N, N", and undici
  // throws InvalidArgumentError('invalid content-length header') before the request leaves the
  // process. Same defect #8195 fixed in postBinary; upload() sets the header via fetchJSON instead,
  // so it was missed.
  it('does not set Content-Length manually and lets fetch derive it', async () => {
    mockedFetch.mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok', groupId: 'group-id' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { setServer } = await import('./server-config');
    setServer('https://test.env');
    const { upload } = await import('./cloud-storage');
    await upload();

    expect(mockedFetch).toHaveBeenCalledOnce();
    const options = mockedFetch.mock.calls[0][1];
    expect(options?.headers).not.toHaveProperty('Content-Length');
    expect(options?.headers).toMatchObject({
      'Content-Type': 'application/encrypted-file',
      'X-ACTUAL-TOKEN': 'token',
      'X-ACTUAL-FILE-ID': 'cloud-file-id',
    });
  });
});
