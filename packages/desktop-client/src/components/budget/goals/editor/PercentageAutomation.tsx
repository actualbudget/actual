import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { View } from '@actual-app/components/view';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';
import type { PercentageTemplate } from '@actual-app/core/types/models/templates';

import { CategoryAutocomplete } from '#components/autocomplete/CategoryAutocomplete';
import { updateTemplate } from '#components/budget/goals/actions';
import type { Action } from '#components/budget/goals/actions';
import {
  DESKTOP_FIELD_GAP,
  MOBILE_FIELD_GAP,
  STACKED_FIELD_FLEX,
} from '#components/budget/goals/editor/fieldLayout';
import { FormField, FormLabel } from '#components/forms';
import { TapField } from '#components/mobile/MobileForms';
import { PercentInput } from '#components/util/PercentInput';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

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
  const reduxDispatch = useDispatch();
  const { isNarrowWidth } = useResponsive();
  const fieldFlex = isNarrowWidth ? STACKED_FIELD_FLEX : 1;

  const categoryGroups = template.previous
    ? categories.map(group => ({
        ...group,
        categories: group.categories?.filter(
          category => category.id !== 'available funds',
        ),
      }))
    : categories;

  const selectedCategoryName =
    categoryGroups
      .flatMap(group => group.categories ?? [])
      .find(category => category.id === template.category)?.name ??
    template.category ??
    '';

  return (
    <>
      <SpaceBetween
        gap={isNarrowWidth ? MOBILE_FIELD_GAP : DESKTOP_FIELD_GAP}
        style={{ marginTop: 10 }}
      >
        <FormField style={{ flex: fieldFlex }}>
          <FormLabel title={t('Category')} htmlFor="category-field" />
          {isNarrowWidth ? (
            <TapField
              id="category-field"
              value={selectedCategoryName}
              placeholder={t('Select a category')}
              style={{
                marginLeft: 0,
                marginRight: 0,
                boxSizing: 'border-box',
              }}
              onPress={() =>
                reduxDispatch(
                  pushModal({
                    modal: {
                      name: 'category-autocomplete',
                      options: {
                        categoryGroups,
                        showHiddenCategories: false,
                        onSelect: (id: string | null) =>
                          dispatch(
                            updateTemplate({
                              type: 'percentage',
                              category: id ?? '',
                            }),
                          ),
                      },
                    },
                  }),
                )
              }
            />
          ) : (
            <CategoryAutocomplete
              inputProps={{ id: 'category-field' }}
              onSelect={(category: CategoryEntity['id']) =>
                dispatch(updateTemplate({ type: 'percentage', category }))
              }
              value={template.category}
              categoryGroups={categoryGroups}
            />
          )}
        </FormField>
        <FormField style={{ flex: fieldFlex }}>
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
      <SpaceBetween
        gap={isNarrowWidth ? MOBILE_FIELD_GAP : DESKTOP_FIELD_GAP}
        style={{ marginTop: 10 }}
      >
        <FormField style={{ flex: fieldFlex }}>
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
                  ...(previous && template.category === 'available funds'
                    ? { category: '' }
                    : {}),
                }),
              );
            }}
          />
        </FormField>
        {!isNarrowWidth && <View style={{ flex: 1 }} />}
      </SpaceBetween>
    </>
  );
};
