import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useCategories } from '@desktop-client/hooks/useCategories';

export function useBudgetAutomationCategories() {
  const { t } = useTranslation();
  const { grouped } = useCategories();
  const categories = useMemo(() => {
    const incomeGroup = grouped.filter(group => group.name === 'Income')[0];
    return [
      {
        id: '',
        name: t('Special categories'),
        categories: [
          { id: 'total', group: '', name: t('Total of all income') },
          {
            id: 'to-budget',
            group: '',
            name: t('Available funds to budget'),
          },
        ],
      },
      { ...incomeGroup, name: t('Income categories') },
    ];
  }, [grouped, t]);

  return categories;
}
