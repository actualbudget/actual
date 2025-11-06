import { useCallback, useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type CategoryEntity } from 'loot-core/types/models';

import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalCloseButton,
} from '@desktop-client/components/common/Modal';
import { Checkbox } from '@desktop-client/components/forms';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useSyncedPrefJson } from '@desktop-client/hooks/useSyncedPrefJson';
import { popModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

type EditBudgetViewModalProps = {
  viewId: string;
  viewName: string;
  assignedCategoryIds: string[];
  allCategories: CategoryEntity[];
};

export function EditBudgetViewModal({
  viewId,
  viewName,
  assignedCategoryIds: initialAssignedIds,
}: EditBudgetViewModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { grouped: categoryGroups } = useCategories();
  const [budgetViewMap = {}, setBudgetViewMapPref] = useSyncedPrefJson<
    'budget.budgetViewMap',
    Record<string, string[]>
  >('budget.budgetViewMap', {});

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    new Set(initialAssignedIds),
  );

  // Track last clicked category for shift+click functionality
  const lastClickedCategoryRef = useRef<{
    groupId: string;
    categoryIndex: number;
  } | null>(null);

  // Refs for group checkboxes to set indeterminate state
  const groupCheckboxRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Get all categories flattened with their group and index for shift+click
  const allCategoriesWithIndex = categoryGroups.flatMap(group =>
    (group.categories || []).map((category, index) => ({
      category,
      groupId: group.id,
      categoryIndex: index,
    })),
  );

  const toggleCategory = useCallback(
    (categoryId: string, event?: React.MouseEvent<HTMLElement>) => {
      const isShiftClick = event?.shiftKey || false;
      const isCtrlClick = event?.ctrlKey || event?.metaKey || false;

      setSelectedCategoryIds(prev => {
        const next = new Set(prev);
        const wasSelected = prev.has(categoryId);

        if (isShiftClick && lastClickedCategoryRef.current) {
          // Shift+Click: Select/deselect range based on last clicked category
          const currentIndex = allCategoriesWithIndex.findIndex(
            item => item.category.id === categoryId,
          );
          const lastIndex = allCategoriesWithIndex.findIndex(
            item =>
              item.groupId === lastClickedCategoryRef.current?.groupId &&
              item.categoryIndex ===
                lastClickedCategoryRef.current?.categoryIndex,
          );

          if (currentIndex !== -1 && lastIndex !== -1) {
            // Determine the range
            const start = Math.min(currentIndex, lastIndex);
            const end = Math.max(currentIndex, lastIndex);
            const range = allCategoriesWithIndex.slice(start, end + 1);

            // Determine if we're selecting or deselecting based on the last clicked state
            const lastWasSelected = prev.has(
              allCategoriesWithIndex[lastIndex].category.id,
            );

            // Select or deselect all in range
            range.forEach(item => {
              if (lastWasSelected) {
                next.add(item.category.id);
              } else {
                next.delete(item.category.id);
              }
            });
          }
        } else if (isCtrlClick) {
          // Ctrl/Cmd+Click: Toggle without affecting other selections
          if (wasSelected) {
            next.delete(categoryId);
          } else {
            next.add(categoryId);
          }
        } else {
          // Normal click: Toggle this category
          if (wasSelected) {
            next.delete(categoryId);
          } else {
            next.add(categoryId);
          }
        }

        // Update last clicked reference (only for non-Ctrl clicks)
        if (!isCtrlClick) {
          const clickedItem = allCategoriesWithIndex.find(
            item => item.category.id === categoryId,
          );
          if (clickedItem) {
            lastClickedCategoryRef.current = {
              groupId: clickedItem.groupId,
              categoryIndex: clickedItem.categoryIndex,
            };
          }
        }

        return next;
      });
    },
    [allCategoriesWithIndex],
  );

  const toggleGroup = useCallback(
    (groupId: string) => {
      const group = categoryGroups.find(g => g.id === groupId);
      if (!group?.categories) return;

      setSelectedCategoryIds(prev => {
        const next = new Set(prev);
        const groupCategoryIds = group.categories?.map(cat => cat.id) || [];
        const allSelected = groupCategoryIds.every(id => prev.has(id));

        if (allSelected) {
          // Deselect all categories in the group
          groupCategoryIds.forEach(id => next.delete(id));
        } else {
          // Select all categories in the group
          groupCategoryIds.forEach(id => next.add(id));
        }

        return next;
      });
    },
    [categoryGroups],
  );

  // Helper functions to compute group selection state (computed on each render for reactivity)
  const isGroupSelected = (groupId: string) => {
    const group = categoryGroups.find(g => g.id === groupId);
    if (!group?.categories || group.categories.length === 0) return false;
    const groupCategoryIds = group.categories.map(cat => cat.id);
    return (
      groupCategoryIds.length > 0 &&
      groupCategoryIds.every(id => selectedCategoryIds.has(id))
    );
  };

  const isGroupIndeterminate = (groupId: string) => {
    const group = categoryGroups.find(g => g.id === groupId);
    if (!group?.categories || group.categories.length === 0) return false;
    const selectedCount = group.categories.filter(cat =>
      selectedCategoryIds.has(cat.id),
    ).length;
    return selectedCount > 0 && selectedCount < group.categories.length;
  };

  // Update indeterminate state for all group checkboxes
  useEffect(() => {
    categoryGroups.forEach(group => {
      const checkbox = groupCheckboxRefs.current[group.id];
      if (checkbox) {
        checkbox.indeterminate = isGroupIndeterminate(group.id);
      }
    });
  }, [categoryGroups, selectedCategoryIds]);

  const handleSave = useCallback(() => {
    const newMap = budgetViewMap ? { ...budgetViewMap } : {};

    // Remove view from all categories first
    Object.keys(newMap).forEach(categoryId => {
      const viewIds = newMap[categoryId];
      if (Array.isArray(viewIds)) {
        newMap[categoryId] = viewIds.filter(id => id !== viewId);
        if (newMap[categoryId].length === 0) {
          delete newMap[categoryId];
        }
      }
    });

    // Add view to selected categories
    selectedCategoryIds.forEach(categoryId => {
      if (!newMap[categoryId]) {
        newMap[categoryId] = [];
      }
      if (!newMap[categoryId].includes(viewId)) {
        newMap[categoryId].push(viewId);
      }
    });

    setBudgetViewMapPref(newMap);
    dispatch(popModal());
  }, [
    budgetViewMap,
    dispatch,
    viewId,
    selectedCategoryIds,
    setBudgetViewMapPref,
  ]);

  const handleCancel = useCallback(() => {
    dispatch(popModal());
  }, [dispatch]);

  return (
    <Modal
      name="edit-budget-view"
      containerProps={{
        style: {
          maxWidth: '800px',
          width: '90vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={
              <ModalTitle
                title={t('Edit Budget View: {{name}}', { name: viewName })}
                shrinkOnOverflow
              />
            }
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              padding: '0 20px',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Text
              style={{
                marginBottom: 16,
                marginTop: 8,
                color: theme.pageTextLight,
                flexShrink: 0,
              }}
            >
              <Trans>Select categories to include in this view:</Trans>
            </Text>

            <View
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                paddingRight: 8,
              }}
            >
              <View style={{ gap: 20, paddingBottom: 8 }}>
                {categoryGroups.map(group => {
                  return (
                    <View key={group.id} style={{ flexShrink: 0 }}>
                      <label
                        key={`group-${group.id}-${Array.from(selectedCategoryIds).length}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          marginBottom: 10,
                          flexShrink: 0,
                        }}
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleGroup(group.id);
                        }}
                      >
                        <Checkbox
                          ref={el => {
                            groupCheckboxRefs.current[group.id] = el;
                          }}
                          checked={isGroupSelected(group.id)}
                          onChange={() => {
                            // Controlled by label onClick
                          }}
                          style={{ flexShrink: 0, marginRight: 8 }}
                        />
                        <Text
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: theme.pageText,
                            flexShrink: 0,
                          }}
                        >
                          {group.name}
                        </Text>
                      </label>
                      <View style={{ paddingLeft: 20, gap: 6 }}>
                        {group.categories?.map(category => (
                          <label
                            key={category.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              cursor: 'pointer',
                              padding: '6px 0',
                              minHeight: 28,
                              width: '100%',
                              flexShrink: 0,
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              toggleCategory(category.id, e);
                            }}
                          >
                            <Checkbox
                              checked={selectedCategoryIds.has(category.id)}
                              onChange={() => {
                                // Controlled by label onClick
                              }}
                              style={{ flexShrink: 0, marginTop: 2 }}
                            />
                            <Text
                              style={{
                                marginLeft: 8,
                                fontSize: 13,
                                lineHeight: '20px',
                                flex: 1,
                                wordWrap: 'break-word',
                                overflowWrap: 'break-word',
                                whiteSpace: 'normal',
                                minWidth: 0,
                              }}
                            >
                              {category.name}
                            </Text>
                          </label>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          <View
            style={{
              flexShrink: 0,
              borderTop: `1px solid ${theme.tableBorder}`,
              padding: '16px 20px',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <Button variant="bare" onPress={handleCancel}>
                <Trans>Cancel</Trans>
              </Button>
              <Button onPress={handleSave}>
                <Trans>Save</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
