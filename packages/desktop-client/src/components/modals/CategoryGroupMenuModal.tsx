import { useTranslation } from 'react-i18next';

import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetDeleteConfirm } from '#components/mobile/MobileSheetDeleteConfirm';
import { MobileSheetNotes } from '#components/mobile/MobileSheetNotes';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useCategories } from '#hooks/useCategories';
import { useCategoryGroup } from '#hooks/useCategoryGroup';
import { useDeleteCategoryFlow } from '#hooks/useDeleteCategoryFlow';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useNotes } from '#hooks/useNotes';
import { useUndo } from '#hooks/useUndo';
import type { Modal as ModalType } from '#modals/modalsSlice';

type CategoryGroupMenuModalProps = Extract<
  ModalType,
  { name: 'category-group-menu' }
>['options'];

export function CategoryGroupMenuModal({
  groupId,
  onSave,
  onAddCategory,
  onEditNotes,
  onDelete,
  onClose,
  onApplyBudgetTemplatesInGroup,
  onSortCategories,
}: CategoryGroupMenuModalProps) {
  const { t } = useTranslation();
  const { data: group } = useCategoryGroup(groupId);
  const {
    data: { grouped: categoryGroups, list: allCategories } = {
      grouped: [],
      list: [],
    },
  } = useCategories();
  const notes = useNotes(groupId);
  const { showUndoNotification } = useUndo();
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const categories = group?.categories ?? [];
  const deleteFlow = useDeleteCategoryFlow({
    categoryIds: categories.map(c => c.id),
    onDelete: transferCategoryId => onDelete(groupId, transferCategoryId),
  });

  if (!group) {
    return null;
  }

  const hasMultipleCategories = categories.length > 1;
  const hasBudgetSection = isGoalTemplatesEnabled || hasMultipleCategories;
  const isIncome = Boolean(group.is_income);
  const transferGroups = categoryGroups.filter(
    g => g.id !== group.id && Boolean(g.is_income) === isIncome,
  );
  const transferName = allCategories.find(
    c => c.id === deleteFlow.transferId,
  )?.name;

  return (
    <MobileSheet
      name="category-group-menu"
      title={group.name}
      onTitleUpdate={newName => {
        onSave({ ...group, name: newName });
        return undefined;
      }}
      onClose={onClose}
    >
      {({ close, editTitle, isEditingTitle }) =>
        deleteFlow.step ? (
          <MobileSheetDeleteConfirm
            flow={deleteFlow}
            group={group}
            transferGroups={transferGroups}
            transferName={transferName}
          />
        ) : (
          <>
            {notes && <MobileSheetNotes notes={notes} />}

            {hasBudgetSection && (
              <MobileSheetSection title={t('Budget')}>
                {isGoalTemplatesEnabled && (
                  <MobileSheetRow
                    label={t('Overwrite with templates')}
                    onPress={() => {
                      onApplyBudgetTemplatesInGroup?.(
                        categories.filter(c => !c.hidden).map(c => c.id),
                      );
                      close();
                      showUndoNotification({
                        message: t('budget templates have been applied.'),
                      });
                    }}
                  />
                )}
                {hasMultipleCategories && (
                  <MobileSheetRow
                    label={t('Sort A to Z')}
                    onPress={() => {
                      onSortCategories?.(group.id, 'asc');
                      close();
                    }}
                  />
                )}
                {hasMultipleCategories && (
                  <MobileSheetRow
                    label={t('Sort Z to A')}
                    onPress={() => {
                      onSortCategories?.(group.id, 'desc');
                      close();
                    }}
                  />
                )}
              </MobileSheetSection>
            )}

            <MobileSheetSection
              title={hasBudgetSection ? t('Group') : undefined}
            >
              {!isEditingTitle && (
                <MobileSheetRow label={t('Rename')} onPress={editTitle} />
              )}
              <MobileSheetRow
                label={t('Add category')}
                onPress={() => onAddCategory(group.id, group.is_income)}
              />
              <MobileSheetRow
                label={t('Edit notes')}
                onPress={() => onEditNotes(group.id)}
              />
              {!group.is_income && (
                <MobileSheetRow
                  label={group.hidden ? t('Show') : t('Hide')}
                  onPress={() => onSave({ ...group, hidden: !group.hidden })}
                />
              )}
              {!group.is_income && (
                <MobileSheetRow
                  label={t('Delete')}
                  isDestructive
                  onPress={() => void deleteFlow.start()}
                />
              )}
            </MobileSheetSection>
          </>
        )
      }
    </MobileSheet>
  );
}
