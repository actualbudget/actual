import { useEffect, useState } from 'react';

import { send } from 'loot-core/platform/client/connection';
import type { Template } from 'loot-core/types/models/templates';

export function useBudgetAutomations({
  categoryId,
  onLoaded,
}: {
  categoryId: string;
  onLoaded: (automations: Record<string, Template[]>) => void;
}) {
  const [automations, setAutomations] = useState<Record<string, Template[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchAutomations() {
      setLoading(true);

      // Always import notes first; the query will automatically ignore UI-based categories.
      await send('budget/store-note-templates');

      const result = await send('budget/get-category-automations', categoryId);
      if (mounted) {
        setAutomations(result);
        onLoaded(result);
        setLoading(false);
      }
    }
    void fetchAutomations();
    return () => {
      mounted = false;
    };
  }, [categoryId, onLoaded]);

  return { automations, loading };
}
