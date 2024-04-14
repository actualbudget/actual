import { useMemo } from 'react';

import { useLiveQuery } from 'loot-core/client/query-hooks';
import { NoteEntity } from 'loot-core/types/models';
import { q } from 'loot-core/shared/query';

export function useNotes(id: string) {
  const data = useLiveQuery<NoteEntity[]>(
    () => q('notes').filter({ id }).select('*'),
    [id],
  );
  return useMemo(() => data && data.length > 0 ? data[0].note : null, [data]);
}
