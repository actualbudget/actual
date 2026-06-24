import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import { Select } from '@actual-app/components/select';
import type { SelectOption } from '@actual-app/components/select';
import { theme } from '@actual-app/components/theme';

import { useCategories } from '#hooks/useCategories';
import { useSyncedPref } from '#hooks/useSyncedPref';

type AutomationCategorySelectProps = {
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
  style?: CSSProperties;
};

export function AutomationCategorySelect({
  categoryId,
  onCategoryChange,
  style,
}: AutomationCategorySelectProps) {
  const { t } = useTranslation();
  const { data: categoriesData } = useCategories();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

  const options = useMemo(() => {
    const result: SelectOption[] = [];
    for (const group of categoriesData?.grouped ?? []) {
      const categories = (group.categories ?? []).filter(category => {
        if (category.is_income && budgetType !== 'tracking') {
          return false;
        }
        return true;
      });
      if (categories.length === 0) {
        continue;
      }
      if (result.length > 0) {
        result.push(Menu.line);
      }
      for (const category of categories) {
        result.push([category.id, category.name]);
      }
    }
    return result;
  }, [budgetType, categoriesData?.grouped]);

  return (
    <Select
      bare
      value={categoryId}
      options={options}
      defaultLabel={t('Select a category')}
      onChange={onCategoryChange}
      style={{
        fontSize: 20,
        fontWeight: 600,
        color: theme.pageText,
        padding: 0,
        height: 'auto',
        minHeight: 0,
        ...style,
      }}
      popoverStyle={{ maxHeight: 320, overflowY: 'auto' }}
    />
  );
}
