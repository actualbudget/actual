import { useTranslation } from 'react-i18next';

import { useQuery } from '@tanstack/react-query';

import { categoryQueries } from '@desktop-client/budget';

export function useCategoryGroup(id: string) {
  const { t } = useTranslation();
  const query = useQuery({
    ...categoryQueries.list({ t }),
    select: data => data.grouped.find(g => g.id === id),
  });
  return query.data;
}
