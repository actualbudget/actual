import { unzipSync, zipSync } from 'fflate';
import type { Unzipped, Zippable } from 'fflate';

// fflate does no validation itself, so we add what a hardened zip reader
// would: reject path traversal / zip-slip, cap sizes against zip bombs,
// reject duplicate entries. These checks run inside the `filter` hook
// unzipSync calls per entry, before it decompresses that entry.

// Size caps default to 20MB, same as sync-server's load-config.js).
// `typeof process !== 'undefined'` guards the read because a bare
// `process` reference crashes if this file ever leaks into desktop-client's
// main bundle (no polyfill there).
const UPLOAD_FILE_SIZE_LIMIT_MB =
  (typeof process !== 'undefined' &&
    Number(process.env.ACTUAL_UPLOAD_FILE_SIZE_LIMIT_MB)) ||
  20;
const DEFAULT_MAX_SIZE = UPLOAD_FILE_SIZE_LIMIT_MB * 1024 * 1024;

const DEFAULT_MAX_ARCHIVE_SIZE = DEFAULT_MAX_SIZE;
const DEFAULT_MAX_ENTRY_SIZE = DEFAULT_MAX_SIZE;
const DEFAULT_MAX_TOTAL_UNCOMPRESSED_SIZE = DEFAULT_MAX_SIZE * 10;

export class UnsafeZipError extends Error {}

function assertSafeEntryName(name: string) {
  const isTraversal = name.split('/').some(segment => segment === '..');

  if (
    name.includes('\0') ||
    name.includes('\\') ||
    /^[a-zA-Z]:/.test(name) ||
    name.startsWith('/') ||
    isTraversal
  ) {
    throw new UnsafeZipError(`Unsafe zip entry name: ${name}`);
  }
}

type SafeUnzipOptions = {
  maxArchiveSize?: number;
  maxEntrySize?: number;
  maxTotalUncompressedSize?: number;
};

export function safeUnzip(
  data: Uint8Array,
  {
    maxArchiveSize = DEFAULT_MAX_ARCHIVE_SIZE,
    maxEntrySize = DEFAULT_MAX_ENTRY_SIZE,
    maxTotalUncompressedSize = DEFAULT_MAX_TOTAL_UNCOMPRESSED_SIZE,
  }: SafeUnzipOptions = {},
): Unzipped {
  if (data.length > maxArchiveSize) {
    throw new UnsafeZipError(
      `Zip archive exceeds maximum size of ${maxArchiveSize} bytes`,
    );
  }

  const seen = new Set<string>();

  let totalUncompressedSize = 0;

  return unzipSync(data, {
    filter(file) {
      assertSafeEntryName(file.name);

      if (file.originalSize > maxEntrySize) {
        throw new UnsafeZipError(
          `Zip entry "${file.name}" exceeds maximum size of ${maxEntrySize} bytes`,
        );
      }

      totalUncompressedSize += file.originalSize;
      if (totalUncompressedSize > maxTotalUncompressedSize) {
        throw new UnsafeZipError(
          `Zip archive's total uncompressed size exceeds maximum of ${maxTotalUncompressedSize} bytes`,
        );
      }

      const normalized = file.name.toLowerCase();
      if (seen.has(normalized)) {
        throw new UnsafeZipError(
          `Zip archive contains a duplicate entry: ${file.name}`,
        );
      }
      seen.add(normalized);

      return true;
    },
  });
}

export function safeZip(files: Zippable): Uint8Array {
  for (const name of Object.keys(files)) {
    assertSafeEntryName(name);
  }
  return zipSync(files);
}
