import React, {
  useState,
  useMemo,
  useContext,
  type ComponentPropsWithoutRef,
  useCallback,
} from 'react';
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
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { type CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { envelopeBudget, trackingBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { useLocalPref } from '../../hooks/useLocalPref';
import { useSyncedPref } from '../../hooks/useSyncedPref';
import { type SheetNames } from '../spreadsheet';
import { CellValue, CellValueText } from '../spreadsheet/CellValue';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

import { ExpenseCategoryRow } from './ExpenseCategoryRow';
import { ExpenseGroupRow } from './ExpenseGroupRow';
import { IncomeCategoryRow } from './IncomeCategoryRow';
import { IncomeGroupRow } from './IncomeGroupRow';
import { MonthsContext } from './MonthsContext';
import { separateGroups } from './util';

const ROW_HEIGHT = 30;

export const balanceColumnPaddingStyle: CSSProperties = {
  paddingRight: 8,
};

export const getCategoryRowStyle = (
  category: CategoryEntity | null = null,
  categoryGroup: CategoryGroupEntity | null = null,
): CSSProperties => ({
  height: ROW_HEIGHT,
  backgroundColor: theme.tableBackground,
  padding: '0 15px',
  opacity: category?.hidden || categoryGroup?.hidden ? 0.5 : 1,
});

export const getCategoryGroupRowStyle = (
  categoryGroup: CategoryGroupEntity | null = null,
): CSSProperties => ({
  height: ROW_HEIGHT,
  backgroundColor: theme.tableRowHeaderBackground,
  padding: '0 5px',
  fontWeight: 600,
  opacity: categoryGroup?.hidden ? 0.33 : 1,
});

const headerColumnStyle: CSSProperties = {
  flex: 1,
  padding: '0 5px',
  textAlign: 'right',
};

const headerCellStyle: CSSProperties = {
  color: theme.tableHeaderText,
  fontWeight: 600,
};

export const hoverVisibleStyle: CSSProperties = {
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

export type ColumnDefinition = {
  key: string;
  month: string;
  type: 'category' | 'budgeted' | 'spent' | 'balance';
};

export const BudgetCategories = ({
  categoryGroups,
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
  const onCollapse = useCallback(
    (value: string[]) => {
      setCollapsedGroupIdsPref(value);
    },
    [setCollapsedGroupIdsPref],
  );

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

  const onToggleCollapse = useCallback(
    (id: CategoryGroupEntity['id']) => {
      if (collapsedGroupIds.includes(id)) {
        onCollapse(collapsedGroupIds.filter(id_ => id_ !== id));
      } else {
        onCollapse([...collapsedGroupIds, id]);
      }
    },
    [collapsedGroupIds, onCollapse],
  );

  const onAddGroup = useCallback(() => {
    setIsAddingGroup(true);
  }, []);

  const onHideNewGroupInput = useCallback(() => {
    setIsAddingGroup(false);
  }, []);

  const onSaveGroupAndClose = useCallback(
    (group: CategoryGroupEntity) => {
      onSaveGroup?.(group);
      if (group.id === 'new') {
        onHideNewGroupInput();
      }
    },
    [onHideNewGroupInput, onSaveGroup],
  );

  const onAddCategory = useCallback(
    (groupId: CategoryGroupEntity['id']) => {
      onCollapse(collapsedGroupIds.filter(c => c !== groupId));
      setGroupOfNewCategory(groupId);
    },
    [collapsedGroupIds, onCollapse],
  );

  const onHideNewCategoryInput = useCallback(() => {
    setGroupOfNewCategory(null);
  }, []);

  const onSaveCategoryAndClose = useCallback(
    (category: CategoryEntity) => {
      onSaveCategory?.(category);
      if (category.id === 'new') {
        onHideNewCategoryInput();
      }
    },
    [onHideNewCategoryInput, onSaveCategory],
  );

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
    <View
      style={{
        marginLeft: 4,
        marginRight: 4,
      }}
      onKeyDown={e => {
        if (e.key === 'Escape' && e.target instanceof HTMLElement) {
          e.target.blur();
        }
      }}
    >
      <ResizableTableContainer
        style={{
          height: '100%',
          width: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <Table
          aria-label={t('Budget table')}
          className={css({
            backgroundColor: theme.tableBackground,
            marginBottom: 10,
            borderSpacing: 0,
            'th, td': {
              borderBottom: `1px solid ${theme.tableBorder}`,
            },
            'th:not(:last-child)': {
              borderRight: `1px solid ${theme.tableBorder}`,
            },
            // Add a visible border between category name and the cells.
            'td:first-child': {
              borderRight: `1px solid ${theme.tableBorder}`,
            },
            // Remove the border on the Add Group button row.
            'tr[data-add-group-button-row] td:first-child': {
              borderRight: 'none',
            },
          })}
          // dragAndDropHooks={dragAndDropHooks}
        >
          <TableHeader
            data-testid="budget-totals"
            style={{
              backgroundColor: theme.tableBackground,
              height: 50,
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
            columns={columns}
            dependencies={[
              // Add dependencies here when you pass it in the render function below
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
              // Add dependencies here when you pass it in the render function below
              columns,
              collapsedGroupIds,
              onToggleCollapse,
              onAddCategory,
              groupOfNewCategory,
              onHideNewCategoryInput,
              onHideNewGroupInput,
              onSaveCategoryAndClose,
              onSaveGroupAndClose,
              onBudgetAction,
              onAddGroup,
              onSaveGroup,
              onDeleteGroup,
              onAddCategory,
              onSaveCategory,
              onDeleteCategory,
              onApplyBudgetTemplatesInGroup,
              onShowActivity,
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
                      onRename={(group, newName) =>
                        onSaveGroup({
                          ...group,
                          name: newName,
                        })
                      }
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
                      onRename={(category, newName) =>
                        onSaveCategory({
                          ...category,
                          name: newName,
                        })
                      }
                      onDelete={category => onDeleteCategory(category.id)}
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
                      onRename={(group, newName) =>
                        onSaveGroup({
                          ...group,
                          name: newName,
                        })
                      }
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
                      onRename={(category, newName) =>
                        onSaveCategory({
                          ...category,
                          name: newName,
                        })
                      }
                      onDelete={category => onDeleteCategory(category)}
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
    </View>
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
    <ReactAriaRow
      data-add-group-button-row="true"
      style={{ ...getCategoryRowStyle(), ...style }}
      {...props}
    >
      {column =>
        column.type === 'category' ? (
          <ReactAriaCell>
            <View
              style={{
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
    <ReactAriaRow style={{ ...getCategoryRowStyle(), ...style }} {...props}>
      {column =>
        column.type === 'category' ? (
          <ReactAriaCell>
            <View style={{ flex: 1 }}>
              <Input
                autoFocus
                placeholder="New category name"
                onUpdate={onUpdate}
              />
            </View>
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
    <ReactAriaRow
      style={{ ...getCategoryGroupRowStyle(), ...style }}
      {...props}
    >
      {column =>
        column.type === 'category' ? (
          <ReactAriaCell>
            <View style={{ flex: 1 }}>
              <Input
                autoFocus
                placeholder="New category group name"
                onUpdate={onUpdate}
              />
            </View>
          </ReactAriaCell>
        ) : (
          <ReactAriaCell />
        )
      }
    </ReactAriaRow>
  );
}

export const getHeaderBackgroundStyle = (
  type: 'category' | 'budgeted' | 'spent' | 'balance',
  month: string,
): CSSProperties => {
  if (type === 'category') {
    return { backgroundColor: theme.tableRowHeaderBackground };
  }
  if (monthUtils.isCurrentMonth(month)) {
    return { backgroundColor: theme.budgetHeaderCurrentMonth };
  }
  return { backgroundColor: theme.budgetHeaderOtherMonth };
};

export const getCellBackgroundStyle = (
  type: 'category' | 'budgeted' | 'spent' | 'balance',
  month: string,
): CSSProperties => {
  if (type === 'category') {
    return { backgroundColor: theme.tableBackground };
  }
  if (monthUtils.isCurrentMonth(month)) {
    return { backgroundColor: theme.budgetCurrentMonth };
  }
  return { backgroundColor: theme.budgetOtherMonth };
};

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
  const bindingBudgetType: SheetNames =
    budgetType === 'rollover' ? 'envelope-budget' : 'tracking-budget';

  const totalBudgetedBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.totalBudgeted
      : trackingBudget.totalBudgetedExpense;

  return (
    <ResizableColumn {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <View style={headerColumnStyle}>
          <Text style={{ color: theme.tableHeaderText }}>
            <Trans>Budgeted</Trans>
          </Text>
          <CellValue<typeof bindingBudgetType, typeof totalBudgetedBinding>
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
  const bindingBudgetStyle: SheetNames =
    budgetType === 'rollover' ? 'envelope-budget' : 'tracking-budget';

  const totalSpentBinding =
    bindingBudgetStyle === 'envelope-budget'
      ? envelopeBudget.totalSpent
      : trackingBudget.totalSpent;

  return (
    <ResizableColumn {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <View style={headerColumnStyle}>
          <Text style={{ color: theme.tableHeaderText }}>Spent</Text>
          <CellValue<typeof bindingBudgetStyle, typeof totalSpentBinding>
            binding={totalSpentBinding}
            type="financial"
          >
            {props => <CellValueText {...props} style={headerCellStyle} />}
          </CellValue>
        </View>
      </NamespaceContext.Provider>
    </ResizableColumn>
  );
}

type BalanceColumnProps = ComponentPropsWithoutRef<typeof ResizableColumn> & {
  month: string;
};

function BalanceColumn({ month, style, ...props }: BalanceColumnProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const bindingBudgetType: SheetNames =
    budgetType === 'rollover' ? 'envelope-budget' : 'tracking-budget';

  const balanceBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.totalBalance
      : trackingBudget.totalLeftover;

  return (
    <Column
      style={{
        flex: 1,
        ...style,
      }}
      {...props}
    >
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <View
          style={{
            ...headerColumnStyle,
            ...balanceColumnPaddingStyle,
          }}
        >
          <Text style={{ color: theme.tableHeaderText }}>Balance</Text>
          <CellValue<typeof bindingBudgetType, typeof balanceBinding>
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {typeof children === 'function' ? children(renderProps) : children}
          <ColumnResizer
            className={css({
              position: 'absolute',
              right: -6,
              width: 10,
              backgroundColor: 'transparent',
              height: '100%',
              touchAction: 'none',
              boxSizing: 'border-box',
              border: 5,
              borderStyle: 'none solid',
              borderColor: 'transparent',
              backgroundClip: 'content-box',
              cursor: 'ew-resize',
            })}
          />
        </View>
      )}
    </Column>
  );
}
