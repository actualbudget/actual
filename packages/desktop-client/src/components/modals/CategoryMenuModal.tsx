import { useTranslation } from 'react-i18next';

import * as monthUtils from '@actual-app/core/shared/months';

import { useOpenBaseSlot } from '#components/budget/pocketDisplay';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetDeleteConfirm } from '#components/mobile/MobileSheetDeleteConfirm';
import { MobileSheetNotes } from '#components/mobile/MobileSheetNotes';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useBaseSlotRepairs } from '#hooks/useBaseSlotRepairs';
import { useCategories } from '#hooks/useCategories';
import { useCategory } from '#hooks/useCategory';
import { useCategoryGroup } from '#hooks/useCategoryGroup';
import { useDeleteCategoryFlow } from '#hooks/useDeleteCategoryFlow';
import { useMulticurrencyAvailable } from '#hooks/useMulticurrencyAvailable';
import { useNotes } from '#hooks/useNotes';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type CategoryMenuModalProps = Extract<
  ModalType,
  { name: 'category-menu' }
>['options'];

export function CategoryMenuModal({
  categoryId,
  onSave,
  onEditNotes,
  onDelete,
  onEditAutomations,
  onClose,
}: CategoryMenuModalProps) {
  const { t } = useTranslation();
  const { data: category } = useCategory(categoryId);
  const { data: categoryGroup } = useCategoryGroup(category?.group);
  const {
    data: { grouped: categoryGroups, list: categories } = {
      grouped: [],
      list: [],
    },
  } = useCategories();
  const notes = useNotes(categoryId);
  const dispatch = useDispatch();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const multicurrencyAvailable = useMulticurrencyAvailable();
  // Categories with retired, duplicate or later-generation base lanes.
  const repairable = useBaseSlotRepairs();
  const openBaseSlot = useOpenBaseSlot();
  const deleteFlow = useDeleteCategoryFlow({
    categoryIds: [categoryId],
    onDelete: transferCategoryId => onDelete(categoryId, transferCategoryId),
  });

  if (!category) {
    return null;
  }

  const isIncome = Boolean(category.is_income);
  const transferGroups = categoryGroups
    .filter(group => Boolean(group.is_income) === isIncome)
    .map(group => ({
      ...group,
      categories: (group.categories ?? []).filter(c => c.id !== categoryId),
    }));
  const transferName = categories.find(
    c => c.id === deleteFlow.transferId,
  )?.name;

  return (
    <MobileSheet
      name="category-menu"
      title={category.name}
      onTitleUpdate={newName => {
        onSave({ ...category, name: newName });
        return undefined;
      }}
      onClose={onClose}
    >
      {({ editTitle, isEditingTitle }) =>
        deleteFlow.step ? (
          <MobileSheetDeleteConfirm
            flow={deleteFlow}
            category={category}
            transferGroups={transferGroups}
            transferName={transferName}
          />
        ) : (
          <>
            {notes && <MobileSheetNotes notes={notes} />}

            <MobileSheetSection>
              {!isEditingTitle && (
                <MobileSheetRow label={t('Rename')} onPress={editTitle} />
              )}
              <MobileSheetRow
                label={t('Edit notes')}
                onPress={() => onEditNotes(category.id)}
              />
              {multicurrencyAvailable &&
                budgetType === 'envelope' &&
                !isIncome && (
                  <MobileSheetRow
                    label={t('Add currency')}
                    onPress={() =>
                      dispatch(
                        pushModal({
                          modal: {
                            name: 'add-currency',
                            options: {
                              categoryId: category.id,
                              categoryName: category.name,
                            },
                          },
                        }),
                      )
                    }
                  />
                )}
              {multicurrencyAvailable &&
                budgetType === 'envelope' &&
                !isIncome &&
                repairable.has(category.id) && (
                  <MobileSheetRow
                    label={t('Base budget lanes')}
                    onPress={() =>
                      openBaseSlot(category.id, monthUtils.currentMonth())
                    }
                  />
                )}
              {onEditAutomations && (
                <MobileSheetRow
                  label={t('Budget automations')}
                  onPress={() => onEditAutomations(category.id)}
                />
              )}
              {!categoryGroup?.hidden && (
                <MobileSheetRow
                  label={category.hidden ? t('Show') : t('Hide')}
                  onPress={() =>
                    onSave({ ...category, hidden: !category.hidden })
                  }
                />
              )}
              <MobileSheetRow
                label={t('Delete')}
                isDestructive
                onPress={() => void deleteFlow.start()}
              />
            </MobileSheetSection>
          </>
        )
      }
    </MobileSheet>
  );
}
