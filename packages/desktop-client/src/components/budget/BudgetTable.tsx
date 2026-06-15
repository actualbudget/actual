import React, { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';

import type { DropPosition } from '#components/sort';
import { SchedulesProvider } from '#hooks/useCachedSchedules';
import { useCategories } from '#hooks/useCategories';
import { useFocusedViewFilter } from '#hooks/useFocusedViewFilter';
import { useFocusedViews } from '#hooks/useFocusedViews';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useLocalPref } from '#hooks/useLocalPref';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { BudgetCategories } from './BudgetCategories';
import { BudgetSummaries } from './BudgetSummaries';
import { BudgetTotals } from './BudgetTotals';
import { FilteredCategoriesContext } from './FilteredCategoriesContext';
import { FocusedViewBanner } from './FocusedViewBanner';
import { FocusedViewEditor } from './FocusedViewEditor';
import { FocusedViewsBar } from './FocusedViewsBar';
import { getValidMonthBounds, MonthsProvider } from './MonthsContext';
import type { MonthBounds } from './MonthsContext';
import {
  findSortDown,
  findSortUp,
  getScrollbarWidth,
  separateGroups,
} from './util';

type BudgetTableProps = {
  type: string;
  /** Measured x-offset from MonthPicker root to the first month label, in px. */
  firstMonthOffset?: number;
  monthPickerLayout?: { calendarOffset: number; width: number } | null;
  prewarmStartMonth: string;
  startMonth: string;
  numMonths: number;
  monthBounds: MonthBounds;
  onSaveCategory: (category: CategoryEntity) => void;
  onDeleteCategory: (id: CategoryEntity['id']) => void;
  onSaveGroup: (group: CategoryGroupEntity) => void;
  onDeleteGroup: (id: CategoryGroupEntity['id']) => void;
  onApplyBudgetTemplatesInGroup: (
    categoryIds: Array<CategoryEntity['id']>,
  ) => void;
  onSortCategories?: (
    groupId: CategoryGroupEntity['id'],
    direction: 'asc' | 'desc',
  ) => void;
  onReorderCategory: (params: {
    id: CategoryEntity['id'];
    groupId: CategoryGroupEntity['id'];
    targetId: CategoryEntity['id'] | null;
  }) => void;
  onReorderGroup: (params: {
    id: CategoryGroupEntity['id'];
    targetId: CategoryEntity['id'] | null;
  }) => void;
  onShowActivity: (id: CategoryEntity['id'], month?: string) => void;
  onBudgetAction: (month: string, type: string, args: unknown) => void;
};

export function BudgetTable(props: BudgetTableProps) {
  const dispatch = useDispatch();
  const {
    type,
    firstMonthOffset = 0,
    monthPickerLayout,
    prewarmStartMonth,
    startMonth,
    numMonths,
    monthBounds,
    onSaveCategory,
    onDeleteCategory,
    onSaveGroup,
    onDeleteGroup,
    onApplyBudgetTemplatesInGroup,
    onSortCategories,
    onReorderCategory,
    onReorderGroup,
    onShowActivity,
    onBudgetAction,
  } = props;

  const { data: { grouped: categoryGroups = [] } = { grouped: [] } } =
    useCategories();

  const {
    views,
    activeViewId,
    isCollapsed,
    viewOrder,
    hiddenViews,
    showHiddenViews,
    setActiveView,
    deleteView,
    toggleViewVisibility,
    toggleShowHiddenViews,
  } = useFocusedViews();

  const endMonth = monthUtils.addMonths(startMonth, numMonths - 1);
  const bounds = getValidMonthBounds(monthBounds, startMonth, endMonth);
  const months = monthUtils.rangeInclusive(bounds.start!, bounds.end);

  const { filteredCategoryGroups, availableBuiltInViews } =
    useFocusedViewFilter(
      categoryGroups,
      months.map(month => monthUtils.sheetForMonth(month)),
    );

  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    viewId?: string;
  }>({ isOpen: false });
  const [collapsedGroupIds = [], setCollapsedGroupIdsPref] =
    useLocalPref('budget.collapsed');
  const [showHiddenCategories, setShowHiddenCategoriesPef] = useLocalPref(
    'budget.showHiddenCategories',
  );
  const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
  const categoryExpandedState = categoryExpandedStatePref ?? 0;
  const offsetMultipleMonths = numMonths === 1 ? 4 : 0;
  // firstMonthOffset is the measured real distance from the MonthPicker root's
  // left edge to the first month label. Combined with the category column width
  // (which matches the BudgetPageHeader's own marginLeft), this gives the exact
  // padding-left needed to align the tabs with the first month.
  const monthHeaderOffset =
    200 +
    100 * categoryExpandedState +
    5 -
    offsetMultipleMonths +
    firstMonthOffset;

  const monthPickerContainerLeft =
    200 + 100 * categoryExpandedState + 5 - offsetMultipleMonths;

  const [editing, setEditing] = useState<{ id: string; cell: string } | null>(
    null,
  );

  const onEditMonth = (id: string, month: string) => {
    setEditing(id ? { id, cell: month } : null);
  };

  const onEditName = (id: string) => {
    setEditing(id ? { id, cell: 'name' } : null);
  };

  const _onReorderCategory = (
    id: string,
    dropPos: DropPosition | null,
    targetId: string,
  ) => {
    // Disable reordering when a focused view is active
    if (activeViewId !== null) return;

    const isGroup = !!categoryGroups.find(g => g.id === targetId);

    if (isGroup) {
      const { targetId: groupId } = findSortUp(
        categoryGroups,
        dropPos,
        targetId,
      );
      const group = categoryGroups.find(g => g.id === groupId);

      if (group) {
        const { categories = [] } = group;
        onReorderCategory({
          id,
          groupId: group.id,
          targetId:
            categories.length === 0 || dropPos === 'top'
              ? null
              : categories[0].id,
        });
      }
    } else {
      const group = categoryGroups.find(({ categories = [] }) =>
        categories.some(cat => cat.id === targetId),
      );

      if (group) {
        onReorderCategory({
          id,
          groupId: group.id,
          ...findSortDown(group.categories || [], dropPos, targetId),
        });
      }
    }
  };

  const _onReorderGroup = (
    id: string,
    dropPos: DropPosition | null,
    targetId: string,
  ) => {
    // Disable reordering when a focused view is active
    if (activeViewId !== null) return;

    const [expenseGroups] = separateGroups(categoryGroups); // exclude Income group from sortable groups to fix off-by-one error
    onReorderGroup({
      id,
      ...findSortDown(expenseGroups, dropPos, targetId),
    });
  };

  const moveVertically = (dir: 1 | -1) => {
    const flattened = categoryGroups.reduce(
      (all, group) => {
        if (collapsedGroupIds.includes(group.id)) {
          return all.concat({ id: group.id, isGroup: true });
        }
        return all.concat([
          { id: group.id, isGroup: true },
          ...(group?.categories || []),
        ]);
      },
      [] as Array<
        { id: CategoryGroupEntity['id']; isGroup: boolean } | CategoryEntity
      >,
    );

    if (editing) {
      const idx = flattened.findIndex(item => item.id === editing.id);
      let nextIdx = idx + dir;

      while (nextIdx >= 0 && nextIdx < flattened.length) {
        const next = flattened[nextIdx];

        if ('isGroup' in next && next.isGroup) {
          nextIdx += dir;
          continue;
        } else if (
          type === 'tracking' ||
          ('is_income' in next && !next.is_income)
        ) {
          onEditMonth(next.id, editing.cell);
          return;
        } else {
          break;
        }
      }
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!editing) {
      return null;
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      moveVertically(e.shiftKey ? -1 : 1);
    }
  };

  const onCollapse = (collapsedIds: string[]) => {
    setCollapsedGroupIdsPref(collapsedIds);
  };

  const onToggleHiddenCategories = () => {
    setShowHiddenCategoriesPef(!showHiddenCategories);
  };

  const toggleHiddenCategories = () => {
    onToggleHiddenCategories();
  };

  const expandAllCategories = () => {
    onCollapse([]);
  };

  const collapseAllCategories = () => {
    onCollapse(categoryGroups.map(g => g.id));
  };

  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);

  return (
    <View
      data-testid="budget-table"
      style={{
        flex: 1,
        ...(styles.lightScrollbar && {
          '& ::-webkit-scrollbar': {
            backgroundColor: 'transparent',
          },
          '& ::-webkit-scrollbar-thumb:vertical': {
            backgroundColor: theme.pageTextSubdued,
            // changed from tableHeaderBackground. pageTextSubdued is always visible on pageBackground
          },
        }),
      }}
    >
      <FocusedViewsBar
        views={views}
        activeViewId={activeViewId}
        isCollapsed={isCollapsed}
        startOffset={monthPickerContainerLeft}
        maxWidth={
          monthPickerLayout
            ? monthPickerContainerLeft + monthPickerLayout.width
            : undefined
        }
        availableBuiltInViews={availableBuiltInViews}
        viewOrder={viewOrder}
        hiddenViews={hiddenViews}
        showHiddenViews={showHiddenViews}
        onSelectView={setActiveView}
        onCreateView={() => setEditorState({ isOpen: true })}
        onEditView={id => setEditorState({ isOpen: true, viewId: id })}
        onDeleteView={deleteView}
        onReorderViews={() =>
          dispatch(pushModal({ modal: { name: 'reorder-views-editor' } }))
        }
        onToggleViewVisibility={toggleViewVisibility}
        onToggleShowHiddenViews={toggleShowHiddenViews}
      />
      {editorState.isOpen && (
        <FocusedViewEditor
          viewId={editorState.viewId}
          onClose={() => setEditorState({ isOpen: false })}
        />
      )}

      <FilteredCategoriesContext.Provider value={filteredCategoryGroups}>
        <View
          style={{
            flexDirection: 'row',
            overflow: 'hidden',
            flexShrink: 0,
            // This is necessary to align with the table because the
            // table has this padding to allow the shadow to show
            paddingLeft: 5,
            paddingRight: 5 + getScrollbarWidth(),
          }}
        >
          <View style={{ width: 200 + 100 * categoryExpandedState }} />
          <MonthsProvider
            startMonth={prewarmStartMonth}
            numMonths={numMonths}
            monthBounds={monthBounds}
            type={type}
          >
            <BudgetSummaries />
          </MonthsProvider>
        </View>

        <MonthsProvider
          startMonth={startMonth}
          numMonths={numMonths}
          monthBounds={monthBounds}
          type={type}
        >
          <BudgetTotals
            toggleHiddenCategories={toggleHiddenCategories}
            expandAllCategories={expandAllCategories}
            collapseAllCategories={collapseAllCategories}
          />
          <View
            style={{
              overflowY: 'scroll',
              overflowAnchor: 'none',
              flex: 1,
              paddingLeft: 5,
              paddingRight: 5,
            }}
          >
            <View
              style={{
                flexShrink: 0,
              }}
              onKeyDown={onKeyDown}
            >
              <SchedulesProvider query={schedulesQuery}>
                <BudgetCategories
                  categoryGroups={filteredCategoryGroups}
                  editingCell={editing}
                  onEditMonth={onEditMonth}
                  onEditName={onEditName}
                  onSaveCategory={onSaveCategory}
                  onSaveGroup={onSaveGroup}
                  onDeleteCategory={onDeleteCategory}
                  onDeleteGroup={onDeleteGroup}
                  onReorderCategory={_onReorderCategory}
                  onReorderGroup={_onReorderGroup}
                  onBudgetAction={onBudgetAction}
                  onShowActivity={onShowActivity}
                  onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
                  onSortCategories={onSortCategories}
                />
                {activeViewId && (
                  <FocusedViewBanner onViewAll={() => setActiveView(null)} />
                )}
              </SchedulesProvider>
            </View>
          </View>
        </MonthsProvider>
      </FilteredCategoriesContext.Provider>
    </View>
  );
}

BudgetTable.displayName = 'BudgetTable';
