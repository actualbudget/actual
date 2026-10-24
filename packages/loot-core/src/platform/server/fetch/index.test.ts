import { fetch, fetchQuiet } from '#platform/server/fetch';
import { logger } from '#platform/server/log';

describe('electron fetch', () => {
  const globalFetch = vi.fn();

  beforeEach(() => {
    globalFetch.mockReset();
    globalFetch.mockResolvedValue(new Response('ok'));
    vi.stubGlobal('fetch', globalFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps origin handling but does not log an untrusted rejection in quiet mode', async () => {
    const error = new Error('https://rates.invalid/?key=SECRET123');
    globalFetch.mockRejectedValue(error);
    const log = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    await expect(
      fetchQuiet('https://sync.example.com/exchange-rates/lookup'),
    ).rejects.toBe(error);
    expect(globalFetch).toHaveBeenCalledWith(
      'https://sync.example.com/exchange-rates/lookup',
      expect.objectContaining({ headers: { origin: 'app://actual' } }),
    );
    expect(log).not.toHaveBeenCalled();
  });

  it('retains the existing fetch error logging for bank callers', async () => {
    const error = new Error('bank request failed');
    globalFetch.mockRejectedValue(error);
    const log = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    await expect(
      fetch('https://sync.example.com/gocardless/status'),
    ).rejects.toBe(error);
    expect(log).toHaveBeenCalledWith(error);
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
