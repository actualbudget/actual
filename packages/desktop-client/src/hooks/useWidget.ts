import { useMemo } from 'react';

import { useQuery } from 'loot-core/client/query-hooks';
import { q } from 'loot-core/shared/query';
import { type Widget } from 'loot-core/types/models';

export function useWidget<W extends Widget>(id: W['id'], type: W['type']) {
  const { data = [], isLoading } = useQuery<W>(
    () => q('dashboard').filter({ id, type }).select('*'),
    [id, type],
  );

  return useMemo(
    () => ({
      isLoading,
      data: data?.[0],
    }),
    [data, isLoading],
  );
}
