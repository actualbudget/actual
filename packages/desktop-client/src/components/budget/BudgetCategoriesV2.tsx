import React, {
  useState,
  useMemo,
  useContext,
  type ComponentPropsWithoutRef,
  useRef,
  useCallback,
} from 'react';
import { useFocusable, usePress } from 'react-aria';
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
  SvgArrowThinRight,
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

import * as monthUtils from 'loot-core/shared/months';
import {
  currencyToAmount,
  currencyToInteger,
  type IntegerAmount,
} from 'loot-core/shared/util';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { BalanceMenu as EnvelopeBalanceMenu } from './envelope/BalanceMenu';
import { BudgetMenu as EnvelopeBudgetMenu } from './envelope/BudgetMenu';
import { CoverMenu } from './envelope/CoverMenu';
import { TransferMenu } from './envelope/TransferMenu';
import { MonthsContext } from './MonthsContext';
import { BalanceMenu as TrackingBalanceMenu } from './tracking/BalanceMenu';
import { BudgetMenu as TrackingBudgetMenu } from './tracking/BudgetMenu';
import { makeAmountGrey, makeBalanceAmountStyle, separateGroups } from './util';

import { NotesButton } from '@desktop-client/components/NotesButton';
import {
  CellValue,
  CellValueText,
} from '@desktop-client/components/spreadsheet/CellValue';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useUndo } from '@desktop-client/hooks/useUndo';
import { type SheetNames } from '@desktop-client/spreadsheet';
import {
  envelopeBudget,
  trackingBudget,
} from '@desktop-client/spreadsheet/bindings';

const ROW_HEIGHT = 30;

const balanceColumnPaddingStyle: CSSProperties = {
  paddingRight: 8,
};

const getCategoryRowStyle = (
  category: CategoryEntity | null = null,
  categoryGroup: CategoryGroupEntity | null = null,
): CSSProperties => ({
  height: ROW_HEIGHT,
  backgroundColor: theme.tableBackground,
  padding: '0 15px',
  opacity: category?.hidden || categoryGroup?.hidden ? 0.5 : 1,
});

const getCategoryGroupRowStyle = (
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

type BudgetCategoriesProps = {
  categoryGroups: CategoryGroupEntity[];
  onBudgetAction: (month: string, type: string, args: unknown) => void;
  onShowActivity: (id: CategoryEntity['id'], month?: string) => void;
  onSaveCategory?: (category: CategoryEntity) => void;
  onSaveGroup?: (group: CategoryGroupEntity) => void;
  onDeleteCategory?: (id: CategoryEntity['id']) => void;
  onDeleteGroup?: (id: CategoryGroupEntity['id']) => void;
  onApplyBudgetTemplatesInGroup?: (categoryIds: CategoryEntity['id'][]) => void;
  onToggleHiddenCategories: () => void;
  onCollapseAllCategories: () => void;
  onExpandAllCategories: () => void;
};

export function BudgetCategories({
  categoryGroups,
  onBudgetAction,
  onShowActivity,
  onSaveCategory,
  onSaveGroup,
  onDeleteCategory,
  onDeleteGroup,
  onApplyBudgetTemplatesInGroup,
  onToggleHiddenCategories,
  onCollapseAllCategories,
  onExpandAllCategories,
}: BudgetCategoriesProps) {
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
    <View
      style={{
        marginLeft: 4,
        marginRight: 4,
        marginBottom: 10,
        // Needed for border radius to work.
        overflow: 'hidden',
        borderRadius: 4,
      }}
    >
      <ResizableTableContainer
        style={{
          height: '100%',
          overflow: 'auto',
        }}
      >
        <Table
          aria-label={t('Budget table')}
          className={css({
            backgroundColor: theme.tableBackground,
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
                      onDelete={category => onDeleteCategory(category.id)}
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
}

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
  const { t } = useTranslation();
  return (
    <ReactAriaRow style={{ ...getCategoryRowStyle(), ...style }} {...props}>
      {column =>
        column.type === 'category' ? (
          <ReactAriaCell>
            <View style={{ flex: 1 }}>
              <Input
                autoFocus
                placeholder={t('New category name')}
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
  const { t } = useTranslation();
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
                placeholder={t('New category group name')}
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
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
        <CellValue<'envelope-budget', 'sum-amount'>
          type="financial"
          binding={categorySpentBinding}
        >
          {props => (
            <CellValueText
              {...pressProps}
              {...props}
              className={css({
                ...makeAmountGrey(props.value),
                '&:hover': {
                  cursor: 'pointer',
                  textDecoration: 'underline',
                },
                paddingRight: 5,
              })}
            />
          )}
        </CellValue>
      </SheetNameProvider>
    </ReactAriaCell>
  );
}

type CategoryBalanceCellProps = ComponentPropsWithoutRef<
  typeof ReactAriaCell
> & {
  month: string;
  category: CategoryEntity;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
};

function CategoryBalanceCell({
  month,
  category,
  onBudgetAction,
  style,
  ...props
}: CategoryBalanceCellProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const triggerRef = useRef<HTMLSpanElement | null>(null);

  const bindingBudgetType: SheetNames =
    budgetType === 'rollover' ? 'envelope-budget' : 'tracking-budget';

  const categoryCarryoverBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.catCarryover(category.id)
      : trackingBudget.catCarryover(category.id);

  const categoryBalanceBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.catBalance(category.id)
      : trackingBudget.catBalance(category.id);

  const categoryBudgetedBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.catBudgeted(category.id)
      : trackingBudget.catBudgeted(category.id);

  const categoryGoalBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.catGoal(category.id)
      : trackingBudget.catGoal(category.id);

  const categoryLongGoalBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.catLongGoal(category.id)
      : trackingBudget.catLongGoal(category.id);

  const budgetedValue = useSheetValue<
    typeof bindingBudgetType,
    typeof categoryBudgetedBinding
  >(categoryBudgetedBinding);

  const balanceValue = useSheetValue<
    typeof bindingBudgetType,
    typeof categoryBalanceBinding
  >(categoryBalanceBinding);

  const goalValue = useSheetValue<
    typeof bindingBudgetType,
    typeof categoryGoalBinding
  >(categoryGoalBinding);

  const longGoalValue = useSheetValue<
    typeof bindingBudgetType,
    typeof categoryLongGoalBinding
  >(categoryLongGoalBinding);

  const [activeBalanceMenu, setActiveBalanceMenu] = useState<
    'balance' | 'transfer' | 'cover' | null
  >(null);

  const { pressProps } = usePress({
    onPress: () => setActiveBalanceMenu('balance'),
  });

  const { focusableProps } = useFocusable(
    {
      onKeyUp: e => {
        if (e.key === 'Enter') {
          setActiveBalanceMenu('balance');
        }
      },
    },
    triggerRef,
  );

  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');

  const getBalanceAmountStyle = useCallback(
    (balanceValue: number) =>
      makeBalanceAmountStyle(
        balanceValue,
        isGoalTemplatesEnabled ? goalValue : null,
        longGoalValue === 1 ? balanceValue : budgetedValue,
      ),
    [budgetedValue, goalValue, isGoalTemplatesEnabled, longGoalValue],
  );

  // TODO: Refactor balance cell tooltips
  return (
    <ReactAriaCell style={{ textAlign: 'right', ...style }} {...props}>
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
        <CellValue<typeof bindingBudgetType, typeof categoryBalanceBinding>
          type="financial"
          binding={categoryBalanceBinding}
        >
          {balanceProps => (
            <View
              style={{
                position: 'relative',
                display: 'inline-block',
                ...balanceColumnPaddingStyle,
              }}
            >
              <CellValueText
                {...pressProps}
                {...focusableProps}
                {...balanceProps}
                innerRef={triggerRef}
                className={css({
                  ...getBalanceAmountStyle(balanceProps.value),
                  '&:hover': {
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  },
                })}
              />
              <CellValue<
                typeof bindingBudgetType,
                typeof categoryCarryoverBinding
              >
                binding={categoryCarryoverBinding}
              >
                {carryOverProps =>
                  carryOverProps.value && (
                    <CarryoverIndicator
                      style={getBalanceAmountStyle(balanceProps.value)}
                    />
                  )
                }
              </CellValue>
            </View>
          )}
        </CellValue>
        <Popover
          triggerRef={triggerRef}
          placement="bottom end"
          isOpen={activeBalanceMenu !== null}
          onOpenChange={() => {
            if (activeBalanceMenu !== 'balance') {
              setActiveBalanceMenu(null);
            }
          }}
          isNonModal
        >
          {budgetType === 'rollover' ? (
            <>
              {activeBalanceMenu === 'balance' && (
                <EnvelopeBalanceMenu
                  categoryId={category.id}
                  onCarryover={carryover => {
                    onBudgetAction(month, 'carryover', {
                      category: category.id,
                      flag: carryover,
                    });
                    setActiveBalanceMenu(null);
                  }}
                  onTransfer={() => setActiveBalanceMenu('transfer')}
                  onCover={() => setActiveBalanceMenu('cover')}
                />
              )}
              {activeBalanceMenu === 'transfer' && (
                <TransferMenu
                  categoryId={category.id}
                  initialAmount={balanceValue}
                  showToBeBudgeted={true}
                  onSubmit={(amount, toCategoryId) => {
                    onBudgetAction(month, 'transfer-category', {
                      amount,
                      from: category.id,
                      to: toCategoryId,
                    });
                  }}
                  onClose={() => setActiveBalanceMenu(null)}
                />
              )}
              {activeBalanceMenu === 'cover' && (
                <CoverMenu
                  categoryId={category.id}
                  onSubmit={fromCategoryId => {
                    onBudgetAction(month, 'cover-overspending', {
                      to: category.id,
                      from: fromCategoryId,
                    });
                  }}
                  onClose={() => setActiveBalanceMenu(null)}
                />
              )}
            </>
          ) : (
            <TrackingBalanceMenu
              categoryId={category.id}
              onCarryover={carryover => {
                onBudgetAction(month, 'carryover', {
                  category: category.id,
                  flag: carryover,
                });
                setActiveBalanceMenu(null);
              }}
            />
          )}
        </Popover>
      </SheetNameProvider>
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
  const bindingBudgetType: SheetNames =
    budgetType === 'rollover' ? 'envelope-budget' : 'tracking-budget';

  const groupBudgetedBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.groupBudgeted(categoryGroup.id)
      : trackingBudget.groupBudgeted(categoryGroup.id);

  return (
    <ReactAriaCell style={{ textAlign: 'right', ...style }} {...props}>
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
        <CellValue<typeof bindingBudgetType, typeof groupBudgetedBinding>
          type="financial"
          binding={groupBudgetedBinding}
        >
          {props => (
            <CellValueText
              {...props}
              style={{
                paddingRight: 5,
              }}
            />
          )}
        </CellValue>
      </SheetNameProvider>
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
  const bindingBudgetType: SheetNames =
    budgetType === 'rollover' ? 'envelope-budget' : 'tracking-budget';

  const groupSpentBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.groupSumAmount(categoryGroup.id)
      : trackingBudget.groupSumAmount(categoryGroup.id);

  return (
    <ReactAriaCell style={{ textAlign: 'right', ...style }} {...props}>
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
        <CellValue<typeof bindingBudgetType, typeof groupSpentBinding>
          type="financial"
          binding={groupSpentBinding}
        >
          {props => (
            <CellValueText
              {...props}
              style={{
                paddingRight: 5,
              }}
            />
          )}
        </CellValue>
      </SheetNameProvider>
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
  const bindingBudgetType: SheetNames =
    budgetType === 'rollover' ? 'envelope-budget' : 'tracking-budget';

  const groupBalanceBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.groupBalance(categoryGroup.id)
      : trackingBudget.groupBalance(categoryGroup.id);

  return (
    <ReactAriaCell style={{ textAlign: 'right', ...style }} {...props}>
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
        <CellValue<typeof bindingBudgetType, typeof groupBalanceBinding>
          type="financial"
          binding={groupBalanceBinding}
        >
          {props => (
            <CellValueText
              {...props}
              style={{
                ...balanceColumnPaddingStyle,
              }}
            />
          )}
        </CellValue>
      </SheetNameProvider>
    </ReactAriaCell>
  );
}

const getHeaderBackgroundStyle = (
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
  onRename: (categoryGroup: CategoryGroupEntity, newName: string) => void;
  onDelete: (categoryGroup: CategoryGroupEntity) => void;
  onToggleVisibilty: (categoryGroup: CategoryGroupEntity) => void;
  onApplyBudgetTemplatesInGroup: (categoryGroup: CategoryGroupEntity) => void;
};

function ExpenseGroupRow({
  item,
  isCollapsed,
  onToggleCollapse,
  onAddCategory,
  onRename,
  onDelete,
  onToggleVisibilty,
  onApplyBudgetTemplatesInGroup,
  style,
  ...props
}: ExpenseGroupRowProps) {
  return (
    <ReactAriaRow
      style={{
        ...getCategoryGroupRowStyle(item.value),
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
                onRename={onRename}
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
                style={getHeaderBackgroundStyle(column.type, column.month)}
              />
            );
          case 'spent':
            return (
              <CategoryGroupSpentCell
                month={column.month}
                categoryGroup={item.value}
                style={getHeaderBackgroundStyle(column.type, column.month)}
              />
            );
          case 'balance':
            return (
              <CategoryGroupBalanceCell
                month={column.month}
                categoryGroup={item.value}
                style={getHeaderBackgroundStyle(column.type, column.month)}
              />
            );
          default:
            throw new Error(`Unrecognized column type: ${column.type}`);
        }
      }}
    </ReactAriaRow>
  );
}

const getCellBackgroundStyle = (
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
  onRename: (category: CategoryEntity, newName: string) => void;
  onDelete: (category: CategoryEntity) => void;
  onToggleVisibility: (category: CategoryEntity) => void;
};

function ExpenseCategoryRow({
  item,
  onBudgetAction,
  onShowActivity,
  onRename,
  onDelete,
  onToggleVisibility,
  style,
  ...props
}: ExpenseCategoryRowProps) {
  return (
    <ReactAriaRow
      style={{
        ...getCategoryRowStyle(item.value, item.group),
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
                onRename={onRename}
                onDelete={onDelete}
                onToggleVisibility={onToggleVisibility}
              />
            );
          case 'budgeted':
            return (
              <CategoryBudgetedCell
                month={column.month}
                category={item.value}
                onBudgetAction={onBudgetAction}
                style={getCellBackgroundStyle(column.type, column.month)}
              />
            );
          case 'spent':
            return (
              <CategorySpentCell
                month={column.month}
                category={item.value}
                onShowActivity={onShowActivity}
                style={getCellBackgroundStyle(column.type, column.month)}
              />
            );
          case 'balance':
            return (
              <CategoryBalanceCell
                month={column.month}
                category={item.value}
                onBudgetAction={onBudgetAction}
                style={getCellBackgroundStyle(column.type, column.month)}
              />
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
  onRename: (categoryGroup: CategoryGroupEntity, newName: string) => void;
  onDelete: (categoryGroup: CategoryGroupEntity) => void;
  onToggleVisibilty: (categoryGroup: CategoryGroupEntity) => void;
  onApplyBudgetTemplatesInGroup: (categoryGroup: CategoryGroupEntity) => void;
};

function IncomeGroupRow({
  item,
  isCollapsed,
  onToggleCollapse,
  onAddCategory,
  onRename,
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
        ...getCategoryGroupRowStyle(item.value),
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
                onRename={onRename}
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
        ...getCategoryGroupRowStyle(item.value),
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
                onRename={onRename}
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
  onRename: (category: CategoryEntity, newName: string) => void;
  onDelete: (category: CategoryEntity) => void;
  onToggleVisibility: (category: CategoryEntity) => void;
};

function IncomeCategoryRow({
  item,
  onBudgetAction,
  onRename,
  onDelete,
  onToggleVisibility,
  style,
  ...props
}: IncomeCategoryRowProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  return budgetType === 'rollover' ? (
    <ReactAriaRow
      style={{
        ...getCategoryRowStyle(item.value),
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
                onRename={onRename}
                onDelete={onDelete}
                onToggleVisibility={onToggleVisibility}
              />
            );
          case 'budgeted':
            return <ReactAriaCell />;
          case 'spent':
            return <ReactAriaCell />;
          case 'balance':
            return (
              <CategoryBalanceCell
                month={column.month}
                category={item.value}
                onBudgetAction={onBudgetAction}
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
        ...getCategoryRowStyle(item.value),
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
                onRename={onRename}
                onDelete={onDelete}
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
              <CategoryBalanceCell
                month={column.month}
                category={item.value}
                onBudgetAction={onBudgetAction}
              />
            );
          default:
            throw new Error(`Unrecognized column type: ${column.type}`);
        }
      }}
    </ReactAriaRow>
  );
}

type BudgetedInputProps = Omit<
  ComponentPropsWithoutRef<typeof Input>,
  'value'
> & {
  value: IntegerAmount;
  onUpdateAmount: (newValue: IntegerAmount) => void;
};

function BudgetedInput({
  value,
  onFocus,
  onChangeValue,
  onUpdate,
  onUpdateAmount,
  ...props
}: BudgetedInputProps) {
  const format = useFormat();
  const [currentFormattedAmount, setCurrentFormattedAmount] = useState<
    string | null
  >(null);

  return (
    <Input
      value={currentFormattedAmount ?? format(value, 'financial')}
      onFocus={e => {
        onFocus?.(e);
        if (!e.defaultPrevented) {
          e.target.select();
        }
      }}
      onEscape={() => setCurrentFormattedAmount(format(value, 'financial'))}
      className={css({
        ...makeAmountGrey(
          currentFormattedAmount
            ? currencyToAmount(currentFormattedAmount)
            : value,
        ),
        textAlign: 'right',
        border: '1px solid transparent',
        '&:hover:not(:focus)': {
          border: `1px solid ${theme.formInputBorder}`,
        },
      })}
      onChangeValue={(newValue, e) => {
        onChangeValue?.(newValue, e);
        setCurrentFormattedAmount(newValue);
      }}
      onUpdate={(newValue, e) => {
        onUpdate?.(newValue, e);
        const integerAmount = currencyToInteger(newValue);
        onUpdateAmount?.(integerAmount);
        setCurrentFormattedAmount(format(integerAmount, 'financial'));
      }}
      {...props}
    />
  );
}

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
  const [shouldHideBudgetMenuButton, setShouldHideBudgetMenuButton] =
    useState(false);

  const bindingBudgetType: SheetNames =
    budgetType === 'rollover' ? 'envelope-budget' : 'tracking-budget';

  const budgetedBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.catBudgeted(category.id)
      : trackingBudget.catBudgeted(category.id);

  const BudgetMenuComponent =
    bindingBudgetType === 'envelope-budget'
      ? EnvelopeBudgetMenu
      : TrackingBudgetMenu;

  const { showUndoNotification } = useUndo();

  const onUpdateBudget = (amount: IntegerAmount) => {
    onBudgetAction(month, 'budget-amount', {
      category: category.id,
      amount,
    });
  };

  return (
    <ReactAriaCell {...props}>
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
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
              className={cx(
                { 'hover-visible': !isMenuOpen },
                css({
                  marginLeft: 5,
                  display: shouldHideBudgetMenuButton ? 'none' : undefined,
                }),
              )}
              onPress={() => setIsMenuOpen(true)}
            >
              <SvgCheveronDown width={12} height={12} />
            </Button>

            <Popover
              placement="bottom start"
              isOpen={isMenuOpen}
              onOpenChange={() => setIsMenuOpen(false)}
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
          <View style={{ flex: 1 }}>
            <CellValue<typeof bindingBudgetType, typeof budgetedBinding>
              type="financial"
              binding={budgetedBinding}
            >
              {({ value: budgetedAmount }) => (
                <BudgetedInput
                  value={budgetedAmount}
                  onFocus={() => setShouldHideBudgetMenuButton(true)}
                  onBlur={() => setShouldHideBudgetMenuButton(false)}
                  style={getCellBackgroundStyle('budgeted', month)}
                  onUpdateAmount={onUpdateBudget}
                />
              )}
            </CellValue>
          </View>
        </View>
      </SheetNameProvider>
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
  onRename: (categoryGroup: CategoryGroupEntity, newName: string) => void;
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
  onRename,
  onDelete,
  onToggleVisibilty,
  onApplyBudgetTemplatesInGroup,
  ...props
}: CategoryGroupNameCellProps) {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');

  return (
    <ReactAriaCell {...props}>
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
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
            <Button
              variant="bare"
              onPress={() => onToggleCollapse(categoryGroup)}
              isDisabled={isRenaming}
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
            {isRenaming ? (
              <View style={{ flex: 1 }}>
                <Input
                  autoFocus
                  defaultValue={categoryGroup.name}
                  onBlur={() => setIsRenaming(false)}
                  onEscape={() => setIsRenaming(false)}
                  onUpdate={newName => {
                    if (newName !== categoryGroup.name) {
                      onRename(categoryGroup, newName);
                    }
                  }}
                />
              </View>
            ) : (
              <>
                <Text style={{ fontWeight: 600 }}>{categoryGroup.name}</Text>
                <DialogTrigger>
                  <Button
                    variant="bare"
                    className={cx(
                      { 'hover-visible': !isMenuOpen },
                      css({ marginLeft: 5 }),
                    )}
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
                    isNonModal
                  >
                    <Menu
                      onMenuSelect={type => {
                        if (type === 'rename') {
                          // onEdit(categoryGroup.id);
                          setIsRenaming(true);
                        } else if (type === 'add-category') {
                          onAddCategory(categoryGroup);
                        } else if (type === 'delete') {
                          onDelete(categoryGroup);
                        } else if (type === 'toggle-visibility') {
                          // onSave({ ...categoryGroup, hidden: !categoryGroup.hidden });
                          onToggleVisibilty(categoryGroup);
                        } else if (
                          type === 'apply-multiple-category-template'
                        ) {
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
              </>
            )}
          </View>
          {!isRenaming && (
            <View>
              <NotesButton
                id={categoryGroup.id}
                defaultColor={theme.pageTextLight}
              />
            </View>
          )}
        </View>
      </SheetNameProvider>
    </ReactAriaCell>
  );
}

type CategoryNameCellProps = ComponentPropsWithoutRef<typeof ReactAriaCell> & {
  month: string;
  category: CategoryEntity;
  categoryGroup: CategoryGroupEntity;
  onRename: (category: CategoryEntity, newName: string) => void;
  onDelete: (category: CategoryEntity) => void;
  onToggleVisibility: (category: CategoryEntity) => void;
};

function CategoryNameCell({
  month,
  category,
  categoryGroup,
  onRename,
  onDelete,
  onToggleVisibility,
  ...props
}: CategoryNameCellProps) {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  return (
    <ReactAriaCell {...props}>
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
        <View
          className={css({
            paddingLeft: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            ...hoverVisibleStyle,
          })}
        >
          {isRenaming ? (
            <View style={{ flex: 1 }}>
              <Input
                defaultValue={category.name}
                placeholder="Enter category name"
                onBlur={() => setIsRenaming(false)}
                onUpdate={newName => {
                  if (newName !== category.name) {
                    onRename(category, newName);
                  }
                }}
              />
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text>{category.name}</Text>
                <DialogTrigger>
                  <Button
                    variant="bare"
                    className={cx(
                      { 'hover-visible': !isMenuOpen },
                      css({ marginLeft: 5 }),
                    )}
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
                    isNonModal
                  >
                    <Menu
                      onMenuSelect={type => {
                        if (type === 'rename') {
                          // onEditName(category.id);
                          setIsRenaming(true);
                        } else if (type === 'delete') {
                          onDelete(category);
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
                <NotesButton
                  id={category.id}
                  defaultColor={theme.pageTextLight}
                />
              </View>
            </>
          )}
        </View>
      </SheetNameProvider>
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
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
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
      </SheetNameProvider>
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
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
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
      </SheetNameProvider>
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
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
        <View style={headerColumnStyle}>
          <Text style={{ color: theme.tableHeaderText }}>
            <Trans>Spent</Trans>
          </Text>
          <CellValue<typeof bindingBudgetStyle, typeof totalSpentBinding>
            binding={totalSpentBinding}
            type="financial"
          >
            {props => <CellValueText {...props} style={headerCellStyle} />}
          </CellValue>
        </View>
      </SheetNameProvider>
    </ResizableColumn>
  );
}

type BalanceColumnProps = ComponentPropsWithoutRef<typeof ResizableColumn> & {
  month: string;
};

function BalanceColumn({ month, ...props }: BalanceColumnProps) {
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const bindingBudgetType: SheetNames =
    budgetType === 'rollover' ? 'envelope-budget' : 'tracking-budget';

  const balanceBinding =
    bindingBudgetType === 'envelope-budget'
      ? envelopeBudget.totalBalance
      : trackingBudget.totalLeftover;

  return (
    <Column {...props}>
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
        <View
          style={{
            ...headerColumnStyle,
            ...balanceColumnPaddingStyle,
          }}
        >
          <Text style={{ color: theme.tableHeaderText }}>
            <Trans>Balance</Trans>
          </Text>
          <CellValue<typeof bindingBudgetType, typeof balanceBinding>
            binding={balanceBinding}
            type="financial"
          >
            {props => <CellValueText {...props} style={headerCellStyle} />}
          </CellValue>
        </View>
      </SheetNameProvider>
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

type CarryoverIndicatorProps = {
  style?: CSSProperties;
};

function CarryoverIndicator({ style }: CarryoverIndicatorProps) {
  return (
    <View
      style={{
        position: 'absolute',
        right: 0,
        transform: 'translateY(-50%)',
        top: '50%',
        ...style,
      }}
    >
      <SvgArrowThinRight
        width={style?.width || 7}
        height={style?.height || 7}
        style={style}
      />
    </View>
  );
}
