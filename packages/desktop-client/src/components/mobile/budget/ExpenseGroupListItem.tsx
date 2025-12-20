import { type ComponentPropsWithoutRef, useCallback, useMemo } from 'react';
import { GridListItem } from 'react-aria-components';

import { Button } from '@actual-app/components/button';
import { Card } from '@actual-app/components/card';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import { SvgCheveronRight } from '@actual-app/components/icons/v1';
import { type CSSProperties, styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';
import { AutoTextSize } from 'auto-text-size';

import * as monthUtils from 'loot-core/shared/months';
import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { getColumnWidth, ROW_HEIGHT } from './BudgetTable';
import { ExpenseCategoryList } from './ExpenseCategoryList';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { CellValue } from '@desktop-client/components/spreadsheet/CellValue';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import {
  envelopeBudget,
  trackingBudget,
} from '@desktop-client/spreadsheet/bindings';

type ExpenseGroupListItemProps = ComponentPropsWithoutRef<
  typeof GridListItem<CategoryGroupEntity>
> & {
  month: string;
  showHiddenCategories: boolean;
  onEditCategoryGroup: (id: CategoryGroupEntity['id']) => void;
  onEditCategory: (id: string) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  isCollapsed: (id: CategoryGroupEntity['id']) => boolean;
  onToggleCollapse: (id: CategoryGroupEntity['id']) => void;
  showBudgetedColumn: boolean;
  show3Columns: boolean;
  isHidden: boolean;
};

export function ExpenseGroupListItem({
  onEditCategoryGroup,
  onEditCategory,
  month,
  onBudgetAction,
  showBudgetedColumn,
  show3Columns,
  showHiddenCategories,
  isCollapsed,
  onToggleCollapse,
  isHidden,
  ...props
}: ExpenseGroupListItemProps) {
  const { value: categoryGroup } = props;

  const categories = useMemo(
    () =>
      !categoryGroup || isCollapsed(categoryGroup.id)
        ? []
        : (categoryGroup.categories?.filter(
            category => !category.hidden || showHiddenCategories,
          ) ?? []),
    [categoryGroup, isCollapsed, showHiddenCategories],
  );

  const shouldHideCategory = useCallback(
    (category: CategoryEntity) => {
      return !!(category.hidden || categoryGroup?.hidden);
    },
    [categoryGroup?.hidden],
  );

  if (!categoryGroup) {
    return null;
  }

  return (
    <GridListItem textValue={categoryGroup.name} {...props}>
      <Card
        style={{
          marginTop: 4,
          marginBottom: 4,
        }}
      >
        <ExpenseGroupHeader
          categoryGroup={categoryGroup}
          month={month}
          showBudgetedColumn={showBudgetedColumn}
          show3Columns={show3Columns}
          onEditCategoryGroup={onEditCategoryGroup}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
          isHidden={isHidden}
        />

        <ExpenseCategoryList
          categoryGroup={categoryGroup}
          categories={categories}
          month={month}
          onEditCategory={onEditCategory}
          onBudgetAction={onBudgetAction}
          shouldHideCategory={shouldHideCategory}
          show3Columns={show3Columns}
          showBudgetedColumn={showBudgetedColumn}
        />
      </Card>
    </GridListItem>
  );
}

type ExpenseGroupHeaderProps = {
  categoryGroup: CategoryGroupEntity;
  month: string;
  onEditCategoryGroup: (id: CategoryGroupEntity['id']) => void;
  isCollapsed: (id: CategoryGroupEntity['id']) => boolean;
  onToggleCollapse: (id: CategoryGroupEntity['id']) => void;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
  isHidden: boolean;
};

export function ExpenseGroupHeader({
  categoryGroup,
  month,
  onEditCategoryGroup,
  show3Columns,
  showBudgetedColumn,
  isCollapsed,
  onToggleCollapse,
  isHidden,
}: ExpenseGroupHeaderProps) {
  return (
    <View
      data-testid="category-group-row"
      onClick={() => onToggleCollapse(categoryGroup.id)}
      style={{
        cursor: 'pointer',
        height: ROW_HEIGHT,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 5,
        paddingRight: 5,
        opacity: isHidden ? 0.5 : undefined,
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetHeaderCurrentMonth
          : theme.budgetHeaderOtherMonth,
      }}
    >
      <ExpenseGroupName
        group={categoryGroup}
        onEditCategoryGroup={onEditCategoryGroup}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        show3Columns={show3Columns}
      />
      <ExpenseGroupCells
        group={categoryGroup}
        show3Columns={show3Columns}
        showBudgetedColumn={showBudgetedColumn}
      />
    </View>
  );
}

type ExpenseGroupNameProps = {
  group: CategoryGroupEntity;
  onEditCategoryGroup: (id: CategoryGroupEntity['id']) => void;
  isCollapsed: (id: CategoryGroupEntity['id']) => boolean;
  onToggleCollapse: (id: CategoryGroupEntity['id']) => void;
  show3Columns: boolean;
};

function ExpenseGroupName({
  group,
  onEditCategoryGroup,
  isCollapsed,
  onToggleCollapse,
  show3Columns,
}: ExpenseGroupNameProps) {
  const sidebarColumnWidth = getColumnWidth({
    show3Columns,
    isSidebar: true,
    offset: -3.5,
  });
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        width: sidebarColumnWidth,
      }}
    >
      {/* Hidden drag button */}
      <Button
        slot="drag"
        style={{
          opacity: 0,
          width: 1,
          height: 1,
          position: 'absolute',
          overflow: 'hidden',
        }}
      />
      <Button
        variant="bare"
        className={css({
          flexShrink: 0,
          color: theme.pageTextSubdued,
          '&[data-pressed]': {
            backgroundColor: 'transparent',
          },
          marginLeft: -5,
        })}
        onPress={() => onToggleCollapse(group.id)}
      >
        <SvgExpandArrow
          width={8}
          height={8}
          style={{
            flexShrink: 0,
            transition: 'transform .1s',
            transform: isCollapsed(group.id) ? 'rotate(-90deg)' : '',
          }}
        />
      </Button>
      <Button
        variant="bare"
        style={{
          maxWidth: sidebarColumnWidth,
        }}
        onPress={() => onEditCategoryGroup(group.id)}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <Text
            style={{
              ...styles.lineClamp(2),
              width: sidebarColumnWidth,
              textAlign: 'left',
              ...styles.smallText,
              fontWeight: '500',
            }}
            data-testid="category-group-name"
          >
            {group.name}
          </Text>
          <SvgCheveronRight
            style={{ flexShrink: 0, color: theme.tableTextSubdued }}
            width={14}
            height={14}
          />
        </View>
      </Button>
    </View>
  );
}

type ExpenseGroupCellsProps = {
  group: CategoryGroupEntity;
  show3Columns: boolean;
  showBudgetedColumn: boolean;
};

function ExpenseGroupCells({
  group,
  show3Columns,
  showBudgetedColumn,
}: ExpenseGroupCellsProps) {
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const format = useFormat();

  const columnWidth = getColumnWidth({ show3Columns });

  const amountStyle: CSSProperties = {
    width: columnWidth,
    fontSize: 12,
    fontWeight: '500',
    paddingLeft: 5,
    textAlign: 'right',
  };

  const budgeted =
    budgetType === 'tracking'
      ? trackingBudget.groupBudgeted(group.id)
      : envelopeBudget.groupBudgeted(group.id);

  const spent =
    budgetType === 'tracking'
      ? trackingBudget.groupSumAmount(group.id)
      : envelopeBudget.groupSumAmount(group.id);

  const balance =
    budgetType === 'tracking'
      ? trackingBudget.groupBalance(group.id)
      : envelopeBudget.groupBalance(group.id);

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingRight: 5,
      }}
    >
      <View
        style={{
          ...(!show3Columns && !showBudgetedColumn && { display: 'none' }),
        }}
      >
        <CellValue<'envelope-budget' | 'tracking-budget', 'group-budget'>
          binding={budgeted}
          type="financial"
        >
          {({ type, value }) => (
            <View>
              <PrivacyFilter>
                <AutoTextSize
                  key={value}
                  as={Text}
                  minFontSizePx={6}
                  maxFontSizePx={12}
                  mode="oneline"
                  style={amountStyle}
                >
                  {format(value, type)}
                </AutoTextSize>
              </PrivacyFilter>
            </View>
          )}
        </CellValue>
      </View>
      <View
        style={{
          ...(!show3Columns && showBudgetedColumn && { display: 'none' }),
        }}
      >
        <CellValue<'envelope-budget' | 'tracking-budget', 'group-sum-amount'>
          binding={spent}
          type="financial"
        >
          {({ type, value }) => (
            <View>
              <PrivacyFilter>
                <AutoTextSize
                  key={value}
                  as={Text}
                  minFontSizePx={6}
                  maxFontSizePx={12}
                  mode="oneline"
                  style={amountStyle}
                >
                  {format(value, type)}
                </AutoTextSize>
              </PrivacyFilter>
            </View>
          )}
        </CellValue>
      </View>
      <CellValue<'envelope-budget' | 'tracking-budget', 'group-leftover'>
        binding={balance}
        type="financial"
      >
        {({ type, value }) => (
          <View>
            <PrivacyFilter>
              <AutoTextSize
                key={value}
                as={Text}
                minFontSizePx={6}
                maxFontSizePx={12}
                mode="oneline"
                style={amountStyle}
              >
                {format(value, type)}
              </AutoTextSize>
            </PrivacyFilter>
          </View>
        )}
      </CellValue>
    </View>
  );
}
