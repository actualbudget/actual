import { v4 as uuidv4 } from 'uuid';

import * as db from '#server/db';
import type { CleanupTemplate } from '#types/models/cleanup-templates';

import { parse } from './cleanup-template.pegjs';

export const CLEANUP_PREFIX = '#cleanup ';

// The grammar emits `type: null` for the bare `<group>` line; we re-key
// that to `'overspend'` so the discriminator is a non-null literal.
type ParsedCleanupRow =
  | { type: 'source'; group: string | null }
  | { type: 'sink'; group: string | null; weight: number }
  | { type: 'overspend'; group: string };

type CategoryWithCleanupNote = {
  id: string;
  note: string | null;
};

export async function storeNoteCleanups(categoryIds?: string[]): Promise<void> {
  const candidates = await getCategoriesWithCleanupNotes(categoryIds);

  const parsedByCategory = new Map<string, ParsedCleanupRow[]>();
  const allGroupNames = new Set<string>();
  for (const { id, note } of candidates) {
    if (!note) continue;
    const rows = parseCleanupNote(note);
    if (rows.length === 0) continue;
    parsedByCategory.set(id, rows);
    for (const r of rows) {
      if (r.group != null) allGroupNames.add(r.group);
    }
  }

  const nameToId = await resolveCleanupGroups(allGroupNames);

  for (const { id } of candidates) {
    const parsed = parsedByCategory.get(id);
    if (!parsed) {
      await db.updateWithSchema('categories', { id, cleanup_def: null });
      continue;
    }
    const cleanupDef: CleanupTemplate[] = parsed.map(row =>
      toCleanupTemplate(row, nameToId),
    );
    await db.updateWithSchema('categories', {
      id,
      cleanup_def: JSON.stringify(cleanupDef),
    });
  }

  await tombstoneOrphanCleanupGroups();
}

function parseCleanupNote(note: string): ParsedCleanupRow[] {
  const rows: ParsedCleanupRow[] = [];
  for (const line of note.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.toLowerCase().startsWith(CLEANUP_PREFIX)) continue;
    try {
      const raw = parse(trimmed) as {
        type: 'source' | 'sink' | null;
        group: string | null;
        weight?: number;
      };
      const row: ParsedCleanupRow =
        raw.type === 'source'
          ? { type: 'source', group: raw.group }
          : raw.type === 'sink'
            ? { type: 'sink', group: raw.group, weight: raw.weight ?? 1 }
            : { type: 'overspend', group: raw.group ?? '' };
      // The grammar should guarantee a non-null group for `overspend`, but
      // guard so a malformed parse can't write a blank-group row.
      if (row.type === 'overspend' && row.group === '') continue;
      rows.push(row);
    } catch {
      // Match the legacy engine: silently skip unparseable lines.
    }
  }
  return rows;
}

function toCleanupTemplate(
  row: ParsedCleanupRow,
  nameToId: Map<string, string>,
): CleanupTemplate {
  switch (row.type) {
    case 'source':
      return { role: 'source', groupId: resolveGroup(row.group, nameToId) };
    case 'sink':
      return {
        role: 'sink',
        groupId: resolveGroup(row.group, nameToId),
        weight: row.weight,
      };
    case 'overspend': {
      const groupId = nameToId.get(row.group.toLowerCase());
      if (groupId == null) {
        throw new Error(
          `Unresolved cleanup group for overspend row: ${row.group}`,
        );
      }
      return { role: 'overspend', groupId };
    }
    default:
      throw new Error(`Unknown cleanup row type: ${String(row)}`);
  }
}

function resolveGroup(
  name: string | null,
  nameToId: Map<string, string>,
): string | null {
  return name != null ? (nameToId.get(name.toLowerCase()) ?? null) : null;
}

async function resolveCleanupGroups(
  names: ReadonlySet<string>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const name of names) {
    const key = name.toLowerCase();
    const existing = await db.first<{ id: string; tombstone: 0 | 1 }>(
      `SELECT id, tombstone FROM cleanup_groups WHERE lower(name) = ? LIMIT 1`,
      [key],
    );
    if (existing) {
      // Resurrect a tombstoned row so the id stays stable across edits.
      if (existing.tombstone === 1) {
        await db.update('cleanup_groups', { id: existing.id, tombstone: 0 });
      }
      map.set(key, existing.id);
      continue;
    }
    const id = uuidv4();
    await db.insertWithSchema('cleanup_groups', { id, name, tombstone: 0 });
    map.set(key, id);
  }
  return map;
}

async function tombstoneOrphanCleanupGroups(): Promise<void> {
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

// Scoped to non-ui-managed categories so a migrated category is not
// overwritten by stale note text.
async function getCategoriesWithCleanupNotes(
  categoryIds?: string[],
): Promise<CategoryWithCleanupNote[]> {
  const baseQuery = `
    SELECT c.id AS id, n.note AS note
    FROM categories c
    LEFT JOIN notes n ON n.id = c.id
    WHERE c.tombstone = 0
      AND COALESCE(JSON_EXTRACT(c.template_settings, '$.source'), 'notes') <> 'ui'
  `;
  if (!categoryIds) {
    return db.all<CategoryWithCleanupNote>(baseQuery);
  }
  if (categoryIds.length === 0) return [];
  const placeholders = categoryIds.map(() => '?').join(',');
  return db.all<CategoryWithCleanupNote>(
    `${baseQuery} AND c.id IN (${placeholders})`,
    categoryIds,
  );
}
