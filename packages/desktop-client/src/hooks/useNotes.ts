import { useMemo } from 'react';

import { q } from 'loot-core-shared/query';
import { type NoteEntity } from 'loot-core-shared/types/models';

import { useQuery } from 'loot-core/client/query-hooks';

export function useNotes(id: string) {
  const { data } = useQuery<NoteEntity>(
    () => q('notes').filter({ id }).select('*'),
    [id],
  );
  return useMemo(() => (data && data.length > 0 ? data[0].note : null), [data]);
}
