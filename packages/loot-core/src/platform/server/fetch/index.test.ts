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

  it('sends the app://actual origin', async () => {
    await fetch('https://sync.example.com/gocardless/create-web-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(globalFetch).toHaveBeenCalledWith(
      'https://sync.example.com/gocardless/create-web-token',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          origin: 'app://actual',
        },
      }),
    );
  });
});
