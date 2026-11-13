import * as db from '#server/db';
import type { DbAccountImportRef } from '#server/db/types/index';

import type { ImportAccountHint } from './account-hint';

// The hash is the row id of `account_import_refs`, so an external account
// can only ever be paired with one account.
export async function hashAccountHint(
  hint: ImportAccountHint,
): Promise<string> {
  const bytes = new TextEncoder().encode(`${hint.source}:${hint.id}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

// Closed and deleted accounts are never matched, but their pairings are kept
// so reopening an account restores them.
export async function findPairedAccount(
  hintId: string,
): Promise<DbAccountImportRef['account'] | null> {
  const row = await db.first<{ account: string }>(
    `SELECT r.account FROM account_import_refs r
       JOIN accounts a ON a.id = r.account
      WHERE r.id = ? AND r.tombstone = 0 AND a.tombstone = 0 AND a.closed = 0`,
    [hintId],
  );
  return row?.account ?? null;
}

// Returns the account the identifier was previously paired with when it
// was moved to a different (existing) account, otherwise null.
export async function pairAccountHint(
  hintId: string,
  accountId: DbAccountImportRef['account'],
): Promise<{ previousAccountId: string | null }> {
  const existing = await db.first<Pick<DbAccountImportRef, 'account'>>(
    `SELECT r.account FROM account_import_refs r
       JOIN accounts a ON a.id = r.account
      WHERE r.id = ? AND r.tombstone = 0 AND a.tombstone = 0`,
    [hintId],
  );

  if (existing?.account === accountId) {
    return { previousAccountId: null };
  }

  const row = await db.first<{ id: string }>(
    'SELECT id FROM account_import_refs WHERE id = ?',
    [hintId],
  );
  if (row) {
    await db.update('account_import_refs', {
      id: hintId,
      account: accountId,
      tombstone: 0,
    });
  } else {
    await db.insert('account_import_refs', {
      id: hintId,
      account: accountId,
      tombstone: 0,
    });
  }

  return { previousAccountId: existing?.account ?? null };
}
