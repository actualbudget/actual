import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useCategories } from '#hooks/useCategories';

export function useBudgetAutomationCategories() {
  const { t } = useTranslation();
  const { data: { grouped } = { grouped: [] } } = useCategories();
  const categories = useMemo(() => {
    const incomeGroups = grouped.filter(group => group.is_income);
    return [
      {
        id: '',
        name: t('Special categories'),
        categories: [
          { id: 'all income', group: '', name: t('Total of all income') },
          {
            id: 'available funds',
            group: '',
            name: t('Available funds to budget'),
          },
        ],
      },
      ...incomeGroups.map(group => ({
        ...group,
        name: t('Income categories'),
      })),
    ];
  }, [grouped, t]);

  return categories;
}
