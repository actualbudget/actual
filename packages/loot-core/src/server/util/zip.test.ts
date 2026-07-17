import { zipSync } from 'fflate';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  exceedsSafeUnzipLimits,
  safeUnzip,
  safeZip,
  UnsafeZipError,
} from './zip';

// fflate stamps each entry with the current date in DOS format, which
// rejects the fake pre-1980 clock the test setup freezes `Date.now` to.
const testGlobal = global as unknown as {
  restoreDateNow: () => void;
  restoreFakeDateNow: () => void;
};
beforeAll(() => testGlobal.restoreDateNow());
afterAll(() => testGlobal.restoreFakeDateNow());

describe('safeZip / safeUnzip round trip', () => {
  test('unzips exactly what was zipped', () => {
    const zipped = safeZip({
      'db.sqlite': Buffer.from('sqlite-content'),
      'metadata.json': Buffer.from('{"id":"abc"}'),
    });

    const entries = safeUnzip(zipped);

    expect(Buffer.from(entries['db.sqlite']).toString()).toBe('sqlite-content');
    expect(Buffer.from(entries['metadata.json']).toString()).toBe(
      '{"id":"abc"}',
    );
  });

  test('round trips a nested entry name', () => {
    const zipped = safeZip({
      'budget/db.sqlite': Buffer.from('nested'),
    });

    const entries = safeUnzip(zipped);

    expect(Buffer.from(entries['budget/db.sqlite']).toString()).toBe('nested');
  });
});

describe('unsafe entry names', () => {
  test.each([
    ['path traversal', '../etc/passwd'],
    ['path traversal in a nested segment', 'foo/../../etc/passwd'],
    ['absolute path', '/etc/passwd'],
    ['backslash', 'foo\\bar'],
    ['windows drive letter', 'C:\\evil.txt'],
    ['null byte', 'foo\0bar'],
  ])('safeZip rejects %s', (_name, entryName) => {
    expect(() => safeZip({ [entryName]: Buffer.from('x') })).toThrow(
      UnsafeZipError,
    );
  });

  test.each([
    ['path traversal', '../etc/passwd'],
    ['absolute path', '/etc/passwd'],
    ['backslash', 'foo\\bar'],
    ['windows drive letter', 'C:\\evil.txt'],
  ])('safeUnzip rejects %s', (_name, entryName) => {
    // Build the archive with fflate directly since safeZip would already
    // reject these names before we get a chance to unzip them.
    const zipped = zipSync({ [entryName]: Buffer.from('x') });

    expect(() => safeUnzip(zipped)).toThrow(UnsafeZipError);
  });
});

describe('duplicate entries', () => {
  test('safeUnzip rejects case-insensitive duplicate names', () => {
    const zipped = zipSync({
      'db.sqlite': Buffer.from('a'),
      'DB.SQLITE': Buffer.from('b'),
    });

    expect(() => safeUnzip(zipped)).toThrow(UnsafeZipError);
  });
});

describe('size limits', () => {
  test('safeUnzip rejects an archive over maxArchiveSize', () => {
    const zipped = safeZip({ 'db.sqlite': Buffer.from('x'.repeat(1000)) });

    expect(() => safeUnzip(zipped, { maxArchiveSize: 10 })).toThrow(
      UnsafeZipError,
    );
  });

  test('safeUnzip rejects a single entry over maxEntrySize', () => {
    const zipped = safeZip({ 'db.sqlite': Buffer.from('x'.repeat(1000)) });

    expect(() =>
      safeUnzip(zipped, { maxArchiveSize: 10_000, maxEntrySize: 10 }),
    ).toThrow(UnsafeZipError);
  });

  test('safeUnzip rejects when total uncompressed size exceeds the cap', () => {
    const zipped = safeZip({
      a: Buffer.from('x'.repeat(100)),
      b: Buffer.from('x'.repeat(100)),
    });

    expect(() =>
      safeUnzip(zipped, {
        maxArchiveSize: 10_000,
        maxEntrySize: 10_000,
        maxTotalUncompressedSize: 150,
      }),
    ).toThrow(UnsafeZipError);
  });

  test('safeUnzip accepts an archive within all limits', () => {
    const zipped = safeZip({ 'db.sqlite': Buffer.from('small') });

    expect(() => safeUnzip(zipped)).not.toThrow();
  });
});

describe('exceedsSafeUnzipLimits', () => {
  test('reports false for a small archive', () => {
    const entries = { 'db.sqlite': Buffer.from('small') };
    const zipped = safeZip(entries);

    expect(exceedsSafeUnzipLimits(zipped, entries)).toBe(false);
  });

  test('reports true when an entry is larger than safeUnzip would allow', () => {
    // Simulate an oversized entry without actually allocating 500MB+.
    const bigEntry = { length: 600 * 1024 * 1024 } as unknown as Uint8Array;
    const smallArchive = new Uint8Array(10);

    expect(
      exceedsSafeUnzipLimits(smallArchive, { 'db.sqlite': bigEntry }),
    ).toBe(true);
  });

  test('reports true when the archive itself is larger than safeUnzip would allow', () => {
    const bigArchive = {
      length: 2 * 1024 * 1024 * 1024,
    } as unknown as Uint8Array;

    expect(exceedsSafeUnzipLimits(bigArchive, {})).toBe(true);
  });
});
