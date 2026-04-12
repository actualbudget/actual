import { useMemo } from 'react';

import { q } from '@actual-app/core/shared/query';
import type { NoteEntity } from '@actual-app/core/types/models';

import { useQuery } from './useQuery';

export function useNotes(id: string) {
  const { data } = useQuery<NoteEntity>(
    () => q('notes').filter({ id }).select('*'),
    [id],
  );
  return useMemo(() => (data && data.length > 0 ? data[0].note : null), [data]);
}
