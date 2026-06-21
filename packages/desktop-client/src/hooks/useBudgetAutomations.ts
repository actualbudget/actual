import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { Template } from '@actual-app/core/types/models/templates';

export function useBudgetAutomations({
  categoryId,
  source,
  onLoaded,
}: {
  categoryId: string;
  source: 'notes' | 'ui';
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

      // notes based #template/#goal lines may have been edited since they were
      // last parsed into the DB. ui-managed categories own goal_def directly, so skip.
      if (source !== 'ui') {
        await send('budget/store-note-templates', [categoryId]);
      }

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
  }, [categoryId, source, onLoaded]);

  return { automations, loading };
}
