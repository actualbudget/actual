import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import { q } from '@actual-app/core/shared/query';
import type { CleanupTemplate } from '@actual-app/core/types/models/cleanup-templates';

import { aqlQuery } from '#queries/aqlQuery';

export function useCategoryCleanup({
  categoryId,
  source,
  onLoaded,
}: {
  categoryId: string;
  source: 'notes' | 'ui';
  onLoaded?: (cleanup: CleanupTemplate[]) => void;
}) {
  const [cleanup, setCleanup] = useState<CleanupTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      // skip the notes refresh for ui-managed categories — cleanup_def is canonical
      if (source !== 'ui') {
        await send('budget/store-note-cleanups', [categoryId]);
      }

      const result = await aqlQuery(
        q('categories').filter({ id: categoryId }).select(['cleanup_def']),
      );
      const row = Array.isArray(result.data) ? result.data[0] : null;
      const raw =
        row && typeof row.cleanup_def === 'string' ? row.cleanup_def : null;
      const parsed: CleanupTemplate[] = raw ? JSON.parse(raw) : [];
      if (mounted) {
        setCleanup(parsed);
        onLoaded?.(parsed);
        setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [categoryId, source, onLoaded]);

  return { cleanup, loading };
}
