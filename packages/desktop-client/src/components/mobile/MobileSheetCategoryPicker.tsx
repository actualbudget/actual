import { useTranslation } from 'react-i18next';

import type { CategoryGroupEntity } from '@actual-app/core/types/models';

import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { MobileSheetPickerField } from './MobileSheetPickerField';

type MobileSheetCategoryPickerProps = {
  categoryGroups: CategoryGroupEntity[];
  valueName?: string;
  onSelect: (categoryId: string | null) => void;
};

export function MobileSheetCategoryPicker({
  categoryGroups,
  valueName,
  onSelect,
}: MobileSheetCategoryPickerProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  return (
    <MobileSheetPickerField
      label={t('Category')}
      placeholder={t('Select category...')}
      valueName={valueName}
      onPress={() =>
        dispatch(
          pushModal({
            modal: {
              name: 'category-autocomplete',
              options: {
                categoryGroups,
                showHiddenCategories: true,
                onSelect: categoryId => onSelect(categoryId),
              },
            },
          }),
        )
      }
    />
  );
}
