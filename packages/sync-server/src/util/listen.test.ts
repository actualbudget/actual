import { createServer } from 'node:http';

import { describe, expect, it } from 'vitest';

import { describeListenError, startListening } from './listen';

/** Node reports bind failures as an `Error` carrying a `code` property. */
function errnoError(code: string, message = `bind ${code}`) {
  return Object.assign(new Error(message), { code });
}

describe('describeListenError', () => {
  it('explains how to recover when the host has no IPv6', () => {
    const message = describeListenError(errnoError('EAFNOSUPPORT'), 5006, '::');

    expect(message).toContain('::5006');
    expect(message).toContain('0.0.0.0');
    expect(message).toContain('ACTUAL_HOSTNAME');
  });

  it('names the port when it is already in use', () => {
    const message = describeListenError(
      errnoError('EADDRINUSE'),
      5006,
      '0.0.0.0',
    );

    expect(message).toContain('0.0.0.0:5006');
    expect(message).toContain('already in use');
  });

  it('reports the default hostname when none is configured', () => {
    expect(describeListenError(errnoError('EACCES'), 5006)).toContain('::5006');
  });

  it('keeps the underlying message for an unrecognised error', () => {
    expect(
      describeListenError(new Error('something odd'), 5006, '::'),
    ).toContain('something odd');
  });
});

describe('startListening', () => {
  it('rejects with an actionable message when the bind fails', async () => {
    const server = createServer();
    const listening = startListening(server, 0, '::');

    // Simulate the kernel refusing the IPv6 bind before the listen callback.
    server.emit('error', errnoError('EAFNOSUPPORT'));

    await expect(listening).rejects.toThrow(/0\.0\.0\.0/);
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('resolves once the server is listening and runs the callback', async () => {
    const server = createServer();
    let started = false;

    await startListening(server, 0, '127.0.0.1', () => {
      started = true;
    });

    expect(started).toBe(true);
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('removes the startup error listener once the server is listening', async () => {
    const server = createServer();

    await startListening(server, 0, '127.0.0.1');

    // A leftover listener would swallow runtime server errors: a registered
    // 'error' listener replaces Node's default uncaught-exception behaviour.
    expect(server.listenerCount('error')).toBe(0);

    await new Promise<void>(resolve => server.close(() => resolve()));
  });
});
