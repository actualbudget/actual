import http from 'node:http';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listenWithFallback } from './server-listen';

describe('listenWithFallback', () => {
  let server: http.Server;

  beforeEach(() => {
    server = new http.Server();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('reports the configured hostname after listening succeeds', () => {
    const listen = vi.spyOn(server, 'listen').mockReturnValue(server);
    const onListening = vi.fn();

    listenWithFallback(server, 5006, '::', onListening);
    const callback = listen.mock.calls[0]?.at(-1);
    if (typeof callback === 'function') callback();

    expect(onListening).toHaveBeenCalledExactlyOnceWith('::');
  });

  it.each(['EAFNOSUPPORT', 'EADDRNOTAVAIL', 'EINVAL', 'ENOTFOUND'])(
    'falls back to IPv4 when :: fails with %s',
    code => {
      const listen = vi.spyOn(server, 'listen').mockReturnValue(server);
      const onListening = vi.fn();
      const onError = vi.fn();
      listenWithFallback(server, 5006, '::', onListening, onError);

      server.emit(
        'error',
        Object.assign(new Error('IPv6 unavailable'), { code }),
      );
      expect(listen).toHaveBeenLastCalledWith(
        5006,
        '0.0.0.0',
        expect.any(Function),
      );
      const callback = listen.mock.calls[1]?.at(-1);
      if (typeof callback === 'function') callback();

      expect(onListening).toHaveBeenCalledExactlyOnceWith('0.0.0.0');
      expect(onError).not.toHaveBeenCalled();
    },
  );

  it.each([
    { hostname: 'custom-host', code: 'EADDRNOTAVAIL', fallback: false },
    { hostname: '::', code: 'EADDRINUSE', fallback: false },
    { hostname: '::', code: 'EADDRINUSE', fallback: true },
  ])(
    'reports terminal errors ($hostname, fallback=$fallback)',
    ({ hostname, code, fallback }) => {
      const listen = vi.spyOn(server, 'listen').mockReturnValue(server);
      const onListening = vi.fn();
      const onError = vi.fn();
      const error = Object.assign(new Error('Cannot listen'), { code });
      listenWithFallback(server, 5006, hostname, onListening, onError);

      if (fallback) {
        server.emit(
          'error',
          Object.assign(new Error('IPv6 unavailable'), {
            code: 'EAFNOSUPPORT',
          }),
        );
      }
      server.emit('error', error);

      expect(listen).toHaveBeenCalledTimes(fallback ? 2 : 1);
      expect(onListening).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    },
  );
});
