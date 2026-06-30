import { v4 as uuidv4 } from 'uuid';

import * as db from '#server/db';

export async function resolveCleanupGroup(name: string): Promise<string> {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Cleanup group name cannot be empty');
  }
  const key = trimmed.toLowerCase();
  const existing = await db.first<{ id: string; tombstone: 0 | 1 }>(
    `SELECT id, tombstone FROM cleanup_groups WHERE lower(name) = ? LIMIT 1`,
    [key],
  );
  if (existing) {
    if (existing.tombstone) {
      await db.update('cleanup_groups', { id: existing.id, tombstone: 0 });
    }
    return existing.id;
  }
  const id = uuidv4();
  await db.insertWithSchema('cleanup_groups', {
    id,
    name: trimmed,
    tombstone: 0,
  });
  return id;
}

export async function createCleanupGroup({
  name,
}: {
  name: string;
}): Promise<{ id: string }> {
  const id = await resolveCleanupGroup(name);
  return { id };
}

export async function tombstoneOrphanCleanupGroups(): Promise<void> {
  await db.run(
    `
      UPDATE cleanup_groups
      SET tombstone = 1
      WHERE tombstone = 0
        AND id NOT IN (
          SELECT json_extract(je.value, '$.groupId') AS group_id
          FROM categories c, json_each(c.cleanup_def) je
          WHERE c.tombstone = 0
            AND c.cleanup_def IS NOT NULL
            AND json_extract(je.value, '$.groupId') IS NOT NULL
        )
    `,
  );
}
