import React, {
  useState,
  useMemo,
  useContext,
  type ComponentPropsWithoutRef,
} from 'react';
import { usePress } from 'react-aria';
import {
  Column,
  Table,
  TableBody,
  TableHeader,
  Row as ReactAriaRow,
  Cell as ReactAriaCell,
  ResizableTableContainer,
  ColumnResizer,
  DialogTrigger,
} from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import {
  SvgCheveronDown,
  SvgDotsHorizontalTriple,
} from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { type CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import { envelopeBudget, trackingBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';
import { currencyToInteger } from 'loot-core/shared/util';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useLocalPref } from '../../hooks/useLocalPref';
import { useSyncedPref } from '../../hooks/useSyncedPref';
import { useUndo } from '../../hooks/useUndo';
import { NotesButton } from '../NotesButton';
import { CellValue, CellValueText } from '../spreadsheet/CellValue';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';
import { useFormat } from '../spreadsheet/useFormat';

import { BudgetMenu as EnvelopeBudgetMenu } from './envelope/BudgetMenu';
import { MonthsContext } from './MonthsContext';
import { BudgetMenu as TrackingBudgetMenu } from './tracking/BudgetMenu';
import { getScrollbarWidth, separateGroups } from './util';

const ROW_HEIGHT = 30;

const categoryRowStyle: CSSProperties = {
  height: ROW_HEIGHT,
  backgroundColor: theme.tableBackground,
  borderColor: 'red',
  padding: '0 15px',
};

const categoryGroupRowStyle: CSSProperties = {
  height: ROW_HEIGHT,
  backgroundColor: theme.tableRowHeaderBackground,
  borderColor: 'red',
  padding: '0 5px',
};

const headerColumnStyle: CSSProperties = {
  flex: 1,
  padding: '0 5px',
  textAlign: 'right',
};

const headerCellStyle: CSSProperties = {
  color: theme.tableHeaderText,
  fontWeight: 600,
};

const hoverVisibleStyle: CSSProperties = {
  '& .hover-visible': {
    opacity: 0,
  },
  '&:hover .hover-visible': {
    opacity: 1,
  },
};

type Item =
  | {
      type: 'expense-group';
      id: `expense-group-${string}`;
      value: CategoryGroupEntity;
    }
  | {
      type: 'expense-category';
      id: `expense-category-${string}`;
      value: CategoryEntity;
      group: CategoryGroupEntity;
    }
  | {
      type: 'income-group';
      id: `income-group-${string}`;
      value: CategoryGroupEntity;
    }
  | {
      type: 'income-category';
      id: `income-category-${string}`;
      value: CategoryEntity;
      group: CategoryGroupEntity;
    }
  | {
      type: 'income-separator';
      id: 'income-separator';
    }
  | {
      type: 'new-group';
      id: 'new-group';
    }
  | {
      type: 'new-category';
      id: 'new-category';
    };

type ColumnDefinition = {
  key: string;
  month: string;
  type: 'category' | 'budgeted' | 'spent' | 'balance';
};

export const BudgetCategories = ({
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
  onToggleHiddenCategories,
  onCollapseAllCategories,
  onExpandAllCategories,
}) => {
  const { t } = useTranslation();
  const [collapsedGroupIds = [], setCollapsedGroupIdsPref] =
    useLocalPref('budget.collapsed');
  const [showHiddenCategories] = useLocalPref('budget.showHiddenCategories');
  function onCollapse(value) {
    setCollapsedGroupIdsPref(value);
  }

  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [groupOfNewCategory, setGroupOfNewCategory] = useState<
    CategoryGroupEntity['id'] | null
  >(null);
  const items: Item[] = useMemo(() => {
    const [expenseGroups, incomeGroup] = separateGroups(categoryGroups);

    const result: Item[] = [];

    const expenseGroupItems: Item[] = Array.prototype.concat.apply(
      [],
      expenseGroups.map(expenseGroup => {
        if (expenseGroup.hidden && !showHiddenCategories) {
          return [];
        }

        const expenseGroupCategories = collapsedGroupIds.includes(
          expenseGroup.id,
        )
          ? []
          : expenseGroup.categories.filter(
              cat => showHiddenCategories || !cat.hidden,
            );

        const expenseGroupItems: Item[] = [
          {
            id: `expense-group-${expenseGroup.id}`,
            type: 'expense-group',
            value: { ...expenseGroup },
          },
        ];

        if (groupOfNewCategory === expenseGroup.id) {
          expenseGroupItems.push({
            id: 'new-category',
            type: 'new-category',
          });
        }

        return [
          ...expenseGroupItems,
          ...expenseGroupCategories.map(cat => ({
            id: `expense-category-${cat.id}`,
            type: 'expense-category',
            value: cat,
            group: expenseGroup,
          })),
        ];
      }),
    );
    result.push(...expenseGroupItems);

    if (isAddingGroup) {
      result.push({
        id: 'new-group',
        type: 'new-group',
      });
    }

    if (incomeGroup) {
      result.push({
        id: 'income-separator',
        type: 'income-separator',
      });

      const incomeGroupItems: Item[] = [
        {
          id: `income-group-${incomeGroup.id}`,
          type: 'income-group',
          value: incomeGroup,
        },
      ];

      if (groupOfNewCategory === incomeGroup.id) {
        incomeGroupItems.push({
          id: 'new-category',
          type: 'new-category',
        });
      }

      const incomeGroupCategories = collapsedGroupIds.includes(incomeGroup.id)
        ? []
        : incomeGroup.categories.filter(
            cat => showHiddenCategories || !cat.hidden,
          );

      incomeGroupItems.push(
        ...incomeGroupCategories.map(
          cat =>
            ({
              id: `income-category-${cat.id}`,
              type: 'income-category',
              value: cat,
              group: incomeGroup,
            }) as Item,
        ),
      );

      result.push(...incomeGroupItems);
    }

    return result;
  }, [
    categoryGroups,
    collapsedGroupIds,
    groupOfNewCategory,
    isAddingGroup,
    showHiddenCategories,
  ]);

  function onToggleCollapse(id: CategoryGroupEntity['id']) {
    if (collapsedGroupIds.includes(id)) {
      onCollapse(collapsedGroupIds.filter(id_ => id_ !== id));
    } else {
      onCollapse([...collapsedGroupIds, id]);
    }
  }

  function onAddGroup() {
    setIsAddingGroup(true);
  }

  function onHideNewGroupInput() {
    setIsAddingGroup(false);
  }

  function onSaveGroupAndClose(group) {
    onSaveGroup?.(group);
    if (group.id === 'new') {
      onHideNewGroupInput();
    }
  }

  function onAddCategory(groupId: CategoryGroupEntity['id']) {
    onCollapse(collapsedGroupIds.filter(c => c !== groupId));
    setGroupOfNewCategory(groupId);
  }

  function onHideNewCategoryInput() {
    setGroupOfNewCategory(null);
  }

  function onSaveCategoryAndClose(category) {
    onSaveCategory?.(category);
    if (category.id === 'new') {
      onHideNewCategoryInput();
    }
  }

  const { months } = useContext(MonthsContext);

  const columns: ColumnDefinition[] = useMemo(
    () =>
      months
        .map((month, index) => ({
          month,
          columns:
            // Only render category name column on the first month.
            (index === 0
              ? ['category', 'budgeted', 'spent', 'balance']
              : ['budgeted', 'spent', 'balance']) as Array<
              ColumnDefinition['type']
            >,
        }))
        .flatMap(({ columns, month }) =>
          columns.map(type => ({ type, month, key: `${type}-${month}` })),
        ),
    [months],
  );

  return (
    <ResizableTableContainer
      style={{
        marginLeft: 2.5,
        marginRight: 2.5 + getScrollbarWidth(),
        marginBottom: 10,
      }}
    >
      <Table
        aria-label={t('Budget table')}
        style={{
          backgroundColor: theme.tableBackground,
          borderRadius: 4,
        }}
        // dragAndDropHooks={dragAndDropHooks}
      >
        <TableHeader
          data-testid="budget-totals"
          style={{
            backgroundColor: theme.tableBackground,
            borderRadius: 4,
            height: 50,
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
          columns={columns}
          dependencies={[
            onToggleHiddenCategories,
            onCollapseAllCategories,
            onExpandAllCategories,
          ]}
        >
          {column => {
            switch (column.type) {
              case 'category':
                return (
                  <CategoryColumn
                    key={column.key}
                    id={column.key}
                    month={column.month}
                    onToggleHiddenCategories={onToggleHiddenCategories}
                    onCollapseAllCategories={onCollapseAllCategories}
                    onExpandAllCategories={onExpandAllCategories}
                  />
                );
              case 'budgeted':
                return (
                  <BudgetedColumn
                    key={column.key}
                    id={column.key}
                    month={column.month}
                  />
                );
              case 'spent':
                return (
                  <SpentColumn
                    key={column.key}
                    id={column.key}
                    month={column.month}
                  />
                );
              case 'balance':
                return (
                  <BalanceColumn
                    key={column.key}
                    id={column.key}
                    month={column.month}
                  />
                );
              default:
                throw new Error(`Unrecognized column type: ${column.type}`);
            }
          }}
        </TableHeader>
        <TableBody
          items={items}
          dependencies={[
            columns,
            collapsedGroupIds,
            onToggleCollapse,
            onAddCategory,
            groupOfNewCategory,
            onHideNewCategoryInput,
            onHideNewGroupInput,
            onSaveCategoryAndClose,
            onSaveGroupAndClose,
            onAddGroup,
            onBudgetAction,
          ]}
        >
          {item => {
            switch (item.type) {
              case 'expense-group':
                return (
                  <ExpenseGroupRow
                    id={item.id}
                    columns={columns}
                    item={item}
                    isCollapsed={collapsedGroupIds.includes(item.value.id)}
                    onToggleCollapse={group => onToggleCollapse(group.id)}
                    onAddCategory={group => onAddCategory(group.id)}
                    onDelete={group => onDeleteGroup(group.id)}
                    onToggleVisibilty={group => {
                      onSaveGroup({
                        ...group,
                        hidden: !item.value.hidden,
                      });
                    }}
                    onApplyBudgetTemplatesInGroup={group =>
                      onApplyBudgetTemplatesInGroup(
                        group.categories
                          .filter(cat => !cat.hidden)
                          .map(cat => cat.id),
                      )
                    }
                  />
                );
              case 'expense-category':
                return (
                  <ExpenseCategoryRow
                    id={item.id}
                    columns={columns}
                    item={item}
                    onBudgetAction={onBudgetAction}
                    onShowActivity={(category, month) =>
                      onShowActivity(category.id, month)
                    }
                    onDeleteCategory={category => onDeleteCategory(category.id)}
                    onToggleVisibility={category => {
                      onSaveCategory({
                        ...category,
                        hidden: !item.value.hidden,
                      });
                    }}
                  />
                );
              case 'income-separator':
                return (
                  <AddGroupButtonRow
                    id="add-group-row"
                    columns={columns}
                    onAddGroup={onAddGroup}
                  />
                );
              case 'income-group':
                return (
                  <IncomeGroupRow
                    id={item.id}
                    columns={columns}
                    item={item}
                    isCollapsed={collapsedGroupIds.includes(item.value.id)}
                    onToggleCollapse={group => onToggleCollapse(group.id)}
                    onAddCategory={group => onAddCategory(group.id)}
                    onDelete={group => onDeleteGroup(group.id)}
                    onToggleVisibilty={() => {
                      onSaveGroup({
                        ...item.value,
                        hidden: !item.value.hidden,
                      });
                    }}
                    onApplyBudgetTemplatesInGroup={group =>
                      onApplyBudgetTemplatesInGroup(
                        group.categories
                          .filter(cat => !cat.hidden)
                          .map(cat => cat.id),
                      )
                    }
                  />
                );
              case 'income-category':
                return (
                  <IncomeCategoryRow
                    id={item.id}
                    columns={columns}
                    item={item}
                    onBudgetAction={onBudgetAction}
                    onDeleteCategory={category => onDeleteCategory(category)}
                    onToggleVisibility={category => {
                      onSaveCategory({
                        ...category,
                        hidden: !item.value.hidden,
                      });
                    }}
                  />
                );
              case 'new-category':
                return (
                  <NewCategoryRow
                    id="new-category-row"
                    columns={columns}
                    onUpdate={name => {
                      if (name) {
                        onSaveCategoryAndClose({
                          id: 'new',
                          name,
                          cat_group: groupOfNewCategory,
                          is_income:
                            groupOfNewCategory ===
                            categoryGroups.find(g => g.is_income).id,
                        });
                      } else {
                        onHideNewCategoryInput();
                      }
                    }}
                  />
                );
              case 'new-group':
                return (
                  <NewCategoryGroupRow
                    id="new-category-group-row"
                    columns={columns}
                    onUpdate={name => {
                      if (name) {
                        onSaveGroupAndClose({ id: 'new', name });
                      } else {
                        onHideNewGroupInput();
                      }
                    }}
                  />
                );
              default:
                throw new Error(`Unrecognized item: ${JSON.stringify(item)}`);
            }
          }}
        </TableBody>
      </Table>
    </ResizableTableContainer>
  );
};

BudgetCategories.displayName = 'BudgetCategories';

type AddGroupButtonRowProps = ComponentPropsWithoutRef<
  typeof ReactAriaRow<ColumnDefinition>
> & {
  onAddGroup: () => void;
};

function AddGroupButtonRow({
  onAddGroup,
  style,
  ...props
}: AddGroupButtonRowProps) {
  return (
    <ReactAriaRow style={{ ...categoryRowStyle, ...style }} {...props}>
      {column =>
        column.type === 'category' ? (
          <ReactAriaCell>
            <View
              style={{
                width: 200,
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
              }}
            >
              <Button onPress={onAddGroup} style={{ fontSize: 12, margin: 10 }}>
                <Trans>Add group</Trans>
              </Button>
            </View>
          </ReactAriaCell>
        ) : (
          <ReactAriaCell />
        )
      }
    </ReactAriaRow>
  );
}

type NewCategoryRowProps = ComponentPropsWithoutRef<
  typeof ReactAriaRow<ColumnDefinition>
> & {
  onUpdate: (name: string) => void;
};

function NewCategoryRow({ onUpdate, style, ...props }: NewCategoryRowProps) {
  return (
    <ReactAriaRow style={{ ...categoryRowStyle, ...style }} {...props}>
      {column =>
        column.type === 'category' ? (
          <ReactAriaCell>
            <Input
              autoFocus
              placeholder="New category name"
              onUpdate={onUpdate}
            />
          </ReactAriaCell>
        ) : (
          <ReactAriaCell />
        )
      }
    </ReactAriaRow>
  );
}

type NewCategoryGroupRowProps = ComponentPropsWithoutRef<
  typeof ReactAriaRow<ColumnDefinition>
> & {
  onUpdate: (name: string) => void;
};

function NewCategoryGroupRow({
  onUpdate,
  style,
  ...props
}: NewCategoryGroupRowProps) {
  return (
    <ReactAriaRow style={{ ...categoryGroupRowStyle, ...style }} {...props}>
      {column =>
        column.type === 'category' ? (
          <ReactAriaCell>
            <Input
              autoFocus
              placeholder="New category group name"
              onUpdate={onUpdate}
            />
          </ReactAriaCell>
        ) : (
          <ReactAriaCell />
        )
      }
    </ReactAriaRow>
  );
}

type CategorySpentCellProps = ComponentPropsWithoutRef<typeof ReactAriaCell> & {
  month: string;
  category: CategoryEntity;
  onShowActivity: (category: CategoryEntity, month: string) => void;
};

function CategorySpentCell({
  month,
  category,
  onShowActivity,
  style,
  ...props
}: CategorySpentCellProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  const categorySpentBinding =
    budgetType === 'rollover'
      ? envelopeBudget.catSumAmount(category.id)
      : trackingBudget.catSumAmount(category.id);

  const { pressProps } = usePress({
    onPress: () => onShowActivity(category, month),
  });

  return (
    <ReactAriaCell style={{ textAlign: 'right', ...style }} {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <CellValue<'envelope-budget', 'sum-amount'>
          type="financial"
          binding={categorySpentBinding}
        >
          {props => (
            <CellValueText
              {...pressProps}
              {...props}
              className={css({
                '&:hover': {
                  cursor: 'pointer',
                  textDecoration: 'underline',
                },
              })}
            />
          )}
        </CellValue>
      </NamespaceContext.Provider>
    </ReactAriaCell>
  );
}

type CategoryBalanceCellProps = ComponentPropsWithoutRef<
  typeof ReactAriaCell
> & {
  month: string;
  category: CategoryEntity;
};

function CategoryBalanceCell({
  month,
  category,
  style,
  ...props
}: CategoryBalanceCellProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  const categoryBalanceBinding =
    budgetType === 'rollover'
      ? envelopeBudget.catBalance(category.id)
      : trackingBudget.catBalance(category.id);

  return (
    <ReactAriaCell style={{ textAlign: 'right', ...style }} {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <CellValue<'envelope-budget', 'leftover'>
          type="financial"
          binding={categoryBalanceBinding}
        >
          {props => (
            <CellValueText
              {...props}
              className={css({
                '&:hover': {
                  cursor: 'pointer',
                  textDecoration: 'underline',
                },
              })}
            />
          )}
        </CellValue>
      </NamespaceContext.Provider>
    </ReactAriaCell>
  );
}

type CategoryGroupBudgetedCellProps = ComponentPropsWithoutRef<
  typeof ReactAriaCell
> & {
  month: string;
  categoryGroup: CategoryGroupEntity;
};

function CategoryGroupBudgetedCell({
  month,
  categoryGroup,
  style,
  ...props
}: CategoryGroupBudgetedCellProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  const groupBudgetedBinding =
    budgetType === 'rollover'
      ? envelopeBudget.groupBudgeted(categoryGroup.id)
      : trackingBudget.groupBudgeted(categoryGroup.id);

  return (
    <ReactAriaCell style={{ textAlign: 'right', ...style }} {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <CellValue<'envelope-budget', 'group-budget'>
          type="financial"
          binding={groupBudgetedBinding}
        />
      </NamespaceContext.Provider>
    </ReactAriaCell>
  );
}

type CategoryGroupSpentCellProps = ComponentPropsWithoutRef<
  typeof ReactAriaCell
> & {
  month: string;
  categoryGroup: CategoryGroupEntity;
};

function CategoryGroupSpentCell({
  month,
  categoryGroup,
  style,
  ...props
}: CategoryGroupSpentCellProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  const groupSpentBinding =
    budgetType === 'rollover'
      ? envelopeBudget.groupSumAmount(categoryGroup.id)
      : trackingBudget.groupSumAmount(categoryGroup.id);

  return (
    <ReactAriaCell style={{ textAlign: 'right', ...style }} {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <CellValue<'envelope-budget', 'group-sum-amount'>
          type="financial"
          binding={groupSpentBinding}
        />
      </NamespaceContext.Provider>
    </ReactAriaCell>
  );
}

type CategoryGroupBalanceCellProps = ComponentPropsWithoutRef<
  typeof ReactAriaCell
> & {
  month: string;
  categoryGroup: CategoryGroupEntity;
};

function CategoryGroupBalanceCell({
  month,
  categoryGroup,
  style,
  ...props
}: CategoryGroupBalanceCellProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  const groupBalanceBinding =
    budgetType === 'rollover'
      ? envelopeBudget.groupBalance(categoryGroup.id)
      : trackingBudget.groupBalance(categoryGroup.id);

  return (
    <ReactAriaCell style={{ textAlign: 'right', ...style }} {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <CellValue<'envelope-budget', 'group-leftover'>
          type="financial"
          binding={groupBalanceBinding}
        />
      </NamespaceContext.Provider>
    </ReactAriaCell>
  );
}

type ExpenseGroupRowProps = ComponentPropsWithoutRef<
  typeof ReactAriaRow<ColumnDefinition>
> & {
  item: {
    type: 'expense-group';
    id: `expense-group-${string}`;
    value: CategoryGroupEntity;
  };
  isCollapsed: boolean;
  onToggleCollapse: (categoryGroup: CategoryGroupEntity) => void;
  onAddCategory: (categoryGroup: CategoryGroupEntity) => void;
  onDelete: (categoryGroup: CategoryGroupEntity) => void;
  onToggleVisibilty: (categoryGroup: CategoryGroupEntity) => void;
  onApplyBudgetTemplatesInGroup: (categoryGroup: CategoryGroupEntity) => void;
};

function ExpenseGroupRow({
  item,
  isCollapsed,
  onToggleCollapse,
  onAddCategory,
  onDelete,
  onToggleVisibilty,
  onApplyBudgetTemplatesInGroup,
  style,
  ...props
}: ExpenseGroupRowProps) {
  return (
    <ReactAriaRow
      style={{
        ...categoryGroupRowStyle,
        ...style,
      }}
      {...props}
    >
      {column => {
        switch (column.type) {
          case 'category':
            return (
              <CategoryGroupNameCell
                month={column.month}
                categoryGroup={item.value}
                isCollapsed={isCollapsed}
                onToggleCollapse={onToggleCollapse}
                onAddCategory={onAddCategory}
                onDelete={onDelete}
                onToggleVisibilty={onToggleVisibilty}
                onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
              />
            );
          case 'budgeted':
            return (
              <CategoryGroupBudgetedCell
                month={column.month}
                categoryGroup={item.value}
              />
            );
          case 'spent':
            return (
              <CategoryGroupSpentCell
                month={column.month}
                categoryGroup={item.value}
              />
            );
          case 'balance':
            return (
              <CategoryGroupBalanceCell
                month={column.month}
                categoryGroup={item.value}
              />
            );
          default:
            throw new Error(`Unrecognized column type: ${column.type}`);
        }
      }}
    </ReactAriaRow>
  );
}

type ExpenseCategoryRowProps = ComponentPropsWithoutRef<
  typeof ReactAriaRow<ColumnDefinition>
> & {
  item: {
    type: 'expense-category';
    id: `expense-category-${string}`;
    value: CategoryEntity;
    group: CategoryGroupEntity;
  };
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  onShowActivity: (category: CategoryEntity, month: string) => void;
  onDeleteCategory: (category: CategoryEntity) => void;
  onToggleVisibility: (category: CategoryEntity) => void;
};

function ExpenseCategoryRow({
  item,
  onBudgetAction,
  onShowActivity,
  onDeleteCategory,
  onToggleVisibility,
  style,
  ...props
}: ExpenseCategoryRowProps) {
  return (
    <ReactAriaRow
      style={{
        ...categoryRowStyle,
        ...style,
      }}
      {...props}
    >
      {column => {
        switch (column.type) {
          case 'category':
            return (
              <CategoryNameCell
                month={column.month}
                category={item.value}
                categoryGroup={item.group}
                onDeleteCategory={onDeleteCategory}
                onToggleVisibility={onToggleVisibility}
              />
            );
          case 'budgeted':
            return (
              <CategoryBudgetedCell
                month={column.month}
                category={item.value}
                onBudgetAction={onBudgetAction}
              />
            );
          case 'spent':
            return (
              <CategorySpentCell
                month={column.month}
                category={item.value}
                onShowActivity={onShowActivity}
              />
            );
          case 'balance':
            return (
              <CategoryBalanceCell month={column.month} category={item.value} />
            );
          default:
            throw new Error(`Unrecognized column type: ${column.type}`);
        }
      }}
    </ReactAriaRow>
  );
}

type IncomeGroupRowProps = ComponentPropsWithoutRef<
  typeof ReactAriaRow<ColumnDefinition>
> & {
  item: {
    type: 'income-group';
    id: `income-group-${string}`;
    value: CategoryGroupEntity;
  };
  isCollapsed: boolean;
  onToggleCollapse: (categoryGroup: CategoryGroupEntity) => void;
  onAddCategory: (categoryGroup: CategoryGroupEntity) => void;
  onDelete: (categoryGroup: CategoryGroupEntity) => void;
  onToggleVisibilty: (categoryGroup: CategoryGroupEntity) => void;
  onApplyBudgetTemplatesInGroup: (categoryGroup: CategoryGroupEntity) => void;
};

function IncomeGroupRow({
  item,
  isCollapsed,
  onToggleCollapse,
  onAddCategory,
  onDelete,
  onToggleVisibilty,
  onApplyBudgetTemplatesInGroup,
  style,
  ...props
}: IncomeGroupRowProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  return budgetType === 'rollover' ? (
    <ReactAriaRow
      style={{
        ...categoryGroupRowStyle,
        ...style,
      }}
      {...props}
    >
      {column => {
        switch (column.type) {
          case 'category':
            return (
              <CategoryGroupNameCell
                month={column.month}
                categoryGroup={item.value}
                isCollapsed={isCollapsed}
                onToggleCollapse={onToggleCollapse}
                onAddCategory={onAddCategory}
                onDelete={onDelete}
                onToggleVisibilty={onToggleVisibilty}
                onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
              />
            );
          case 'budgeted':
            return <ReactAriaCell />;
          case 'spent':
            return <ReactAriaCell />;
          case 'balance':
            return (
              <CategoryGroupBalanceCell
                month={column.month}
                categoryGroup={item.value}
              />
            );
          default:
            throw new Error(`Unrecognized column type: ${column.type}`);
        }
      }}
    </ReactAriaRow>
  ) : (
    <ReactAriaRow
      style={{
        ...categoryGroupRowStyle,
        ...style,
      }}
      {...props}
    >
      {column => {
        switch (column.type) {
          case 'category':
            return (
              <CategoryGroupNameCell
                month={column.month}
                categoryGroup={item.value}
                isCollapsed={isCollapsed}
                onToggleCollapse={onToggleCollapse}
                onAddCategory={onAddCategory}
                onDelete={onDelete}
                onToggleVisibilty={onToggleVisibilty}
                onApplyBudgetTemplatesInGroup={onApplyBudgetTemplatesInGroup}
              />
            );
          case 'budgeted':
            return (
              <CategoryGroupBudgetedCell
                month={column.month}
                categoryGroup={item.value}
              />
            );
          case 'spent':
            return <ReactAriaCell />;
          case 'balance':
            return (
              <CategoryGroupBalanceCell
                month={column.month}
                categoryGroup={item.value}
              />
            );
          default:
            throw new Error(`Unrecognized column type: ${column.type}`);
        }
      }}
    </ReactAriaRow>
  );
}

type IncomeCategoryRowProps = ComponentPropsWithoutRef<
  typeof ReactAriaRow<ColumnDefinition>
> & {
  item: {
    type: 'income-category';
    id: `income-category-${string}`;
    value: CategoryEntity;
    group: CategoryGroupEntity;
  };
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  onDeleteCategory: (category: CategoryEntity) => void;
  onToggleVisibility: (category: CategoryEntity) => void;
};

function IncomeCategoryRow({
  item,
  onBudgetAction,
  onDeleteCategory,
  onToggleVisibility,
  style,
  ...props
}: IncomeCategoryRowProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  return budgetType === 'rollover' ? (
    <ReactAriaRow
      style={{
        ...categoryRowStyle,
        ...style,
      }}
      {...props}
    >
      {column => {
        switch (column.type) {
          case 'category':
            return (
              <CategoryNameCell
                month={column.month}
                category={item.value}
                categoryGroup={item.group}
                onDeleteCategory={onDeleteCategory}
                onToggleVisibility={onToggleVisibility}
              />
            );
          case 'budgeted':
            return <ReactAriaCell />;
          case 'spent':
            return <ReactAriaCell />;
          case 'balance':
            return (
              <CategoryBalanceCell month={column.month} category={item.value} />
            );
          default:
            throw new Error(`Unrecognized column type: ${column.type}`);
        }
      }}
    </ReactAriaRow>
  ) : (
    <ReactAriaRow
      style={{
        ...categoryRowStyle,
        ...style,
      }}
      {...props}
    >
      {column => {
        switch (column.type) {
          case 'category':
            return (
              <CategoryNameCell
                month={column.month}
                category={item.value}
                categoryGroup={item.group}
                onDeleteCategory={onDeleteCategory}
                onToggleVisibility={onToggleVisibility}
              />
            );
          case 'budgeted':
            return (
              <CategoryBudgetedCell
                month={column.month}
                category={item.value}
                onBudgetAction={onBudgetAction}
              />
            );
          case 'spent':
            return <ReactAriaCell />;
          case 'balance':
            return (
              <CategoryBalanceCell month={column.month} category={item.value} />
            );
          default:
            throw new Error(`Unrecognized column type: ${column.type}`);
        }
      }}
    </ReactAriaRow>
  );
}

const BudgetedInput = ({ value }: { value: number }) => {
  const format = useFormat();
  const [currentAmount, setCurrentAmount] = useState<string | null>(null);

  return (
    <Input
      value={currentAmount ?? format(value, 'financial')}
      onFocus={e => e.target.select()}
      style={{
        textAlign: 'right',
      }}
      onChangeValue={newValue => {
        setCurrentAmount(newValue);
      }}
      onUpdate={newValue => {
        setCurrentAmount(format(currencyToInteger(newValue), 'financial'));
      }}
    />
  );
};

type CategoryBudgetedCellProps = ComponentPropsWithoutRef<
  typeof ReactAriaCell
> & {
  month: string;
  category: CategoryEntity;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
};

function CategoryBudgetedCell({
  month,
  category,
  onBudgetAction,
  ...props
}: CategoryBudgetedCellProps) {
  const { t } = useTranslation();
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const budgetedBinding =
    budgetType === 'rollover'
      ? envelopeBudget.catBudgeted(category.id)
      : trackingBudget.catBudgeted(category.id);

  const BudgetMenuComponent =
    budgetType === 'rollover' ? EnvelopeBudgetMenu : TrackingBudgetMenu;

  const { showUndoNotification } = useUndo();

  return (
    <ReactAriaCell {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <View
          className={css({
            flexDirection: 'row',
            alignItems: 'center',
            ...hoverVisibleStyle,
          })}
        >
          <DialogTrigger>
            <Button
              variant="bare"
              aria-label={t('Budget menu')}
              className={cx('hover-visible', css({ marginLeft: 5 }))}
              onPress={() => setIsMenuOpen(true)}
            >
              <SvgCheveronDown width={12} height={12} />
            </Button>

            <Popover
              placement="bottom start"
              isOpen={isMenuOpen}
              onOpenChange={() => setIsMenuOpen(false)}
              style={{ width: 200 }}
              isNonModal
            >
              <BudgetMenuComponent
                onCopyLastMonthAverage={() => {
                  onBudgetAction(month, 'copy-single-last', {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: t(`Budget set to last month’s budget.`),
                  });
                  setIsMenuOpen(false);
                }}
                onSetMonthsAverage={numberOfMonths => {
                  if (
                    numberOfMonths !== 3 &&
                    numberOfMonths !== 6 &&
                    numberOfMonths !== 12
                  ) {
                    return;
                  }
                  onBudgetAction(month, `set-single-${numberOfMonths}-avg`, {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: t(
                      'Budget set to {{numberOfMonths}}-month average.',
                      { numberOfMonths },
                    ),
                  });
                  setIsMenuOpen(false);
                }}
                onApplyBudgetTemplate={() => {
                  onBudgetAction(month, 'apply-single-category-template', {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: t(`Budget template applied.`),
                  });
                  setIsMenuOpen(false);
                }}
              />
            </Popover>
          </DialogTrigger>
          <View>
            <CellValue<'envelope-budget' | 'tracking-budget', 'budget'>
              type="financial"
              binding={budgetedBinding}
            >
              {({ value: budgetedAmount }) => (
                <BudgetedInput value={budgetedAmount} />
              )}
            </CellValue>
          </View>
        </View>
      </NamespaceContext.Provider>
      {/* <SheetCell
        name="budget"
        // exposed={editing}
        // focused={editing}
        width="flex"
        // onExpose={() => onEdit(category.id, month)}
        style={{ ...(false ? { zIndex: 100 } : {}), ...styles.tnum }}
        textAlign="right"
        valueStyle={{
          cursor: 'default',
          margin: 1,
          padding: '0 4px',
          borderRadius: 4,
          ':hover': {
            boxShadow: 'inset 0 0 0 1px ' + theme.mobileAccountShadow,
            backgroundColor: theme.tableBackground,
          },
        }}
        valueProps={{
          binding: envelopeBudget.catBudgeted(item.value?.id),
          type: 'financial',
          getValueStyle: makeAmountGrey,
          formatExpr: expr => {
            return integerToCurrency(expr);
          },
          unformatExpr: expr => {
            return amountToInteger(evalArithmetic(expr, 0));
          },
        }}
        inputProps={{
          onBlur: () => {
            // onEdit(null);
          },
          style: {
            backgroundColor: theme.tableBackground,
          },
        }}
        // onSave={amount => {
        //   onBudgetAction(month, 'budget-amount', {
        //     category: category.id,
        //     amount,
        //   });
        // }}
      /> */}
    </ReactAriaCell>
  );
}

type CategoryGroupNameCellProps = ComponentPropsWithoutRef<
  typeof ReactAriaCell
> & {
  month: string;
  categoryGroup: CategoryGroupEntity;
  isCollapsed: boolean;
  onToggleCollapse: (categoryGroup: CategoryGroupEntity) => void;
  onAddCategory: (categoryGroup: CategoryGroupEntity) => void;
  onDelete: (categoryGroup: CategoryGroupEntity) => void;
  onToggleVisibilty: (categoryGroup: CategoryGroupEntity) => void;
  onApplyBudgetTemplatesInGroup: (categoryGroup: CategoryGroupEntity) => void;
};

function CategoryGroupNameCell({
  month,
  categoryGroup,
  isCollapsed,
  onToggleCollapse,
  onAddCategory,
  onDelete,
  onToggleVisibilty,
  onApplyBudgetTemplatesInGroup,
  ...props
}: CategoryGroupNameCellProps) {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');

  return (
    <ReactAriaCell {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <View
          className={css({
            paddingLeft: 5,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            ...hoverVisibleStyle,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Button
                variant="bare"
                onPress={() => onToggleCollapse(categoryGroup)}
              >
                <SvgExpandArrow
                  width={8}
                  height={8}
                  style={{
                    flexShrink: 0,
                    transition: 'transform .1s',
                    transform: isCollapsed ? 'rotate(-90deg)' : '',
                  }}
                />
              </Button>
              <Text style={{ fontWeight: 600 }}>{categoryGroup.name}</Text>
            </View>
            <DialogTrigger>
              <Button
                variant="bare"
                className={cx('hover-visible', css({ marginLeft: 5 }))}
                onPress={() => {
                  // resetPosition();
                  setIsMenuOpen(true);
                }}
              >
                <SvgCheveronDown width={12} height={12} />
              </Button>

              <Popover
                placement="bottom start"
                isOpen={isMenuOpen}
                onOpenChange={() => setIsMenuOpen(false)}
                style={{ width: 200, margin: 1 }}
                isNonModal
              >
                <Menu
                  onMenuSelect={type => {
                    if (type === 'rename') {
                      // onEdit(categoryGroup.id);
                    } else if (type === 'add-category') {
                      onAddCategory(categoryGroup);
                    } else if (type === 'delete') {
                      onDelete(categoryGroup);
                    } else if (type === 'toggle-visibility') {
                      // onSave({ ...categoryGroup, hidden: !categoryGroup.hidden });
                      onToggleVisibilty(categoryGroup);
                    } else if (type === 'apply-multiple-category-template') {
                      onApplyBudgetTemplatesInGroup(categoryGroup);
                    }
                    setIsMenuOpen(false);
                  }}
                  items={[
                    { name: 'add-category', text: t('Add category') },
                    { name: 'rename', text: t('Rename') },
                    !categoryGroup.is_income && {
                      name: 'toggle-visibility',
                      text: categoryGroup.hidden ? 'Show' : 'Hide',
                    },
                    // onDelete && { name: 'delete', text: t('Delete') },
                    { name: 'delete', text: t('Delete') },
                    ...(isGoalTemplatesEnabled
                      ? [
                          {
                            name: 'apply-multiple-category-template',
                            text: t('Apply budget templates'),
                          },
                        ]
                      : []),
                  ]}
                />
              </Popover>
            </DialogTrigger>
          </View>
          <View>
            <NotesButton
              id={categoryGroup.id}
              defaultColor={theme.pageTextLight}
            />
          </View>
        </View>
      </NamespaceContext.Provider>
    </ReactAriaCell>
  );
}

type CategoryNameCellProps = ComponentPropsWithoutRef<typeof ReactAriaCell> & {
  month: string;
  category: CategoryEntity;
  categoryGroup: CategoryGroupEntity;
  onDeleteCategory: (category: CategoryEntity) => void;
  onToggleVisibility: (category: CategoryEntity) => void;
};

function CategoryNameCell({
  month,
  category,
  categoryGroup,
  onDeleteCategory,
  onToggleVisibility,
  ...props
}: CategoryNameCellProps) {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <ReactAriaCell {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <View
          className={css({
            paddingLeft: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            ...hoverVisibleStyle,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text>{category.name}</Text>
            <DialogTrigger>
              <Button
                variant="bare"
                className={cx('hover-visible', css({ marginLeft: 5 }))}
                onPress={() => {
                  // resetPosition();
                  setIsMenuOpen(true);
                }}
              >
                <SvgCheveronDown width={12} height={12} />
              </Button>

              <Popover
                placement="bottom start"
                isOpen={isMenuOpen}
                onOpenChange={() => setIsMenuOpen(false)}
                style={{
                  width: 200,
                }}
                isNonModal
              >
                <Menu
                  onMenuSelect={type => {
                    if (type === 'rename') {
                      // onEditName(category.id);
                    } else if (type === 'delete') {
                      onDeleteCategory(category);
                    } else if (type === 'toggle-visibility') {
                      // onSave({ ...category, hidden: !category.hidden });
                      onToggleVisibility(category);
                    }
                    setIsMenuOpen(false);
                  }}
                  items={[
                    { name: 'rename', text: t('Rename') },
                    !categoryGroup?.hidden && {
                      name: 'toggle-visibility',
                      text: category.hidden ? t('Show') : t('Hide'),
                    },
                    { name: 'delete', text: t('Delete') },
                  ]}
                />
              </Popover>
            </DialogTrigger>
          </View>
          <View>
            <NotesButton id={category.id} defaultColor={theme.pageTextLight} />
          </View>
        </View>
      </NamespaceContext.Provider>
    </ReactAriaCell>
  );
}

type CategoryColumnProps = ComponentPropsWithoutRef<typeof ResizableColumn> & {
  month: string;
  onToggleHiddenCategories: () => void;
  onCollapseAllCategories: () => void;
  onExpandAllCategories: () => void;
};

function CategoryColumn({
  month,
  onToggleHiddenCategories,
  onCollapseAllCategories,
  onExpandAllCategories,
  ...props
}: CategoryColumnProps) {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <ResizableColumn isRowHeader minWidth={200} {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <View
          style={{
            color: theme.pageTextLight,
            flex: 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingLeft: 15,
          }}
        >
          <Text style={{ color: theme.tableHeaderText }}>
            <Trans>Category</Trans>
          </Text>
          <DialogTrigger>
            <Button
              variant="bare"
              aria-label={t('Menu')}
              onPress={() => setIsMenuOpen(true)}
            >
              <SvgDotsHorizontalTriple
                width={15}
                height={15}
                style={{ color: theme.pageTextLight }}
              />
            </Button>

            <Popover
              isOpen={isMenuOpen}
              onOpenChange={() => setIsMenuOpen(false)}
            >
              <Menu
                onMenuSelect={type => {
                  if (type === 'toggle-visibility') {
                    onToggleHiddenCategories();
                  } else if (type === 'expand-all-categories') {
                    onExpandAllCategories();
                  } else if (type === 'collapse-all-categories') {
                    onCollapseAllCategories();
                  }
                  setIsMenuOpen(false);
                }}
                items={[
                  {
                    name: 'toggle-visibility',
                    text: t('Toggle hidden categories'),
                  },
                  {
                    name: 'expand-all-categories',
                    text: t('Expand all'),
                  },
                  {
                    name: 'collapse-all-categories',
                    text: t('Collapse all'),
                  },
                ]}
              />
            </Popover>
          </DialogTrigger>
        </View>
      </NamespaceContext.Provider>
    </ResizableColumn>
  );
}

type BudgetedColumnProps = ComponentPropsWithoutRef<typeof ResizableColumn> & {
  month: string;
};

function BudgetedColumn({ month, ...props }: BudgetedColumnProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  const totalBudgetedBinding =
    budgetType === 'rollover'
      ? envelopeBudget.totalBudgeted
      : trackingBudget.totalBudgetedExpense;

  return (
    <ResizableColumn {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <View style={headerColumnStyle}>
          <Text style={{ color: theme.tableHeaderText }}>
            <Trans>Budgeted</Trans>
          </Text>
          <CellValue<'envelope-budget' | 'tracking-budget', 'total-budgeted'>
            binding={totalBudgetedBinding}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                value={-props.value}
                style={headerCellStyle}
              />
            )}
          </CellValue>
        </View>
      </NamespaceContext.Provider>
    </ResizableColumn>
  );
}

type SpentColumnProps = ComponentPropsWithoutRef<typeof ResizableColumn> & {
  month: string;
};

function SpentColumn({ month, ...props }: SpentColumnProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  const totalSpentBinding =
    budgetType === 'rollover'
      ? envelopeBudget.totalSpent
      : trackingBudget.totalSpent;

  return (
    <ResizableColumn {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <View style={headerColumnStyle}>
          <Text style={{ color: theme.tableHeaderText }}>Spent</Text>
          <CellValue<'envelope-budget' | 'tracking-budget', 'total-spent'>
            binding={totalSpentBinding}
            type="financial"
          >
            {props => <CellValueText {...props} style={headerCellStyle} />}
          </CellValue>
        </View>
        <ColumnResizer />
      </NamespaceContext.Provider>
    </ResizableColumn>
  );
}

type BalanceColumnProps = ComponentPropsWithoutRef<typeof ResizableColumn> & {
  month: string;
};

function BalanceColumn({ month, ...props }: BalanceColumnProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  const balanceBinding =
    budgetType === 'rollover'
      ? envelopeBudget.totalBalance
      : trackingBudget.totalLeftover;

  return (
    <Column {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <View style={headerColumnStyle}>
          <Text style={{ color: theme.tableHeaderText }}>Balance</Text>
          <CellValue<'envelope-budget' | 'tracking-budget', 'total-leftover'>
            binding={balanceBinding}
            type="financial"
          >
            {props => <CellValueText {...props} style={headerCellStyle} />}
          </CellValue>
        </View>
      </NamespaceContext.Provider>
    </Column>
  );
}

type ResizableColumnProps = ComponentPropsWithoutRef<typeof Column>;

function ResizableColumn({ children, ...props }: ResizableColumnProps) {
  return (
    <Column {...props}>
      {renderProps => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {typeof children === 'function' ? children(renderProps) : children}
          <ColumnResizer
            data-resizable-direction="left"
            className={css({
              width: 10,
              backgroundColor: 'grey',
              height: 20,
              flex: '0 0 auto',
              touchAction: 'none',
              boxSizing: 'border-box',
              border: 5,
              borderStyle: 'none solid',
              borderColor: 'transparent',
              backgroundClip: 'content-box',

              '&[data-resizable-direction=both]': {
                cursor: 'ew-resize',
              },

              '&[data-resizable-direction=left]': {
                cursor: 'e-resize',
              },

              '&[data-resizable-direction=right]': {
                cursor: 'w-resize',
              },
            })}
          />
        </View>
      )}
    </Column>
  );
}
