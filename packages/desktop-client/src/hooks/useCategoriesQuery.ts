import { useTranslation } from 'react-i18next';

import { useQuery } from '@tanstack/react-query';

import { categoryQueries } from '@desktop-client/budget';

export function useCategoriesQuery() {
  const { t } = useTranslation();
  return useQuery(categoryQueries.list({ t }));
}
