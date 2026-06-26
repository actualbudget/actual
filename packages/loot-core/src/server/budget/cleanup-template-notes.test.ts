import { vi } from 'vitest';

import * as db from '#server/db';

import { storeNoteCleanups } from './cleanup-template-notes';

vi.mock('#server/db');

type CategoryRow = {
  id: string;
  note: string | null;
};

type GroupRow = {
  id: string;
  name: string;
  tombstone: 0 | 1;
};

function setupDb(initial: { categories: CategoryRow[]; groups?: GroupRow[] }) {
  const groups = new Map<string, GroupRow>(
    (initial.groups ?? []).map(g => [g.id, { ...g }]),
  );
  const categoryDefs = new Map<string, string | null>();

  vi.mocked(db.all).mockImplementation(async (sql: string) => {
    if (sql.includes('FROM categories c')) {
      return initial.categories as never;
    }
    return [] as never;
  });

  vi.mocked(db.first).mockImplementation(async (sql: string, params) => {
    if (sql.includes('FROM cleanup_groups')) {
      const key = (params as string[])[0];
      const match = Array.from(groups.values()).find(
        g => g.name.toLowerCase() === key,
      );
      return (match ?? null) as never;
    }
    return null as never;
  });

  vi.mocked(db.insertWithSchema).mockImplementation(async (table, row) => {
    if (table === 'cleanup_groups') {
      const r = row as GroupRow;
      groups.set(r.id, { ...r, tombstone: 0 });
    }
    return row.id as never;
  });

  vi.mocked(db.update).mockImplementation(async (table, params) => {
    if (table === 'cleanup_groups') {
      const r = params as Partial<GroupRow> & { id: string };
      const existing = groups.get(r.id);
      if (existing) groups.set(r.id, { ...existing, ...r } as GroupRow);
    }
    return undefined as never;
  });

  vi.mocked(db.updateWithSchema).mockImplementation(async (table, fields) => {
    if (table === 'categories') {
      const r = fields as { id: string; cleanup_def: string | null };
      categoryDefs.set(r.id, r.cleanup_def);
    }
    return undefined as never;
  });

  vi.mocked(db.run).mockImplementation(async (sql: string) => {
    // tombstoneOrphanCleanupGroups: scan written cleanup_defs for referenced ids
    if (sql.includes('UPDATE cleanup_groups')) {
      const referenced = new Set<string>();
      for (const def of categoryDefs.values()) {
        if (!def) continue;
        const arr = JSON.parse(def) as Array<{ groupId?: string | null }>;
        for (const row of arr) {
          if (row.groupId) referenced.add(row.groupId);
        }
      }
      for (const [id, g] of groups) {
        if (g.tombstone === 0 && !referenced.has(id)) {
          groups.set(id, { ...g, tombstone: 1 });
        }
      }
    }
    return undefined as never;
  });

  return { groups, categoryDefs };
}

describe('storeNoteCleanups', () => {
  beforeEach(() => vi.clearAllMocks());

  it('persists global source/sink lines as cleanup_def with null groupId', async () => {
    const state = setupDb({
      categories: [
        { id: 'cat-1', note: '#cleanup source' },
        { id: 'cat-2', note: '#cleanup sink 2' },
      ],
    });

    await storeNoteCleanups();

    expect(JSON.parse(state.categoryDefs.get('cat-1')!)).toEqual([
      { role: 'source', groupId: null },
    ]);
    expect(JSON.parse(state.categoryDefs.get('cat-2')!)).toEqual([
      { role: 'sink', groupId: null, weight: 2 },
    ]);
  });

  it('resolves shared group names to a single group id, case-insensitively', async () => {
    const state = setupDb({
      categories: [
        { id: 'cat-1', note: '#cleanup Vacations source' },
        { id: 'cat-2', note: '#cleanup vacations sink' },
        { id: 'cat-3', note: '#cleanup VACATIONS' },
      ],
    });

    await storeNoteCleanups();

    const def1 = JSON.parse(state.categoryDefs.get('cat-1')!);
    const def2 = JSON.parse(state.categoryDefs.get('cat-2')!);
    const def3 = JSON.parse(state.categoryDefs.get('cat-3')!);
    expect(def1[0].groupId).toBe(def2[0].groupId);
    expect(def2[0].groupId).toBe(def3[0].groupId);

    // One group exists.
    const liveGroups = Array.from(state.groups.values()).filter(
      g => g.tombstone === 0,
    );
    expect(liveGroups).toHaveLength(1);
    // Name preserves the casing of whichever line was seen first.
    expect(liveGroups[0].name).toBe('Vacations');
  });

  it('clears cleanup_def for categories whose notes no longer carry cleanup', async () => {
    const state = setupDb({
      categories: [{ id: 'cat-1', note: 'totally unrelated note text' }],
    });

    await storeNoteCleanups();

    expect(state.categoryDefs.get('cat-1')).toBeNull();
  });

  it('tombstones groups that no longer have any live members', async () => {
    const state = setupDb({
      categories: [{ id: 'cat-1', note: 'no cleanup here' }],
      groups: [{ id: 'g-orphan', name: 'OldGroup', tombstone: 0 }],
    });

    await storeNoteCleanups();

    expect(state.groups.get('g-orphan')!.tombstone).toBe(1);
  });

  it('resurrects a tombstoned group when a fresh note references its name', async () => {
    const state = setupDb({
      categories: [{ id: 'cat-1', note: '#cleanup Reborn source' }],
      groups: [{ id: 'g-existing', name: 'Reborn', tombstone: 1 }],
    });

    await storeNoteCleanups();

    expect(state.groups.get('g-existing')!.tombstone).toBe(0);
    const def = JSON.parse(state.categoryDefs.get('cat-1')!);
    expect(def[0].groupId).toBe('g-existing');
  });
});
