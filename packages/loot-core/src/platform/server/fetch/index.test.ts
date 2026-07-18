import { fetch } from '#platform/server/fetch';

describe('electron fetch', () => {
  const globalFetch = vi.fn();

  beforeEach(() => {
    globalFetch.mockReset();
    globalFetch.mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', globalFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the target server origin as the Origin header', async () => {
    await fetch('https://sync.example.com/gocardless/create-web-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(globalFetch).toHaveBeenCalledWith(
      'https://sync.example.com/gocardless/create-web-token',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          origin: 'https://sync.example.com',
        },
      }),
    );
  });

  it('derives the origin from Request inputs', async () => {
    await fetch(new Request('http://localhost:5006/sync/sync'));

    expect(globalFetch.mock.calls[0][1]?.headers).toMatchObject({
      origin: 'http://localhost:5006',
    });
  });

  it('omits the Origin header for non-http(s) URLs', async () => {
    await fetch('file:///tmp/somewhere');

    expect(globalFetch.mock.calls[0][1]?.headers).not.toHaveProperty('origin');
  });
});
