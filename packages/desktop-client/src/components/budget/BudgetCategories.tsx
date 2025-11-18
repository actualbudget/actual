import React, { memo, useState, useMemo } from 'react';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { ExpenseCategory } from './ExpenseCategory';
import { ExpenseGroup } from './ExpenseGroup';
import { IncomeCategory } from './IncomeCategory';
import { IncomeGroup } from './IncomeGroup';
import { IncomeHeader } from './IncomeHeader';
import { SidebarCategory } from './SidebarCategory';
import { SidebarGroup } from './SidebarGroup';
import { separateGroups } from './util';

import {
  DropHighlightPosContext,
  type DragState,
  type OnDropCallback,
} from '@desktop-client/components/sort';
import { Row } from '@desktop-client/components/table';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';

type BudgetItem =
  | { type: 'new-group' }
  | { type: 'new-category' }
  | { type: 'expense-group'; value: CategoryGroupEntity }
  | {
      type: 'expense-category';
      value: CategoryEntity;
      group: CategoryGroupEntity;
    }
  | { type: 'income-separator' }
  | { type: 'income-group'; value: CategoryGroupEntity }
  | { type: 'income-category'; value: CategoryEntity };

type LocalDragState =
  | DragState<CategoryEntity>
  | DragState<CategoryGroupEntity>
  | null;

type BudgetCategoriesProps = {
  categoryGroups: CategoryGroupEntity[];
  editingCell: { id: string; cell: string } | null;
  onBudgetAction: (month: string, action: string, arg: unknown) => void;
  onShowActivity: (id: CategoryEntity['id'], month?: string) => void;
  onEditName: (id: CategoryEntity['id']) => void;
  onEditMonth: (id: CategoryEntity['id'], month: string) => void;
  onSaveCategory: (category: CategoryEntity) => void;
  onSaveGroup: (group: CategoryGroupEntity) => void;
  onDeleteCategory: (id: CategoryEntity['id']) => void;
  onDeleteGroup: (id: CategoryGroupEntity['id']) => void;
  onApplyBudgetTemplatesInGroup: (categoryIds: CategoryEntity['id'][]) => void;
  onReorderCategory: OnDropCallback;
  onReorderGroup: OnDropCallback;
};

export const BudgetCategories = memo<BudgetCategoriesProps>(
  ({
    categoryGroups,
    editingCell,
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
    function onCollapse(value: Array<CategoryGroupEntity['id']>) {
      setCollapsedGroupIdsPref(value);
    }

    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [newCategoryForGroup, setNewCategoryForGroup] = useState<
      string | null
    >(null);
    const items: BudgetItem[] = useMemo(() => {
      const [expenseGroups, incomeGroup] = separateGroups(categoryGroups);

      let items: BudgetItem[] = Array.prototype.concat.apply(
        [],
        expenseGroups.map(group => {
          if (group.hidden && !showHiddenCategories) {
            return [];
          }

          const groupCategories = group.categories?.filter(
            cat => showHiddenCategories || !cat.hidden,
          );

          const items: BudgetItem[] = [
            { type: 'expense-group', value: { ...group } },
          ];

          if (newCategoryForGroup === group.id) {
            items.push({ type: 'new-category' });
          }

          return [
            ...items,
            ...(collapsedGroupIds.includes(group.id)
              ? []
              : groupCategories || []
            ).map(
              (cat): BudgetItem => ({
                type: 'expense-category',
                value: cat,
                group,
              }),
            ),
          ];
        }),
      );

      if (isAddingGroup) {
        items.push({ type: 'new-group' });
      }

      if (incomeGroup) {
        const incomeCategoryItems: BudgetItem[] = [
          { type: 'income-separator' },
          { type: 'income-group', value: incomeGroup },
        ];

        if (newCategoryForGroup === incomeGroup.id) {
          incomeCategoryItems.push({ type: 'new-category' });
        }

        incomeCategoryItems.push(
          ...(collapsedGroupIds.includes(incomeGroup.id)
            ? []
            : incomeGroup.categories?.filter(
                cat => showHiddenCategories || !cat.hidden,
              ) || []
          ).map(
            (cat): BudgetItem => ({
              type: 'income-category',
              value: cat,
            }),
          ),
        );

        items = items.concat(incomeCategoryItems);
      }

      return items;
    }, [
      categoryGroups,
      collapsedGroupIds,
      newCategoryForGroup,
      isAddingGroup,
      showHiddenCategories,
    ]);

    const [dragState, setDragState] = useState<LocalDragState>(null);
    const [savedCollapsed, setSavedCollapsed] = useState<Array<
      CategoryGroupEntity['id']
    > | null>(null);

    // TODO: If we turn this into a reducer, we could probably memoize
    // each item in the list for better perf
    function onDragChange(
      newDragState: DragState<CategoryEntity> | DragState<CategoryGroupEntity>,
    ) {
      const { state } = newDragState;

      if (state === 'start-preview') {
        // @ts-expect-error fix me
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
      } else if (state === 'end') {
        setDragState(null);
        onCollapse(savedCollapsed || []);
      }
    }

    function onToggleCollapse(id: CategoryGroupEntity['id']) {
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

    function _onSaveGroup(group: CategoryGroupEntity) {
      onSaveGroup?.(group);
      if (group.id === 'new') {
        onHideNewGroup();
      }
    }

    function onShowNewCategory(groupId: CategoryGroupEntity['id']) {
      onCollapse(collapsedGroupIds.filter(c => c !== groupId));
      setNewCategoryForGroup(groupId);
    }

    function onHideNewCategory() {
      setNewCategoryForGroup(null);
    }

    function _onSaveCategory(category: CategoryEntity) {
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
                    collapsed={false}
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
                    innerRef={null}
                    category={{
                      name: '',
                      group: newCategoryForGroup!,
                      is_income:
                        newCategoryForGroup ===
                        categoryGroups.find(g => g.is_income)?.id,
                      id: 'new',
                    }}
                    editing={true}
                    onSave={_onSaveCategory}
                    onDelete={async () => {}}
                    onHideNewCategory={onHideNewCategory}
                    onEditName={onEditName!}
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
                  <IncomeHeader onShowNewGroup={onShowNewGroup} />
                </View>
              );
              break;
            case 'income-group':
              content = (
                <IncomeGroup
                  group={item.value}
                  editingCell={editingCell}
                  collapsed={collapsedGroupIds.includes(item.value.id)}
                  onEditName={onEditName!}
                  onSave={_onSaveGroup}
                  onToggleCollapse={onToggleCollapse}
                  onShowNewCategory={onShowNewCategory!}
                />
              );
              break;
            case 'income-category':
              content = (
                <IncomeCategory
                  cat={item.value}
                  editingCell={editingCell}
                  isLast={idx === items.length - 1}
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
              // @ts-expect-error Error is expected here because "item.type" is "never"
              throw new Error('Unknown item type: ' + item.type);
          }

          const pos =
            idx === 0 ? 'first' : idx === items.length - 1 ? 'last' : null;

          return (
            <DropHighlightPosContext.Provider
              key={
                'value' in item
                  ? item.value.id
                  : item.type === 'income-separator'
                    ? 'separator'
                    : idx
              }
              value={pos}
            >
              <View
                style={
                  dragState
                    ? {}
                    : {
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
