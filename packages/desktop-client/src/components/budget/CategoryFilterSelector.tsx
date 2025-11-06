import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import { type CategoryEntity } from 'loot-core/types/models';

import { MonthsContext } from './MonthsContext';
import { getScrollbarWidth } from './util';

import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { useSpreadsheet } from '@desktop-client/hooks/useSpreadsheet';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useSyncedPrefJson } from '@desktop-client/hooks/useSyncedPrefJson';
import {
  envelopeBudget,
  trackingBudget,
} from '@desktop-client/spreadsheet/bindings';

type CategoryFilterSelectorProps = {
  categoryGroups: Array<{
    id: string;
    name: string;
    categories?: CategoryEntity[];
  }>;
  onFilterChange: (filteredCategoryIds: string[] | null) => void;
};

type BudgetView = {
  id: string;
  name: string;
};

type LabelButtonProps = {
  label: BudgetView;
  categoryIds: string[];
  isSelected: boolean;
  onToggle: () => void;
  activeBudgetType: string;
  format: (value: unknown, type?: 'string' | 'number' | 'percentage' | 'financial' | 'financial-with-sign' | 'financial-no-decimals') => string;
};

function LabelButton({
  label,
  categoryIds,
  isSelected,
  onToggle,
  activeBudgetType,
  format,
}: LabelButtonProps) {
  const spreadsheet = useSpreadsheet();
  const { months } = useContext(MonthsContext);
  const currentMonth = months?.[0] || '';
  const sheetName = monthUtils.sheetForMonth(currentMonth);

  const [stats, setStats] = useState({
    budgeted: 0,
    spent: 0,
    count: categoryIds.length,
  });

  // Bind to all category values using useEffect
  useEffect(() => {
    if (categoryIds.length === 0 || !sheetName) {
      setStats({ budgeted: 0, spent: 0, count: 0 });
      return;
    }

    const budgetValues: Record<string, number> = {};
    const spentValues: Record<string, number> = {};
    const unbindList: (() => void)[] = [];

    categoryIds.forEach(categoryId => {
      const budgetBinding =
        activeBudgetType === 'envelope'
          ? envelopeBudget.catBudgeted(categoryId)
          : trackingBudget.catBudgeted(categoryId);
      const spentBinding =
        activeBudgetType === 'envelope'
          ? envelopeBudget.catSumAmount(categoryId)
          : trackingBudget.catSumAmount(categoryId);

      const unbindBudget = spreadsheet.bind(
        sheetName,
        budgetBinding,
        result => {
          budgetValues[categoryId] =
            typeof result.value === 'number' ? result.value : 0;
          const total = Object.values(budgetValues).reduce(
            (sum, val) => sum + val,
            0,
          );
          const totalSpent = Object.values(spentValues).reduce(
            (sum, val) => sum + val,
            0,
          );
          setStats({
            budgeted: total,
            spent: totalSpent,
            count: categoryIds.length,
          });
        },
      );
      unbindList.push(unbindBudget);

      const unbindSpent = spreadsheet.bind(sheetName, spentBinding, result => {
        spentValues[categoryId] =
          typeof result.value === 'number' ? result.value : 0;
        const total = Object.values(budgetValues).reduce(
          (sum, val) => sum + val,
          0,
        );
        const totalSpent = Object.values(spentValues).reduce(
          (sum, val) => sum + val,
          0,
        );
        setStats({
          budgeted: total,
          spent: totalSpent,
          count: categoryIds.length,
        });
      });
      unbindList.push(unbindSpent);
    });

    return () => {
      unbindList.forEach(unbind => unbind());
    };
  }, [categoryIds, sheetName, activeBudgetType, spreadsheet]);

  const balance = stats.budgeted + stats.spent;

  const tooltipContent = (
    <View style={{ padding: 8, minWidth: 200 }}>
      <Text style={{ fontWeight: 600, marginBottom: 8 }}>{label.name}</Text>
      <View style={{ gap: 4 }}>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: theme.pageTextLight }}><Trans>Budgeted:</Trans></Text>
          <Text style={{ fontWeight: 500 }}>
            {format(stats.budgeted, 'financial')}
          </Text>
        </View>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: theme.pageTextLight }}><Trans>Spent:</Trans></Text>
          <Text style={{ fontWeight: 500 }}>
            {format(stats.spent, 'financial')}
          </Text>
        </View>
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            borderTop: `1px solid ${theme.tableBorder}`,
            paddingTop: 4,
            marginTop: 4,
          }}
        >
          <Text style={{ color: theme.pageTextLight, fontWeight: 600 }}>
            <Trans>Balance:</Trans>
          </Text>
          <Text
            style={{
              fontWeight: 600,
              color: balance < 0 ? theme.errorText : theme.pageText,
            }}
          >
            {format(balance, 'financial')}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <Tooltip content={tooltipContent} placement="top">
      <Button
        variant="bare"
        onPress={onToggle}
        style={{
          fontSize: 12,
          margin: 0,
          padding: '4px 12px',
          border: `1px solid ${theme.tableBorder}`,
          borderRadius: 4,
          ...(isSelected && {
            backgroundColor: theme.tableBorderHover,
            color: theme.buttonPrimaryText,
          }),
        }}
      >
        <Text>{label.name}</Text>
      </Button>
    </Tooltip>
  );
}

export function CategoryFilterSelector({
  categoryGroups,
  onFilterChange,
}: CategoryFilterSelectorProps) {
  const budgetViewsEnabled = useFeatureFlag('budgetViews');
  const { t } = useTranslation();
  const format = useFormat();
  const { type: budgetType } = useContext(MonthsContext);

  if (!budgetViewsEnabled) {
    return null;
  }
  const [selectedViews, setSelectedViews] = useState<Set<string>>(new Set());
  const [budgetViewMap = {}, setBudgetViewMapPref] = useSyncedPrefJson<
    'budget.budgetViewMap',
    Record<string, string[]>
  >('budget.budgetViewMap', {});
  const [customViews = []] = useSyncedPrefJson<
    'budget.customBudgetViews',
    Array<{ id: string; name: string }>
  >('budget.customBudgetViews', []);
  const [collapsedGroupIds = [], setCollapsedGroupIdsPref] =
    useLocalPref('budget.collapsed');
  const [budgetTypePref = 'envelope'] = useSyncedPref('budgetType');
  const activeBudgetType = budgetType || budgetTypePref;

  // Store the original collapsed state before filtering
  const originalCollapsedStateRef = useRef<string[] | null>(null);

  const views = useMemo(() => {
    // Collect all view IDs that are actually in use (from budgetViewMap)
    const viewsInUse = new Set<string>();
    Object.values(budgetViewMap).forEach(viewIds => {
      viewIds.forEach(viewId => viewsInUse.add(viewId));
    });

    // Include all custom views that are in use
    const allCustomViews = Array.isArray(customViews) ? customViews : [];

    // Remove duplicates by ID and only show views that are in use
    const seen = new Set<string>();
    return allCustomViews.filter(view => {
      if (seen.has(view.id)) {
        return false;
      }
      seen.add(view.id);
      return viewsInUse.has(view.id);
    });
  }, [budgetViewMap, customViews]);

  // Calculate category IDs for each view
  const viewCategoryIds = useMemo(() => {
    const map: Record<string, string[]> = {};
    views.forEach(view => {
      const ids: string[] = [];
      Object.entries(budgetViewMap).forEach(([categoryId, viewIds]) => {
        if (Array.isArray(viewIds) && viewIds.includes(view.id)) {
          ids.push(categoryId);
        }
      });
      map[view.id] = ids;
    });
    return map;
  }, [views, budgetViewMap]);

  const handleViewToggle = (viewId: string) => {
    const newSelected = new Set(selectedViews);
    if (newSelected.has(viewId)) {
      newSelected.delete(viewId);
    } else {
      newSelected.add(viewId);
    }
    setSelectedViews(newSelected);

    // Find all categories that belong to the selected views
    if (newSelected.size === 0) {
      // Restore original collapsed state when clearing filters
      if (originalCollapsedStateRef.current !== null) {
        setCollapsedGroupIdsPref(originalCollapsedStateRef.current);
        originalCollapsedStateRef.current = null;
      }
      onFilterChange(null); // Show all categories
    } else {
      // Store original collapsed state if this is the first filter applied
      if (originalCollapsedStateRef.current === null) {
        originalCollapsedStateRef.current = [...collapsedGroupIds];
      }

      const filteredCategoryIds = new Set<string>();
      Object.entries(budgetViewMap).forEach(([categoryId, viewIds]) => {
        if (Array.isArray(viewIds) && viewIds.some(id => newSelected.has(id))) {
          filteredCategoryIds.add(categoryId);
        }
      });

      // Find groups that contain filtered categories and expand them
      const groupsToExpand = new Set<string>();
      categoryGroups.forEach(group => {
        const hasFilteredCategory = group.categories?.some(cat =>
          filteredCategoryIds.has(cat.id),
        );
        if (hasFilteredCategory && collapsedGroupIds.includes(group.id)) {
          groupsToExpand.add(group.id);
        }
      });

      // Expand groups that contain filtered categories
      if (groupsToExpand.size > 0) {
        setCollapsedGroupIdsPref(
          collapsedGroupIds.filter(id => !groupsToExpand.has(id)),
        );
      }

      onFilterChange(Array.from(filteredCategoryIds));
    }
  };

  // Function to assign a category to a view (can be called from a context menu or settings)
  const _assignCategoryToView = (
    categoryId: string,
    viewId: string,
    add: boolean,
  ) => {
    const currentViews = budgetViewMap[categoryId] || [];
    const updatedViews = add
      ? [...currentViews, viewId].filter(
          (id, index, arr) => arr.indexOf(id) === index,
        ) // Remove duplicates
      : currentViews.filter(id => id !== viewId);

    const newMap = Object.assign({}, budgetViewMap || {});
    if (updatedViews.length === 0) {
      delete newMap[categoryId];
    } else {
      newMap[categoryId] = updatedViews;
    }
    setBudgetViewMapPref(newMap);
  };

  // Don't show the filter bar if no budget views are created or if none are in use
  if (views.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        backgroundColor: theme.tableBackground,
        borderTop: `1px solid ${theme.tableBorder}`,
        borderBottom: `1px solid ${theme.tableBorder}`,
        flexWrap: 'wrap',
        marginLeft: 5,
        marginRight: 5 + getScrollbarWidth(),
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      {views.map(view => {
        const isSelected = selectedViews.has(view.id);
        const categoryIds = viewCategoryIds[view.id] || [];
        return (
          <LabelButton
            key={view.id}
            label={view}
            categoryIds={categoryIds}
            isSelected={isSelected}
            onToggle={() => handleViewToggle(view.id)}
            activeBudgetType={activeBudgetType}
            format={(value: unknown, type) =>
              format(value, type)
            }
          />
        );
      })}
      {selectedViews.size > 0 && (
        <Button
          variant="bare"
          onPress={() => {
            setSelectedViews(new Set());
            // Restore original collapsed state when clearing filters
            if (originalCollapsedStateRef.current !== null) {
              setCollapsedGroupIdsPref(originalCollapsedStateRef.current);
              originalCollapsedStateRef.current = null;
            }
            onFilterChange(null);
          }}
          style={{
            fontSize: 13,
            padding: '4px 8px',
            marginLeft: 'auto',
            color: theme.pageTextLight,
            border: `1px solid ${theme.tableBorder}`,
            borderRadius: 4,
          }}
        >
          <Trans>Clear filters</Trans>
        </Button>
      )}
    </View>
  );
}
