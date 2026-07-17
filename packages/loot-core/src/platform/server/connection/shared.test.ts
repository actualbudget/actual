import { safePost, serializeError } from './shared';

describe('serializeError', () => {
  test('serializes a plain Error', () => {
    const error = new Error('boom');
    const result = serializeError(error);
    expect(result.name).toBe('Error');
    expect(result.message).toBe('boom');
    expect(typeof result.stack).toBe('string');
  });

  test('keeps primitive own properties like errnos', () => {
    const error = new Error('FS error');
    Object.assign(error, {
      errno: 44,
      code: 'ENOENT',
      setErrno: () => undefined,
      node: { some: 'object' },
    });

    const result = serializeError(error);
    expect(result.errno).toBe(44);
    expect(result.code).toBe('ENOENT');
    expect(result.setErrno).toBeUndefined();
    expect(result.node).toBeUndefined();
  });

  test('handles non-object errors', () => {
    expect(serializeError('oops')).toEqual({ name: 'Error', message: 'oops' });
    expect(serializeError(null)).toEqual({ name: 'Error', message: 'null' });
  });
});

describe('safePost', () => {
  test('posts the original message when it is cloneable', () => {
    const posted: unknown[] = [];
    const msg = { type: 'reply', id: '1', result: { data: 42, error: null } };

    safePost(m => posted.push(m), msg);

    expect(posted).toEqual([msg]);
  });

  test('falls back to a serialized message when cloning fails', () => {
    const fsError: Record<string, unknown> = Object.create(Error.prototype);
    fsError.message = 'FS error';
    fsError.errno = 44;
    fsError.setErrno = function (this: Record<string, unknown>, errno: number) {
      this.errno = errno;
    };

    const msg = {
      type: 'error',
      id: '1',
      error: { type: 'ServerError', message: 'FS error', cause: fsError },
    };

    const posted: unknown[] = [];
    safePost(m => posted.push(structuredClone(m)), msg);

    expect(posted).toHaveLength(1);
    const fallback = posted[0] as typeof msg;
    expect(fallback.type).toBe('error');
    expect(fallback.id).toBe('1');
    expect(fallback.error.type).toBe('ServerError');
    expect(fallback.error.message).toBe('FS error');
    const cause = fallback.error.cause as unknown as Record<string, unknown>;
    expect(cause.message).toBe('FS error');
    expect(cause.errno).toBe(44);
  });

  test('posts a generic error when the message cannot be serialized at all', () => {
    const posted: unknown[] = [];
    const msg = {
      type: 'reply',
      id: '1',
      result: { fn: () => undefined, big: BigInt(1) },
    };

    safePost(m => posted.push(structuredClone(m)), msg);

    expect(posted).toHaveLength(1);
    const fallback = posted[0] as {
      type: string;
      id: string;
      error: { type: string; message: string };
    };
    expect(fallback.type).toBe('error');
    expect(fallback.id).toBe('1');
    expect(fallback.error.type).toBe('ServerError');
    expect(fallback.error.message).toContain('Failed to serialize');
  });
});
