import React, { memo, useState, useMemo } from 'react';

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { theme, styles } from '../../style';
import { View } from '../common/View';
import { Row } from '../table';
import { getDropPosition } from '../util/sort';

import { ExpenseCategory } from './ExpenseCategory';
import { ExpenseGroup } from './ExpenseGroup';
import { IncomeCategory } from './IncomeCategory';
import { IncomeGroup } from './IncomeGroup';
import { IncomeHeader } from './IncomeHeader';
import { SidebarCategory } from './SidebarCategory';
import { SidebarGroup } from './SidebarGroup';
import { separateGroups } from './util';

const getItemDndId = item => item.value?.id || item.type;

export const BudgetCategories = memo(
  ({
    categoryGroups,
    newCategoryForGroup,
    showHiddenCategories,
    isAddingGroup,
    editingCell,
    collapsed,
    setCollapsed,
    dataComponents,
    onBudgetAction,
    onShowActivity,
    onEditName,
    onEditMonth,
    onSaveCategory,
    onSaveGroup,
    onDeleteCategory,
    onDeleteGroup,
    onReorderCategory,
    onReorderGroup,
    onShowNewCategory,
    onHideNewCategory,
    onShowNewGroup,
    onHideNewGroup,
  }) => {
    const items = useMemo(() => {
      const [expenseGroups, incomeGroup] = separateGroups(categoryGroups);

      let items = Array.prototype.concat.apply(
        [],
        expenseGroups.map(expenseGroup => {
          if (expenseGroup.hidden && !showHiddenCategories) {
            return [];
          }

          const groupCategories = expenseGroup.categories.filter(
            cat => showHiddenCategories || !cat.hidden,
          );

          const items = [{ type: 'expense-group', value: { ...expenseGroup } }];

          if (newCategoryForGroup === expenseGroup.id) {
            items.push({ type: 'new-expense-category' });
          }

          return [
            ...items,
            ...(collapsed.includes(expenseGroup.id) ? [] : groupCategories).map(
              cat => ({
                type: 'expense-category',
                value: cat,
              }),
            ),
          ];
        }),
      );

      if (incomeGroup) {
        items = items.concat(
          [
            { type: 'income-group', value: incomeGroup },
            newCategoryForGroup === incomeGroup.id && {
              type: 'new-income-category',
            },
            ...(collapsed.includes(incomeGroup.id)
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
    }, [categoryGroups, collapsed, newCategoryForGroup, showHiddenCategories]);

    const expenseGroupItems = useMemo(
      () =>
        items.filter(
          item =>
            item.type === 'expense-group' ||
            item.type === 'expense-category' ||
            item.type === 'new-expense-category',
        ),
      [items],
    );

    const incomeGroupItems = useMemo(
      () =>
        items.filter(
          item =>
            item.type === 'income-group' ||
            item.type === 'income-category' ||
            item.type === 'new-income-category',
        ),
      [items],
    );

    function onCollapse(id) {
      setCollapsed([...collapsed, id]);
    }

    function onExpand(id) {
      setCollapsed(collapsed.filter(_id => _id !== id));
    }

    function onToggleCollapse(id) {
      if (collapsed.includes(id)) {
        onExpand(id);
      } else {
        onCollapse(id);
      }
    }

    const sensors = useSensors(
      useSensor(TouchSensor, {
        activationConstraint: {
          delay: 250,
          tolerance: 5,
        },
      }),
      useSensor(MouseSensor, {
        activationConstraint: {
          distance: 10,
        },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      }),
    );

    const [originalCollapsed, setOriginalCollapsed] = useState(null);
    const [collapsedOnDragMove, setCollapsedOnDragMove] = useState(null);

    const onDragStart = e => {
      const { active } = e;
      setOriginalCollapsed(collapsed);

      const activeItem = items.find(item => getItemDndId(item) === active.id);
      switch (activeItem?.type) {
        case 'expense-group':
          const groupIds = expenseGroupItems
            .filter(item => item.type === 'expense-group')
            .map(item => item.value?.id);

          setCollapsedOnDragMove(groupIds);
          break;
        default:
          break;
      }
    };

    const onDragMove = e => {
      const { active, over } = e;

      if (!over) {
        return;
      }

      // Delay collapsing groups until user moves the group.
      if (collapsedOnDragMove) {
        setCollapsed(collapsedOnDragMove);
        setCollapsedOnDragMove(null);
      }

      // Expand groups on hover when moving around categories.
      const activeItem = items.find(item => getItemDndId(item) === active.id);
      if (
        activeItem?.type === 'expense-category' &&
        collapsed.includes(over.id)
      ) {
        onToggleCollapse(over.id);
      }
    };

    const onDragEnd = e => {
      const { active, over } = e;

      if (over && over.id !== active.id) {
        const activeItem = items.find(item => getItemDndId(item) === active.id);

        const dropPos = getDropPosition(
          active.rect.current.translated,
          active.rect.current.initial,
        );

        if (activeItem.type === 'expense-group') {
          onReorderGroup(active.id, dropPos, over.id);
        } else if (
          activeItem.type === 'expense-category' ||
          activeItem.type === 'income-category'
        ) {
          onReorderCategory(active.id, dropPos, over.id);
        }
      }

      setCollapsed(originalCollapsed);
    };

    const expenseGroupIds = useMemo(
      () => expenseGroupItems.map(getItemDndId),
      [expenseGroupItems],
    );

    const incomeGroupIds = useMemo(
      () => incomeGroupItems.map(getItemDndId),
      [incomeGroupItems],
    );

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
        <View>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={expenseGroupIds}
              strategy={verticalListSortingStrategy}
            >
              {expenseGroupItems.map((item, idx) => {
                let content;
                switch (item.type) {
                  case 'new-expense-category':
                    content = (
                      <Row key="new-expense-category">
                        <SidebarCategory
                          category={{
                            name: '',
                            cat_group: newCategoryForGroup,
                            is_income:
                              newCategoryForGroup ===
                              categoryGroups.find(g => g.is_income).id,
                            id: 'new',
                          }}
                          editing={true}
                          onSave={onSaveCategory}
                          onHideNewCategory={onHideNewCategory}
                          onEditName={onEditName}
                        />
                      </Row>
                    );
                    break;
                  case 'expense-group':
                    content = (
                      <ExpenseGroup
                        key={item.value.id}
                        group={item.value}
                        editingCell={editingCell}
                        collapsed={collapsed.includes(item.value.id)}
                        MonthComponent={dataComponents.ExpenseGroupComponent}
                        onEditName={onEditName}
                        onSave={onSaveGroup}
                        onDelete={onDeleteGroup}
                        onToggleCollapse={onToggleCollapse}
                        onShowNewCategory={onShowNewCategory}
                      />
                    );
                    break;
                  case 'expense-category':
                    content = (
                      <ExpenseCategory
                        key={item.value.id}
                        cat={item.value}
                        editingCell={editingCell}
                        MonthComponent={dataComponents.ExpenseCategoryComponent}
                        onEditName={onEditName}
                        onEditMonth={onEditMonth}
                        onSave={onSaveCategory}
                        onDelete={onDeleteCategory}
                        onBudgetAction={onBudgetAction}
                        onShowActivity={onShowActivity}
                      />
                    );
                    break;
                  default:
                    throw new Error('Unknown item type: ' + item.type);
                }

                return content;
              })}
            </SortableContext>
          </DndContext>
        </View>
        {isAddingGroup && (
          <Row
            key="new-group"
            style={{
              backgroundColor: theme.tableRowHeaderBackground,
            }}
          >
            <SidebarGroup
              group={{ id: 'new', name: '' }}
              editing={true}
              onSave={onSaveGroup}
              onHideNewGroup={onHideNewGroup}
              onEdit={onEditName}
            />
          </Row>
        )}
        <View
          key="income-separator"
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
        <View>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={incomeGroupIds}
              strategy={verticalListSortingStrategy}
            >
              {incomeGroupItems.map((item, idx) => {
                let content;
                switch (item.type) {
                  case 'new-income-category':
                    content = (
                      <Row key="new-income-category">
                        <SidebarCategory
                          category={{
                            name: '',
                            cat_group: newCategoryForGroup,
                            is_income:
                              newCategoryForGroup ===
                              categoryGroups.find(g => g.is_income).id,
                            id: 'new',
                          }}
                          editing={true}
                          onSave={onSaveCategory}
                          onHideNewCategory={onHideNewCategory}
                          onEditName={onEditName}
                        />
                      </Row>
                    );
                    break;
                  case 'income-group':
                    content = (
                      <IncomeGroup
                        key={item.value.id}
                        group={item.value}
                        editingCell={editingCell}
                        MonthComponent={dataComponents.IncomeGroupComponent}
                        collapsed={collapsed.includes(item.value.id)}
                        onEditName={onEditName}
                        onSave={onSaveGroup}
                        onToggleCollapse={onToggleCollapse}
                        onShowNewCategory={onShowNewCategory}
                      />
                    );
                    break;
                  case 'income-category':
                    content = (
                      <IncomeCategory
                        key={item.value.id}
                        cat={item.value}
                        editingCell={editingCell}
                        isLast={idx === items.length - 1}
                        MonthComponent={dataComponents.IncomeCategoryComponent}
                        onEditName={onEditName}
                        onEditMonth={onEditMonth}
                        onSave={onSaveCategory}
                        onDelete={onDeleteCategory}
                        onBudgetAction={onBudgetAction}
                        onShowActivity={onShowActivity}
                      />
                    );
                    break;
                  default:
                    throw new Error('Unknown item type: ' + item.type);
                }

                return content;
              })}
            </SortableContext>
          </DndContext>
        </View>
      </View>
    );
  },
);
