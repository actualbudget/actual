import { useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { View } from '@actual-app/components/view';

import type {
  CategoryEntity,
  CategoryGroupEntity,
} from 'loot-core/types/models';
import type { PercentageTemplate } from 'loot-core/types/models/templates';

import { CategoryAutocomplete } from '@desktop-client/components/autocomplete/CategoryAutocomplete';
import { updateTemplate } from '@desktop-client/components/budget/goals/actions';
import type { Action } from '@desktop-client/components/budget/goals/actions';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { PercentInput } from '@desktop-client/components/util/PercentInput';

type PercentageAutomationProps = {
  dispatch: (action: Action) => void;
  template: PercentageTemplate;
  categories: CategoryGroupEntity[];
};

export const PercentageAutomation = ({
  dispatch,
  template,
  categories,
}: PercentageAutomationProps) => {
  const { t } = useTranslation();

  return (
    <>
      <SpaceBetween gap={50} style={{ marginTop: 10 }}>
        <FormField style={{ flex: 1 }}>
          <FormLabel title={t('Category')} htmlFor="category-field" />
          <CategoryAutocomplete
            inputProps={{ id: 'category-field' }}
            onSelect={(category: CategoryEntity['id']) =>
              dispatch(updateTemplate({ type: 'percentage', category }))
            }
            value={template.category}
            categoryGroups={
              template.previous
                ? categories.map(group => ({
                    ...group,
                    categories: group.categories?.filter(
                      category => category.id !== 'to-budget',
                    ),
                  }))
                : categories
            }
          />
        </FormField>
        <FormField style={{ flex: 1 }}>
          <FormLabel title={t('Percentage')} htmlFor="percent-field" />
          <PercentInput
            id="percent-field"
            key="percent-input"
            value={template.percent}
            onUpdatePercent={(percent: number) =>
              dispatch(
                updateTemplate({
                  type: 'percentage',
                  percent,
                }),
              )
            }
          />
        </FormField>
      </SpaceBetween>
      <SpaceBetween gap={50}>
        <FormField style={{ flex: 1 }}>
          <FormLabel title={t('Percentage of')} htmlFor="previous-field" />
          <Select
            id="previous-field"
            key="previous-month"
            options={[
              [false, t('This month')],
              [true, t('Last month')],
            ]}
            value={template.previous}
            onChange={previous => {
              if (template.type !== 'percentage') {
                return;
              }
              return dispatch(
                updateTemplate({
                  type: 'percentage',
                  previous,
                  ...(previous && template.category === 'to-budget'
                    ? { category: '' }
                    : {}),
                }),
              );
            }}
          />
        </FormField>
        <View style={{ flex: 1 }} />
      </SpaceBetween>
    </>
  );
};
