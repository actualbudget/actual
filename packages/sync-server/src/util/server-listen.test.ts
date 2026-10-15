import http from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { listenWithFallback } from './server-listen';

describe('listenWithFallback', () => {
  it('calls onListening with hostname when listen succeeds', () => {
    const fakeServer = new http.Server();
    vi.spyOn(fakeServer, 'listen').mockImplementation((port, host, cb) => {
      if (typeof cb === 'function') cb();
      return fakeServer;
    });

    const onListening = vi.fn();
    listenWithFallback(fakeServer, 5006, '::', onListening);

    expect(onListening).toHaveBeenCalledWith('::');
  });

  it('falls back to 0.0.0.0 when default :: fails with EAFNOSUPPORT', () => {
    const fakeServer = new http.Server();
    let listenCallCount = 0;
    const listenSpy = vi.spyOn(fakeServer, 'listen').mockImplementation((port, host, cb) => {
      listenCallCount++;
      if (listenCallCount === 1) {
        // Emit error simulating IPv6 disabled
        const err = new Error('IPv6 unsupported') as NodeJS.ErrnoException;
        err.code = 'EAFNOSUPPORT';
        process.nextTick(() => fakeServer.emit('error', err));
      } else if (listenCallCount === 2) {
        // Second call with 0.0.0.0 succeeds
        if (typeof cb === 'function') cb();
      }
      return fakeServer;
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const onListening = vi.fn();

    listenWithFallback(fakeServer, 5006, '::', onListening);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(listenSpy).toHaveBeenCalledTimes(2);
        expect(listenSpy).toHaveBeenNthCalledWith(1, 5006, '::', expect.any(Function));
        expect(listenSpy).toHaveBeenNthCalledWith(2, 5006, '0.0.0.0', expect.any(Function));
        expect(onListening).toHaveBeenCalledWith('0.0.0.0');
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining("Failed to bind to IPv6 address '::' (EAFNOSUPPORT). Falling back to IPv4 '0.0.0.0'"),
        );
        warnSpy.mockRestore();
        resolve();
      }, 50);
    });
  });

  it('falls back to 0.0.0.0 when default :: fails with EADDRNOTAVAIL', () => {
    const fakeServer = new http.Server();
    let listenCallCount = 0;
    const listenSpy = vi.spyOn(fakeServer, 'listen').mockImplementation((port, host, cb) => {
      listenCallCount++;
      if (listenCallCount === 1) {
        const err = new Error('Address not available') as NodeJS.ErrnoException;
        err.code = 'EADDRNOTAVAIL';
        process.nextTick(() => fakeServer.emit('error', err));
      } else if (listenCallCount === 2) {
        if (typeof cb === 'function') cb();
      }
      return fakeServer;
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const onListening = vi.fn();

    listenWithFallback(fakeServer, 5006, '::', onListening);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(listenSpy).toHaveBeenCalledTimes(2);
        expect(onListening).toHaveBeenCalledWith('0.0.0.0');
        warnSpy.mockRestore();
        resolve();
      }, 50);
    });
  });

  it('does not fall back if a custom hostname was specified', () => {
    const fakeServer = new http.Server();
    vi.spyOn(fakeServer, 'listen').mockImplementation(() => {
      const err = new Error('Address not available') as NodeJS.ErrnoException;
      err.code = 'EADDRNOTAVAIL';
      process.nextTick(() => fakeServer.emit('error', err));
      return fakeServer;
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onListening = vi.fn();

    expect(() => {
      listenWithFallback(fakeServer, 5006, 'custom-host', onListening);
    }).not.toThrow(); // listen is called async

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(onListening).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
        resolve();
      }, 50);
    });
  });
});
