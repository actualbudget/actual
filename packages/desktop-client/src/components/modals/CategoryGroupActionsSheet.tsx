import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';

import {
  useBudgetActions,
  useCreateCategoryMutation,
  useDeleteCategoryGroupMutation,
  useSaveCategoryGroupMutation,
  useSortCategoriesMutation,
} from '#budget';
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
import { collapseModals, pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type CategoryGroupActionsSheetProps = Extract<
  ModalType,
  { name: 'category-group-actions' }
>['options'];

const SHEET_NAME = 'category-group-actions';

export function CategoryGroupActionsSheet({
  groupId,
  month,
}: CategoryGroupActionsSheetProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { data: group } = useCategoryGroup(groupId);
  const {
    data: { grouped: categoryGroups, list: allCategories } = {
      grouped: [],
      list: [],
    },
  } = useCategories();
  const notes = useNotes(groupId);
  const goalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const applyBudgetAction = useBudgetActions();
  const createCategory = useCreateCategoryMutation();
  const saveCategoryGroup = useSaveCategoryGroupMutation();
  const deleteCategoryGroup = useDeleteCategoryGroupMutation();
  const sortCategories = useSortCategoriesMutation();
  const { showUndoNotification } = useUndo();
  const categories = group?.categories ?? [];

  const closeSheet = () => {
    dispatch(collapseModals({ rootModalName: SHEET_NAME }));
  };

  const openModal = (modal: ModalType) => {
    closeSheet();
    dispatch(pushModal({ modal }));
  };

  const deleteFlow = useDeleteCategoryFlow({
    categoryIds: categories.map(c => c.id),
    onDelete: transferCategoryId => {
      closeSheet();
      deleteCategoryGroup.mutate({
        id: groupId,
        transferId: transferCategoryId,
      });
    },
  });

  if (!group) {
    return null;
  }

  const hasMultipleCategories = categories.length > 1;
  const isIncome = Boolean(group.is_income);
  const transferGroups = categoryGroups.filter(
    g => g.id !== group.id && Boolean(g.is_income) === isIncome,
  );
  const transferName = allCategories.find(
    c => c.id === deleteFlow.transferId,
  )?.name;

  const onAddCategory = () => {
    openModal({
      name: 'new-category',
      options: {
        onValidate: name => (!name ? t('Name is required.') : null),
        onSubmit: async name => {
          createCategory.mutate(
            {
              name,
              groupId,
              isIncome,
              isHidden: false,
            },
            {
              onSettled: () => {
                dispatch(collapseModals({ rootModalName: 'new-category' }));
              },
            },
          );
        },
      },
    });
  };

  const onApplyBudgetTemplates = () => {
    applyBudgetAction.mutate({
      month,
      type: 'apply-multiple-templates',
      args: {
        categories: categories.filter(c => !c.hidden).map(c => c.id),
      },
    });
    showUndoNotification({
      message: t('{{groupName}} budget templates have been applied.', {
        groupName: group.name,
      }),
    });
    closeSheet();
  };

  const onSort = (direction: 'asc' | 'desc') => {
    sortCategories.mutate({ groupId, direction });
    closeSheet();
  };

  const onEditNotes = () => {
    openModal({
      name: 'notes',
      options: {
        id: groupId,
        name: group.name,
        onSave: (id, note) => void send('notes-save', { id, note }),
      },
    });
  };

  return (
    <MobileSheet
      name={SHEET_NAME}
      title={group.name}
      onTitleUpdate={newName => {
        saveCategoryGroup.mutate({ group: { ...group, name: newName } });
        return undefined;
      }}
    >
      {({ editTitle, isEditingTitle }) =>
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

            <MobileSheetSection title={t('Budget')}>
              {goalTemplatesEnabled && (
                <MobileSheetRow
                  label={t('Overwrite with templates')}
                  onPress={onApplyBudgetTemplates}
                />
              )}
              <MobileSheetRow
                label={t('Add category')}
                onPress={onAddCategory}
              />
            </MobileSheetSection>

            <MobileSheetSection title={t('Group')}>
              {!isEditingTitle && (
                <MobileSheetRow label={t('Rename')} onPress={editTitle} />
              )}
              <MobileSheetRow label={t('Edit notes')} onPress={onEditNotes} />
              {hasMultipleCategories && (
                <MobileSheetRow
                  label={t('Sort A to Z')}
                  onPress={() => onSort('asc')}
                />
              )}
              {hasMultipleCategories && (
                <MobileSheetRow
                  label={t('Sort Z to A')}
                  onPress={() => onSort('desc')}
                />
              )}
              {!isIncome && (
                <MobileSheetRow
                  label={group.hidden ? t('Show') : t('Hide')}
                  onPress={() =>
                    saveCategoryGroup.mutate({
                      group: { ...group, hidden: !group.hidden },
                    })
                  }
                />
              )}
              {!isIncome && (
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
