import type { Database } from '@jlongster/sql.js';

import * as sqlite from '#platform/server/sqlite';
import type { MetadataPrefs } from '#types/prefs';

// Archive entry only. Local budgets use db.sqlite.
export const PROTECTED_DATABASE = 'db.amount-encoding.sqlite';
export const ENCODING_SENTINEL =
  'Actual amount encoding v1. Open with a compatible Actual client.\n';

export function recoverLocalEncoding(database: Database) {
  const rows = sqlite.runQuery(
    database,
    "SELECT id, value FROM preferences WHERE id IN ('amountEncoding', 'amountEncodingTransition')",
    [],
    true,
  ) as Array<{ id: string; value: string }>;
  const amountEncoding = rows.find(row => row.id === 'amountEncoding')?.value;
  const pending = rows.find(
    row => row.id === 'amountEncodingTransition',
  )?.value;
  return {
    amountEncoding,
    amountEncodingTransition: pending ? JSON.parse(pending) : undefined,
  } satisfies Pick<
    MetadataPrefs,
    'amountEncoding' | 'amountEncodingTransition'
  >;
}

export function databaseEntries(
  content: Uint8Array,
  isProtected: boolean,
): Record<string, Uint8Array> {
  return isProtected
    ? {
        'db.sqlite': Buffer.from(ENCODING_SENTINEL),
        [PROTECTED_DATABASE]: content,
      }
    : { 'db.sqlite': content };
}

export function readDatabaseEntries(
  entries: Record<string, Uint8Array>,
  prefix = '',
) {
  const legacy = entries[prefix + 'db.sqlite'];
  if (!legacy) throw new Error('amount-encoding-missing-database');
  const protectedContent = entries[prefix + PROTECTED_DATABASE];
  const hasSentinel =
    Buffer.from(legacy).toString('utf8') === ENCODING_SENTINEL;
  if (hasSentinel !== Boolean(protectedContent)) {
    throw new Error('amount-encoding-invalid-file');
  }
  return { content: protectedContent ?? legacy, isProtected: hasSentinel };
}
