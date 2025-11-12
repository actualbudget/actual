import { useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { SvgAdd, SvgEditPencil, SvgPencilWrite } from '@actual-app/components/icons/v1';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type CategoryEntity } from 'loot-core/types/models';

import {
  useDraggable,
  useDroppable,
  DropHighlight,
  type OnDragChangeCallback,
  type OnDropCallback,
  type DragState,
} from '@desktop-client/components/sort';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useDragRef } from '@desktop-client/hooks/useDragRef';
import { useSyncedPrefJson } from '@desktop-client/hooks/useSyncedPrefJson';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

type BudgetView = {
  id: string;
  name: string;
};

type BudgetViewItemProps = {
  view: BudgetView;
  categoryCount: number;
  dragState: DragState<BudgetView> | null;
  onDragChange: OnDragChangeCallback<BudgetView>;
  onReorder: OnDropCallback;
  onRename: (viewId: string) => void;
  onEdit: (viewId: string) => void;
  onDelete: (viewId: string) => void;
  t: (key: string) => string;
};

function BudgetViewItem({
  view,
  categoryCount,
  dragState,
  onDragChange,
  onReorder,
  onRename,
  onEdit,
  onDelete,
  t,
}: BudgetViewItemProps) {
  const dragging = dragState && dragState.item?.id === view.id;
  const { dragRef } = useDraggable({
    type: 'budget-view',
    onDragChange,
    item: view,
    canDrag: true,
  });
  const handleDragRef = useDragRef(dragRef);

  const { dropRef, dropPos } = useDroppable({
    types: 'budget-view',
    id: view.id,
    onDrop: onReorder,
  });

  return (
    <View
      innerRef={dropRef}
      style={{
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: theme.tableBackground,
        borderRadius: 4,
        border: `1px solid ${theme.tableBorder}`,
        flexShrink: 0,
        opacity: dragging && !dragState.preview ? 0.3 : 1,
      }}
    >
      {dropPos && <DropHighlight pos={dropPos} offset={{ top: 1 }} />}
      <View style={{ flex: 1 }} innerRef={handleDragRef}>
        <Text style={{ fontWeight: 500, marginBottom: 4 }}>{view.name}</Text>
        <Text style={{ fontSize: 12, color: theme.pageTextLight }}>
          <Trans count={categoryCount}>
            {{ count: categoryCount }} categories
          </Trans>
        </Text>
      </View>
      <SpaceBetween direction="horizontal" gap={2}>
        <Button
          variant="bare"
          onPress={() => onRename(view.id)}
          aria-label={t('Rename')}
        >
          <SvgPencilWrite width={14} height={14} />
        </Button>
        <Button
          variant="bare"
          onPress={() => onEdit(view.id)}
          aria-label={t('Edit categories')}
        >
          <SvgEditPencil width={14} height={14} />
        </Button>
        <Button
          variant="bare"
          onPress={() => onDelete(view.id)}
          aria-label={t('Delete')}
        >
          <SvgDelete width={14} height={14} />
        </Button>
      </SpaceBetween>
    </View>
  );
}

export function BudgetViews() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { list: categories, grouped: categoryGroups = [] } = useCategories();
  const [budgetViewMap = {}, setBudgetViewMapPref] = useSyncedPrefJson<
    'budget.budgetViewMap',
    Record<string, string[]>
  >('budget.budgetViewMap', {});
  const [customViews = [], setCustomViews] = useSyncedPrefJson<
    'budget.customBudgetViews',
    Array<{ id: string; name: string }>
  >('budget.customBudgetViews', []);
  const [dragState, setDragState] = useState<DragState<BudgetView> | null>(
    null,
  );

  // Get all unique views from custom views
  const views = useMemo(() => {
    // Include all custom views
    const allCustomViews = Array.isArray(customViews) ? customViews : [];

    // Remove duplicates by ID
    const seen = new Set<string>();
    return allCustomViews.filter(view => {
      if (seen.has(view.id)) {
        return false;
      }
      seen.add(view.id);
      return true;
    });
  }, [customViews]);

  const handleAdd = useCallback(() => {
    const name = prompt(t('Enter budget view name:'));
    if (name && name.trim()) {
      const id = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      // Check if ID already exists
      const existingCustom = Array.isArray(customViews) ? customViews : [];

      if (existingCustom.find((v: BudgetView) => v.id === id)) {
        alert(t('A budget view with this name already exists.'));
        return;
      }

      const newView: BudgetView = { id, name: name.trim() };
      setCustomViews([...existingCustom, newView]);
    }
  }, [customViews, setCustomViews, t]);

  const handleDelete = useCallback(
    (viewId: string) => {
      const view = views.find(v => v.id === viewId);
      if (!view) {
        return;
      }

      if (
        !window.confirm(
          t('Delete budget view “{{name}}”?', {
            name: view.name,
          }),
        )
      ) {
        return;
      }

      // Remove from all categories
      const newMap = budgetViewMap ? { ...budgetViewMap } : {};
      Object.keys(newMap).forEach(categoryId => {
        const viewIds = newMap[categoryId];
        if (Array.isArray(viewIds)) {
          newMap[categoryId] = viewIds.filter(id => id !== viewId);
          if (newMap[categoryId].length === 0) {
            delete newMap[categoryId];
          }
        }
      });
      setBudgetViewMapPref(newMap);

      // Remove from custom views
      if (Array.isArray(customViews)) {
        setCustomViews(customViews.filter((v: BudgetView) => v.id !== viewId));
      }
    },
    [
      budgetViewMap,
      customViews,
      views,
      setBudgetViewMapPref,
      setCustomViews,
      t,
    ],
  );

  const handleRename = useCallback(
    (viewId: string) => {
      const view = views.find(v => v.id === viewId);
      if (!view) return;

      const newName = prompt(t('Rename budget view:'), view.name);
      if (newName && newName.trim() && newName.trim() !== view.name) {
        const trimmedName = newName.trim();

        // Check if name already exists
        const existingCustom = Array.isArray(customViews) ? customViews : [];
        const nameExists = existingCustom.some(
          (v: BudgetView) =>
            v.id !== viewId &&
            v.name.toLowerCase() === trimmedName.toLowerCase(),
        );

        if (nameExists) {
          alert(t('A budget view with this name already exists.'));
          return;
        }

        // Update the view name
        const updatedViews = existingCustom.map((v: BudgetView) =>
          v.id === viewId ? { ...v, name: trimmedName } : v,
        );
        setCustomViews(updatedViews);
      }
    },
    [customViews, setCustomViews, t, views],
  );

  const handleEdit = useCallback(
    (viewId: string) => {
      const view = views.find(v => v.id === viewId);
      if (!view) return;

      // Get categories currently assigned to this view
      const assignedCategoryIds = new Set<string>();
      Object.entries(budgetViewMap).forEach(([categoryId, viewIds]) => {
        if (viewIds.includes(viewId)) {
          assignedCategoryIds.add(categoryId);
        }
      });

      dispatch(
        pushModal({
          modal: {
            name: 'edit-budget-view',
            options: {
              viewId,
              viewName: view.name,
              assignedCategoryIds: Array.from(assignedCategoryIds),
              allCategories: categories,
            },
          },
        }),
      );
    },
    [budgetViewMap, categories, dispatch, views],
  );

  const getCategoryCount = useCallback(
    (viewId: string) => {
      return Object.values(budgetViewMap).filter(viewIds =>
        viewIds.includes(viewId),
      ).length;
    },
    [budgetViewMap],
  );

  const onDragChange: OnDragChangeCallback<BudgetView> = useCallback(
    newDragState => {
      const { state } = newDragState;
      if (state === 'start-preview' || state === 'start') {
        setDragState({
          type: newDragState.type,
          item: newDragState.item,
          state: newDragState.state,
          preview: state === 'start-preview',
        });
      } else if (state === 'end') {
        setDragState(null);
      }
    },
    [],
  );

  const onReorder: OnDropCallback = useCallback(
    (id: string, dropPos: 'top' | 'bottom', targetId: unknown) => {
      // Narrow targetId because the OnDropCallback uses unknown for safety
      if (typeof targetId !== 'string') {
        return;
      }

      const viewToMove = views.find(v => v.id === id);
      const targetView = views.find(v => v.id === targetId);

      if (!viewToMove || !targetView) {
        return;
      }

      const currentIndex = views.findIndex(v => v.id === id);
      const targetIndex = views.findIndex(v => v.id === targetId);

      // Don't do anything if dropping on itself
      if (currentIndex === targetIndex) {
        return;
      }

      // Calculate new index based on drop position
      let newIndex: number;
      if (dropPos === 'top') {
        newIndex = targetIndex;
      } else {
        newIndex = targetIndex + 1;
      }

      // Adjust if moving from before the target
      if (currentIndex < newIndex) {
        newIndex -= 1;
      }

      // Create new array with reordered views
      const newViews = [...views];
      newViews.splice(currentIndex, 1);
      newViews.splice(newIndex, 0, viewToMove);

      setCustomViews(newViews);
    },
    [views, setCustomViews],
  );

  return (
    <View
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexShrink: 0,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: 600 }}>
          <Trans>Manage Budget Views</Trans>
        </Text>
        <Button onPress={handleAdd}>
          <SvgAdd width={15} height={15} style={{ marginRight: 5 }} />
          <Trans>Add</Trans>
        </Button>
      </View>

      <View
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {views.length > 0 ? (
          <View style={{ gap: 8, paddingBottom: 8 }}>
            {views.map(view => (
              <BudgetViewItem
                key={view.id}
                view={view}
                categoryCount={getCategoryCount(view.id)}
                dragState={dragState}
                onDragChange={onDragChange}
                onReorder={onReorder}
                onRename={handleRename}
                onEdit={handleEdit}
                onDelete={handleDelete}
                t={t}
              />
            ))}
          </View>
        ) : (
          <View
            style={{
              background: theme.tableBackground,
              padding: 40,
              textAlign: 'center',
            }}
          >
            <Text style={{ fontStyle: 'italic', color: theme.pageTextLight }}>
              <Trans>No Budget Views</Trans>
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
