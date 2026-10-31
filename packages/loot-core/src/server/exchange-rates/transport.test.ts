import { logger } from '#platform/server/log';

import { fxRequest } from './transport';

const network = vi.fn<typeof globalThis.fetch>();
const options = () => ({
  server: 'https://sync.example.com/exchange-rates',
  token: 'HEADER_ONLY',
  lifecycle: new AbortController().signal,
});

beforeEach(() => {
  network.mockReset();
  vi.stubGlobal('fetch', network);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('quiet exchange-rate transport', () => {
  it('sends credentials only in the header and returns the success object', async () => {
    network.mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok', data: { providers: [] } })),
    );
    expect(await fxRequest('providers', {}, options())).toEqual({
      ok: true,
      data: { providers: [] },
    });
    expect(network).toHaveBeenCalledWith(
      'https://sync.example.com/exchange-rates/providers',
      expect.objectContaining({
        method: 'POST',
        body: '{}',
        headers: {
          'Content-Type': 'application/json',
          'X-ACTUAL-TOKEN': 'HEADER_ONLY',
          origin: 'app://actual',
        },
      }),
    );
  });

  it.each([
    [
      500,
      '{"status":"error","reason":"SECRET123","description":"SECRET123"}',
      'server-error',
    ],
    [401, '{"status":"error","reason":"SECRET123"}', 'unauthorized'],
    [401, '{"status":"error","reason":"token-expired"}', 'token-expired'],
    [200, 'SECRET123', 'server-error'],
    [200, '{"status":"ok","data":null}', 'server-error'],
    [200, '{"status":"ok","data":[]}', 'server-error'],
  ] as const)('maps HTTP %s to a fixed code', async (status, body, code) => {
    network.mockResolvedValue(new Response(body, { status }));
    const log = vi.spyOn(logger, 'log').mockImplementation(() => undefined);
    expect(await fxRequest('providers', {}, options())).toEqual({
      ok: false,
      code,
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain('SECRET123');
  });

  it.each(['fetch', 'read'] as const)(
    'drops untrusted %s exceptions before any logging',
    async mode => {
      const error = new Error('https://rates.invalid/?key=SECRET123');
      if (mode === 'fetch') {
        network.mockRejectedValue(error);
      } else {
        const response = new Response('');
        vi.spyOn(response, 'text').mockRejectedValue(error);
        network.mockResolvedValue(response);
      }
      const log = vi.spyOn(logger, 'log').mockImplementation(() => undefined);
      const errors = vi
        .spyOn(logger, 'error')
        .mockImplementation(() => undefined);
      expect(await fxRequest('lookup', { base: 'USD' }, options())).toEqual({
        ok: false,
        code: 'network',
      });
      expect(errors).not.toHaveBeenCalled();
      expect(JSON.stringify(log.mock.calls)).not.toContain('SECRET123');
    },
  );

  it('gives lifecycle cancellation priority without starting a request', async () => {
    const lifecycle = new AbortController();
    const deadline = new AbortController();
    lifecycle.abort();
    deadline.abort();
    expect(
      await fxRequest(
        'lookup',
        {},
        {
          ...options(),
          lifecycle: lifecycle.signal,
          deadline: deadline.signal,
        },
      ),
    ).toEqual({ ok: false, code: 'cancelled' });
    expect(network).not.toHaveBeenCalled();
  });

  it('settles at 20 seconds even when fetch ignores abort', async () => {
    vi.useFakeTimers();
    let release: (value: Response) => void = () => undefined;
    const held = new Promise<Response>(resolve => {
      release = resolve;
    });
    network.mockReturnValue(held);
    const pending = fxRequest('lookup', {}, options());
    await vi.advanceTimersByTimeAsync(20000);
    expect(await pending).toEqual({ ok: false, code: 'timeout' });
    expect(network.mock.calls[0][1]?.signal?.aborted).toBe(true);
    release(new Response('{"status":"ok","data":{}}'));
    await Promise.resolve();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['lifecycle', 'deadline'] as const)(
    'stops an in-flight request on %s',
    async source => {
      const lifecycle = new AbortController();
      const deadline = new AbortController();
      network.mockReturnValue(new Promise<Response>(() => undefined));
      const pending = fxRequest(
        'lookup',
        {},
        {
          ...options(),
          lifecycle: lifecycle.signal,
          deadline: deadline.signal,
        },
      );
      (source === 'lifecycle' ? lifecycle : deadline).abort();
      expect(await pending).toEqual({
        ok: false,
        code: source === 'lifecycle' ? 'cancelled' : 'deadline',
      });
      expect(network.mock.calls[0][1]?.signal?.aborted).toBe(true);
    },
  );
});
