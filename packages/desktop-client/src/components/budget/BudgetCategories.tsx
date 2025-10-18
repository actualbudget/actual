import React, { memo, useState, useMemo } from 'react';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { ExpenseCategory } from './ExpenseCategory';
import { ExpenseGroup } from './ExpenseGroup';
import { IncomeCategory } from './IncomeCategory';
import { IncomeGroup } from './IncomeGroup';
import { IncomeHeader } from './IncomeHeader';
import { SidebarCategory } from './SidebarCategory';
import { SidebarGroup } from './SidebarGroup';
import { separateGroups } from './util';

import { DropHighlightPosContext } from '@desktop-client/components/sort';
import { Row } from '@desktop-client/components/table';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';

export const BudgetCategories = memo(
  ({
    categoryGroups,
    editingCell,
    dataComponents,
    onBudgetAction,
    onShowActivity,
    onEditName,
    onEditMonth,
    onSaveCategory,
    onSaveGroup,
    onDeleteCategory,
    onDeleteGroup,
    onApplyBudgetTemplatesInGroup,
    onReorderCategory,
    onReorderGroup,
  }) => {
    const [collapsedGroupIds = [], setCollapsedGroupIdsPref] =
      useLocalPref('budget.collapsed');
    const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');
    function onCollapse(value) {
      setCollapsedGroupIdsPref(value);
    }

    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [newCategoryForGroup, setNewCategoryForGroup] = useState(null);
    const items = useMemo(() => {
      const [expenseGroups, incomeGroup] = separateGroups(categoryGroups);

      let items = Array.prototype.concat.apply(
        [],
        expenseGroups.map(group => {
          if (group.hidden && !showHiddenCategories) {
            return [];
          }

          const groupCategories = group.categories.filter(
            cat => showHiddenCategories || !cat.hidden,
          );

          const items = [{ type: 'expense-group', value: { ...group } }];

          if (newCategoryForGroup === group.id) {
            items.push({ type: 'new-category' });
          }

          return [
            ...items,
            ...(collapsedGroupIds.includes(group.id)
              ? []
              : groupCategories
            ).map(cat => ({
              type: 'expense-category',
              value: cat,
              group,
            })),
          ];
        }),
      );

      if (isAddingGroup) {
        items.push({ type: 'new-group' });
      }

      if (incomeGroup) {
        items = items.concat(
          [
            { type: 'income-separator' },
            { type: 'income-group', value: incomeGroup },
            newCategoryForGroup === incomeGroup.id && { type: 'new-category' },
            ...(collapsedGroupIds.includes(incomeGroup.id)
              ? []
              : incomeGroup.categories.filter(
                  cat => showHiddenCategories || !cat.hidden,
                )
            ).map(cat => ({
              type: 'income-category',
              value: cat,
            })),
          ].filter(x => x),
        );
      }

      return items;
    }, [
      categoryGroups,
      collapsedGroupIds,
      newCategoryForGroup,
      isAddingGroup,
      showHiddenCategories,
    ]);

    const [dragState, setDragState] = useState(null);
    const [savedCollapsed, setSavedCollapsed] = useState(null);

    // TODO: If we turn this into a reducer, we could probably memoize
    // each item in the list for better perf
    function onDragChange(newDragState) {
      const { state } = newDragState;

      if (state === 'start-preview') {
        setDragState({
          type: newDragState.type,
          item: newDragState.item,
          preview: true,
        });
      } else if (state === 'start') {
        if (dragState) {
          setDragState({
            ...dragState,
            preview: false,
          });
          setSavedCollapsed(collapsedGroupIds);
        }
      } else if (state === 'hover') {
        setDragState({
          ...dragState,
          hoveredId: newDragState.id,
          hoveredPos: newDragState.pos,
        });
      } else if (state === 'end') {
        setDragState(null);
        onCollapse(savedCollapsed || []);
      }
    }

    function onToggleCollapse(id) {
      if (collapsedGroupIds.includes(id)) {
        onCollapse(collapsedGroupIds.filter(id_ => id_ !== id));
      } else {
        onCollapse([...collapsedGroupIds, id]);
      }
    }

    function onShowNewGroup() {
      setIsAddingGroup(true);
    }

    function onHideNewGroup() {
      setIsAddingGroup(false);
    }

    function _onSaveGroup(group) {
      onSaveGroup?.(group);
      if (group.id === 'new') {
        onHideNewGroup();
      }
    }

    function onShowNewCategory(groupId) {
      onCollapse(collapsedGroupIds.filter(c => c !== groupId));
      setNewCategoryForGroup(groupId);
    }

    function onHideNewCategory() {
      setNewCategoryForGroup(null);
    }

    function _onSaveCategory(category) {
      onSaveCategory?.(category);
      if (category.id === 'new') {
        onHideNewCategory();
      }
    }

    return (
      <View
        style={{
          marginBottom: 10,
          backgroundColor: theme.tableBackground,
          overflow: 'hidden',
          boxShadow: styles.cardShadow,
          borderRadius: '0 0 4px 4px',
          flex: 1,
        }}
      >
        {items.map((item, idx) => {
          let content;
          switch (item.type) {
            case 'new-group':
              content = (
                <Row
                  style={{ backgroundColor: theme.tableRowHeaderBackground }}
                >
                  <SidebarGroup
                    group={{ id: 'new', name: '' }}
                    editing={true}
                    onSave={_onSaveGroup}
                    onHideNewGroup={onHideNewGroup}
                    onEdit={onEditName}
                  />
                </Row>
              );
              break;
            case 'new-category':
              content = (
                <Row>
                  <SidebarCategory
                    category={{
                      name: '',
                      group: newCategoryForGroup,
                      is_income:
                        newCategoryForGroup ===
                        categoryGroups.find(g => g.is_income).id,
                      id: 'new',
                    }}
                    editing={true}
                    onSave={_onSaveCategory}
                    onHideNewCategory={onHideNewCategory}
                    onEditName={onEditName}
                  />
                </Row>
              );
              break;

            case 'expense-group':
              content = (
                <ExpenseGroup
                  group={item.value}
                  editingCell={editingCell}
                  collapsed={collapsedGroupIds.includes(item.value.id)}
                  MonthComponent={dataComponents.ExpenseGroupComponent}
                  dragState={dragState}
                  onEditName={onEditName}
                  onSave={_onSaveGroup}
                  onDelete={onDeleteGroup}
                  onDragChange={onDragChange}
                  onReorderGroup={onReorderGroup}
                  onReorderCategory={onReorderCategory}
                  onToggleCollapse={onToggleCollapse}
                  onShowNewCategory={onShowNewCategory}
                  onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
                />
              );
              break;
            case 'expense-category':
              content = (
                <ExpenseCategory
                  cat={item.value}
                  categoryGroup={item.group}
                  editingCell={editingCell}
                  MonthComponent={dataComponents.ExpenseCategoryComponent}
                  dragState={dragState}
                  onEditName={onEditName}
                  onEditMonth={onEditMonth}
                  onSave={_onSaveCategory}
                  onDelete={onDeleteCategory}
                  onDragChange={onDragChange}
                  onReorder={onReorderCategory}
                  onBudgetAction={onBudgetAction}
                  onShowActivity={onShowActivity}
                />
              );
              break;
            case 'income-separator':
              content = (
                <View
                  style={{
                    height: styles.incomeHeaderHeight,
                    backgroundColor: theme.tableBackground,
                  }}
                >
                  <IncomeHeader
                    MonthComponent={dataComponents.IncomeHeaderComponent}
                    onShowNewGroup={onShowNewGroup}
                  />
                </View>
              );
              break;
            case 'income-group':
              content = (
                <IncomeGroup
                  group={item.value}
                  editingCell={editingCell}
                  MonthComponent={dataComponents.IncomeGroupComponent}
                  collapsed={collapsedGroupIds.includes(item.value.id)}
                  onEditName={onEditName}
                  onSave={_onSaveGroup}
                  onToggleCollapse={onToggleCollapse}
                  onShowNewCategory={onShowNewCategory}
                />
              );
              break;
            case 'income-category':
              content = (
                <IncomeCategory
                  cat={item.value}
                  editingCell={editingCell}
                  isLast={idx === items.length - 1}
                  MonthComponent={dataComponents.IncomeCategoryComponent}
                  onEditName={onEditName}
                  onEditMonth={onEditMonth}
                  onSave={_onSaveCategory}
                  onDelete={onDeleteCategory}
                  onDragChange={onDragChange}
                  onReorder={onReorderCategory}
                  onBudgetAction={onBudgetAction}
                  onShowActivity={onShowActivity}
                />
              );
              break;
            default:
              throw new Error('Unknown item type: ' + item.type);
          }

          const pos =
            idx === 0 ? 'first' : idx === items.length - 1 ? 'last' : null;

          return (
            <DropHighlightPosContext.Provider
              key={
                item.value
                  ? item.value.id
                  : item.type === 'income-separator'
                    ? 'separator'
                    : idx
              }
              value={pos}
            >
              <View
                style={
                  !dragState && {
                    ':hover': { backgroundColor: theme.tableBackground },
                  }
                }
              >
                {content}
              </View>
            </DropHighlightPosContext.Provider>
          );
        })}
      </View>
    );
  },
);

BudgetCategories.displayName = 'BudgetCategories';
