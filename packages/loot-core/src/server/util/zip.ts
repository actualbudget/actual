import { unzipSync, zipSync } from 'fflate';
import type { Unzipped } from 'fflate';

import type { UnsafeZipMeta } from '#shared/errors';

// fflate does no validation itself: guard against zip-slip, decompression
// bombs, and duplicate entries.

const MAX_ZIP_SIZE = 500 * 1024 * 1024; // 500MB; also doubles as a memory-safety cap

export class UnsafeZipError extends Error {
  readonly meta: UnsafeZipMeta;

  constructor(message: string, meta: UnsafeZipMeta) {
    super(message);
    this.meta = meta;
  }
}

function assertSafeEntryName(name: string) {
  const isTraversal = name.split('/').some(segment => segment === '..');

  if (
    name.includes('\0') ||
    name.includes('\\') ||
    /^[a-zA-Z]:/.test(name) ||
    name.startsWith('/') ||
    isTraversal
  ) {
    throw new UnsafeZipError(`Unsafe zip entry name: ${name}`, {
      zipReason: 'unsafe-entry-name',
      entryName: name,
    });
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
    maxArchiveSize = MAX_ZIP_SIZE,
    maxEntrySize = MAX_ZIP_SIZE,
    maxTotalUncompressedSize = MAX_ZIP_SIZE,
  }: SafeUnzipOptions = {},
): Unzipped {
  if (data.length > maxArchiveSize) {
    throw new UnsafeZipError(
      `Zip archive exceeds maximum size of ${maxArchiveSize} bytes`,
      { zipReason: 'archive-size', maxSize: maxArchiveSize },
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
          {
            zipReason: 'entry-size',
            entryName: file.name,
            maxSize: maxEntrySize,
          },
        );
      }

      totalUncompressedSize += file.originalSize;
      if (totalUncompressedSize > maxTotalUncompressedSize) {
        throw new UnsafeZipError(
          `Zip archive's total uncompressed size exceeds maximum of ${maxTotalUncompressedSize} bytes`,
          { zipReason: 'total-size', maxSize: maxTotalUncompressedSize },
        );
      }

      const normalized = file.name.toLowerCase();
      if (seen.has(normalized)) {
        throw new UnsafeZipError(
          `Zip archive contains a duplicate entry: ${file.name}`,
          { zipReason: 'duplicate-entry', entryName: file.name },
        );
      }
      seen.add(normalized);

      return true;
    },
  });
}

export function safeZip(files: Record<string, Uint8Array>): Uint8Array {
  for (const name of Object.keys(files)) {
    assertSafeEntryName(name);
  }
  return zipSync(files);
}

export function exceedsSafeUnzipLimits(
  archive: Uint8Array,
  entries: Record<string, Uint8Array>,
): boolean {
  if (archive.length > MAX_ZIP_SIZE) {
    return true;
  }

  let totalUncompressedSize = 0;
  for (const entry of Object.values(entries)) {
    if (entry.length > MAX_ZIP_SIZE) {
      return true;
    }
    totalUncompressedSize += entry.length;
  }

  return totalUncompressedSize > MAX_ZIP_SIZE;
}
