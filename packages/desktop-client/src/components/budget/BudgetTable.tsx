import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { q } from '@actual-app/core/shared/query';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';

import type { DropPosition } from '#components/sort';
import { SchedulesProvider } from '#hooks/useCachedSchedules';
import { useCategories } from '#hooks/useCategories';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useLocalPref } from '#hooks/useLocalPref';

import { BudgetCategories } from './BudgetCategories';
import { BudgetSummaries } from './BudgetSummaries';
import { BudgetTotals } from './BudgetTotals';
import type { SummaryLayout } from './DynamicBudgetTable';
import { SIDE_PANEL_GAP, SIDE_PANEL_WIDTH } from './DynamicBudgetTable';
import { MonthPicker } from './MonthPicker';
import { MonthsProvider } from './MonthsContext';
import type { MonthBounds } from './MonthsContext';
import {
  findSortDown,
  findSortUp,
  getScrollbarWidth,
  separateGroups,
} from './util';

import { useBudgetComponents } from '.';

type BudgetTableProps = {
  type: string;
  prewarmStartMonth: string;
  startMonth: string;
  numMonths: number;
  monthBounds: MonthBounds;
  /**
   * Where the month summary is rendered: as a panel beside the table
   * (single month) or stacked above each month column.
   */
  summaryLayout?: SummaryLayout;
  onMonthSelect: (month: string) => void;
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
  const {
    type,
    prewarmStartMonth,
    startMonth,
    numMonths,
    monthBounds,
    summaryLayout = 'top',
    onMonthSelect,
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

  const { data: { grouped: categoryGroups } = { grouped: [] } } =
    useCategories();
  const [collapsedGroupIds = [], setCollapsedGroupIdsPref] =
    useLocalPref('budget.collapsed');
  const [showHiddenCategories, setShowHiddenCategoriesPef] = useLocalPref(
    'budget.showHiddenCategories',
  );
  const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
  const categoryExpandedState = categoryExpandedStatePref ?? 0;
  const [editing, setEditing] = useState<{ id: string; cell: string } | null>(
    null,
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const savedScrollPosition = sessionStorage.getItem(
      'budget-scroll-position',
    );
    if (savedScrollPosition != null && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = Number(savedScrollPosition);
      sessionStorage.removeItem('budget-scroll-position');
    }
  }, []);

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

  const _onShowActivity = (id: string, month?: string) => {
    if (scrollContainerRef.current) {
      sessionStorage.setItem(
        'budget-scroll-position',
        String(scrollContainerRef.current.scrollTop),
      );
    }
    onShowActivity(id, month);
  };

  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);
  const { SummaryComponent } = useBudgetComponents();
  const categoryWidth = 200 + 100 * categoryExpandedState;

  const monthPicker = (
    <MonthPicker
      startMonth={prewarmStartMonth}
      numDisplayed={numMonths}
      monthBounds={monthBounds}
      style={{ paddingBottom: 10 }}
      onSelect={onMonthSelect}
    />
  );

  const table = (
    <MonthsProvider
      startMonth={startMonth}
      numMonths={numMonths}
      monthBounds={monthBounds}
      type={type}
    >
      <View
        data-testid="budget-table-card"
        style={{
          ...styles.card,
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <BudgetTotals
          toggleHiddenCategories={toggleHiddenCategories}
          expandAllCategories={expandAllCategories}
          collapseAllCategories={collapseAllCategories}
        />
        <View
          ref={scrollContainerRef}
          data-testid="budget-table-scroll-container"
          style={{
            overflowY: 'scroll',
            overflowAnchor: 'none',
            flex: 1,
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
                categoryGroups={categoryGroups}
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
                onShowActivity={_onShowActivity}
                onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
                onSortCategories={onSortCategories}
              />
            </SchedulesProvider>
          </View>
        </View>
      </View>
    </MonthsProvider>
  );

  const scrollbarStyle = styles.lightScrollbar && {
    '& ::-webkit-scrollbar': {
      backgroundColor: 'transparent',
    },
    '& ::-webkit-scrollbar-thumb:vertical': {
      backgroundColor: theme.pageTextSubdued,
      // changed from tableHeaderBackground. pageTextSubdued is always visible on pageBackground
    },
  };

  if (summaryLayout === 'side') {
    return (
      <View
        data-testid="budget-table"
        data-summary-layout="side"
        style={{
          flex: 1,
          minHeight: 0,
          flexDirection: 'row',
          gap: SIDE_PANEL_GAP,
          ...scrollbarStyle,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          {monthPicker}
          {table}
        </View>
        <View
          data-testid="budget-summary-panel"
          style={{
            width: SIDE_PANEL_WIDTH,
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          <MonthsProvider
            startMonth={prewarmStartMonth}
            numMonths={numMonths}
            monthBounds={monthBounds}
            type={type}
          >
            <SummaryComponent month={prewarmStartMonth} />
          </MonthsProvider>
        </View>
      </View>
    );
  }

  return (
    <View
      data-testid="budget-table"
      data-summary-layout="top"
      style={{
        flex: 1,
        minHeight: 0,
        ...scrollbarStyle,
      }}
    >
      <View style={{ marginLeft: categoryWidth, flexShrink: 0 }}>
        <View style={{ marginRight: getScrollbarWidth() }}>{monthPicker}</View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          overflow: 'hidden',
          flexShrink: 0,
          paddingBottom: 12,
          // Align the summaries with the month columns of the table below.
          paddingRight: getScrollbarWidth(),
        }}
      >
        <View style={{ width: categoryWidth }} />
        <MonthsProvider
          startMonth={prewarmStartMonth}
          numMonths={numMonths}
          monthBounds={monthBounds}
          type={type}
        >
          <BudgetSummaries />
        </MonthsProvider>
      </View>

      {table}
    </View>
  );
}

BudgetTable.displayName = 'BudgetTable';
