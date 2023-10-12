import React, { memo, useState, useMemo } from 'react';

import { theme, styles } from '../../style';
import View from '../common/View';
import { DropHighlightPosContext } from '../sort';
import { Row } from '../table';

import ExpenseCategory from './ExpenseCategory';
import ExpenseGroup from './ExpenseGroup';
import IncomeCategory from './IncomeCategory';
import IncomeGroup from './IncomeGroup';
import IncomeHeader from './IncomeHeader';
import SidebarCategory from './SidebarCategory';
import SidebarGroup from './SidebarGroup';
import { separateGroups } from './util';

const BudgetCategories = memo(
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
    let items = useMemo(() => {
      let [expenseGroups, incomeGroup] = separateGroups(categoryGroups);

      let items = Array.prototype.concat.apply(
        [],
        expenseGroups.map(group => {
          if (group.hidden && !showHiddenCategories) {
            return [];
          }

          const groupCategories = group.categories.filter(
            cat => showHiddenCategories || !cat.hidden,
          );

          let items = [{ type: 'expense-group', value: { ...group } }];

          if (newCategoryForGroup === group.id) {
            items.push({ type: 'new-category' });
          }

          return [
            ...items,
            ...(collapsed.includes(group.id) ? [] : groupCategories).map(
              cat => ({
                type: 'expense-category',
                value: cat,
              }),
            ),
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
    }, [
      categoryGroups,
      collapsed,
      newCategoryForGroup,
      isAddingGroup,
      showHiddenCategories,
    ]);

    let [dragState, setDragState] = useState(null);
    let [savedCollapsed, setSavedCollapsed] = useState(null);

    // TODO: If we turn this into a reducer, we could probably memoize
    // each item in the list for better perf
    function onDragChange(newDragState) {
      let { state } = newDragState;

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
          setSavedCollapsed(collapsed);
        }
      } else if (state === 'hover') {
        setDragState({
          ...dragState,
          hoveredId: newDragState.id,
          hoveredPos: newDragState.pos,
        });
      } else if (state === 'end') {
        setDragState(null);
        setCollapsed(savedCollapsed || []);
      }
    }

    function onToggleCollapse(id) {
      if (collapsed.includes(id)) {
        setCollapsed(collapsed.filter(id_ => id_ !== id));
      } else {
        setCollapsed([...collapsed, id]);
      }
    }

    return (
      <View
        style={{
          marginBottom: 10,
          backgroundColor: 'white',
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
                <Row style={{ backgroundColor: theme.altTableBackground }}>
                  <SidebarGroup
                    group={{ id: 'new', name: '' }}
                    editing={true}
                    onSave={onSaveGroup}
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
                  group={item.value}
                  editingCell={editingCell}
                  collapsed={collapsed.includes(item.value.id)}
                  MonthComponent={dataComponents.ExpenseGroupComponent}
                  dragState={dragState}
                  onEditName={onEditName}
                  onSave={onSaveGroup}
                  onDelete={onDeleteGroup}
                  onDragChange={onDragChange}
                  onReorderGroup={onReorderGroup}
                  onReorderCategory={onReorderCategory}
                  onToggleCollapse={onToggleCollapse}
                  onShowNewCategory={onShowNewCategory}
                />
              );
              break;
            case 'expense-category':
              content = (
                <ExpenseCategory
                  cat={item.value}
                  editingCell={editingCell}
                  MonthComponent={dataComponents.ExpenseCategoryComponent}
                  dragState={dragState}
                  onEditName={onEditName}
                  onEditMonth={onEditMonth}
                  onSave={onSaveCategory}
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
                    backgroundColor: 'white',
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
                  cat={item.value}
                  editingCell={editingCell}
                  isLast={idx === items.length - 1}
                  MonthComponent={dataComponents.IncomeCategoryComponent}
                  onEditName={onEditName}
                  onEditMonth={onEditMonth}
                  onSave={onSaveCategory}
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

          let pos =
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
                    ':hover': { backgroundColor: '#fcfcfc' },
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

export default BudgetCategories;
