import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import { q } from '@actual-app/core/shared/query';

import { aqlQuery } from '#queries/aqlQuery';

export type CleanupGroup = { id: string; name: string };

export function useCleanupGroups() {
  const [groups, setGroups] = useState<CleanupGroup[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const result = await aqlQuery(
      q('cleanup_groups').filter({ tombstone: false }).select(['id', 'name']),
    );
    const rows = Array.isArray(result.data) ? result.data : [];
    setGroups(
      rows.flatMap(row =>
        row && typeof row.id === 'string' && typeof row.name === 'string'
          ? [{ id: row.id, name: row.name }]
          : [],
      ),
    );
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function createGroup(name: string) {
    const { id } = await send('budget/create-cleanup-group', { name });
    await reload();
    return id;
  }

  return { groups, loading, createGroup };
}
