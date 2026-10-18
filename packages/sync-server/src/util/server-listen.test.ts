import http from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import { listenWithFallback } from './server-listen';

describe('listenWithFallback', () => {
  it('calls onListening with hostname when listen succeeds', () => {
    const fakeServer = new http.Server();
    vi.spyOn(fakeServer, 'listen').mockImplementation(((
      _port?: unknown,
      _host?: unknown,
      cb?: () => void,
    ) => {
      if (typeof cb === 'function') cb();
      return fakeServer;
    }) as typeof fakeServer.listen);

    const onListening = vi.fn();
    listenWithFallback(fakeServer, 5006, '::', onListening);

    expect(onListening).toHaveBeenCalledWith('::');
  });

  it.each(['EAFNOSUPPORT', 'EADDRNOTAVAIL', 'EINVAL', 'ENOTFOUND'])(
    'falls back to 0.0.0.0 when default :: fails with %s',
    async code => {
      const fakeServer = new http.Server();
      let listenCallCount = 0;
      const listenSpy = vi.spyOn(fakeServer, 'listen').mockImplementation(((
        _port?: unknown,
        _host?: unknown,
        cb?: () => void,
      ) => {
        listenCallCount++;
        if (listenCallCount === 1) {
          const err = new Error(
            `IPv6 bind failed (${code})`,
          ) as NodeJS.ErrnoException;
          err.code = code;
          process.nextTick(() => fakeServer.emit('error', err));
        } else if (listenCallCount === 2) {
          if (typeof cb === 'function') cb();
        }
        return fakeServer;
      }) as typeof fakeServer.listen);

      const warnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const onListening = vi.fn();

      listenWithFallback(fakeServer, 5006, '::', onListening);
      await new Promise<void>(resolve => process.nextTick(resolve));

      expect(listenSpy).toHaveBeenCalledTimes(2);
      expect(listenSpy).toHaveBeenNthCalledWith(
        1,
        5006,
        '::',
        expect.any(Function),
      );
      expect(listenSpy).toHaveBeenNthCalledWith(
        2,
        5006,
        '0.0.0.0',
        expect.any(Function),
      );
      expect(onListening).toHaveBeenCalledWith('0.0.0.0');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Failed to bind to IPv6 address '::' (${code}). Falling back to IPv4 '0.0.0.0'`,
        ),
      );
      warnSpy.mockRestore();
    },
  );

  it('logs an error if the 0.0.0.0 fallback attempt also fails', async () => {
    const fakeServer = new http.Server();
    let listenCallCount = 0;
    const fallbackErr = new Error('Port in use') as NodeJS.ErrnoException;
    fallbackErr.code = 'EADDRINUSE';

    vi.spyOn(fakeServer, 'listen').mockImplementation((() => {
      listenCallCount++;
      if (listenCallCount === 1) {
        const err = new Error('IPv6 unsupported') as NodeJS.ErrnoException;
        err.code = 'EAFNOSUPPORT';
        process.nextTick(() => fakeServer.emit('error', err));
      } else if (listenCallCount === 2) {
        process.nextTick(() => fakeServer.emit('error', fallbackErr));
      }
      return fakeServer;
    }) as typeof fakeServer.listen);

    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const onListening = vi.fn();

    listenWithFallback(fakeServer, 5006, '::', onListening);
    await new Promise<void>(resolve => process.nextTick(resolve));
    await new Promise<void>(resolve => process.nextTick(resolve));

    expect(onListening).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to start server on 0.0.0.0:5006:',
      fallbackErr,
    );
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('does not fall back if a custom hostname was specified', async () => {
    const fakeServer = new http.Server();
    const err = new Error('Address not available') as NodeJS.ErrnoException;
    err.code = 'EADDRNOTAVAIL';

    const listenSpy = vi.spyOn(fakeServer, 'listen').mockImplementation((() => {
      process.nextTick(() => fakeServer.emit('error', err));
      return fakeServer;
    }) as typeof fakeServer.listen);

    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const onListening = vi.fn();

    listenWithFallback(fakeServer, 5006, 'custom-host', onListening);
    await new Promise<void>(resolve => process.nextTick(resolve));

    expect(listenSpy).toHaveBeenCalledTimes(1);
    expect(onListening).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to start server on custom-host:5006:',
      err,
    );
    errorSpy.mockRestore();
  });
});
