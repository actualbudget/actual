import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Card } from '@actual-app/components/card';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import { SvgCheveronRight } from '@actual-app/components/icons/v1';
import { Label } from '@actual-app/components/label';
import { type CSSProperties, styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';
import { AutoTextSize } from 'auto-text-size';

import * as monthUtils from 'loot-core/shared/months';
import { type CategoryGroupEntity } from 'loot-core/types/models';

import { getColumnWidth, ROW_HEIGHT } from './BudgetTable';
import { IncomeCategoryList } from './IncomeCategoryList';

import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { CellValue } from '@desktop-client/components/spreadsheet/CellValue';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import {
  envelopeBudget,
  trackingBudget,
} from '@desktop-client/spreadsheet/bindings';

type IncomeGroupProps = {
  categoryGroup: CategoryGroupEntity;
  month: string;
  showHiddenCategories: boolean;
  onEditCategoryGroup: (id: CategoryGroupEntity['id']) => void;
  onEditCategory: (id: string) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  isCollapsed: (id: CategoryGroupEntity['id']) => boolean;
  onToggleCollapse: (id: CategoryGroupEntity['id']) => void;
};

export function IncomeGroup({
  categoryGroup,
  month,
  showHiddenCategories,
  onEditCategoryGroup,
  onEditCategory,
  onBudgetAction,
  isCollapsed,
  onToggleCollapse,
}: IncomeGroupProps) {
  const { t } = useTranslation();
  const columnWidth = getColumnWidth();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

  const categories = useMemo(
    () =>
      isCollapsed(categoryGroup.id)
        ? []
        : (categoryGroup.categories?.filter(
            category => !category.hidden || showHiddenCategories,
          ) ?? []),
    [
      categoryGroup.categories,
      categoryGroup.id,
      isCollapsed,
      showHiddenCategories,
    ],
  );

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginTop: 50,
          marginBottom: 5,
          marginRight: 15,
        }}
      >
        {budgetType === 'tracking' && (
          <Label title={t('Budgeted')} style={{ width: columnWidth }} />
        )}
        <Label title={t('Received')} style={{ width: columnWidth }} />
      </View>

      <Card style={{ marginTop: 0 }}>
        <IncomeGroupHeader
          group={categoryGroup}
          month={month}
          onEdit={onEditCategoryGroup}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
        <IncomeCategoryList
          categories={categories}
          month={month}
          onEditCategory={onEditCategory}
          onBudgetAction={onBudgetAction}
        />
      </Card>
    </View>
  );
}

type IncomeGroupHeaderProps = {
  group: CategoryGroupEntity;
  month: string;
  onEdit: (id: CategoryGroupEntity['id']) => void;
  isCollapsed: (id: CategoryGroupEntity['id']) => boolean;
  onToggleCollapse: (id: CategoryGroupEntity['id']) => void;
  style?: CSSProperties;
};

function IncomeGroupHeader({
  group,
  month,
  onEdit,
  isCollapsed,
  onToggleCollapse,
  style,
}: IncomeGroupHeaderProps) {
  return (
    <View
      data-testid="category-group-row"
      onClick={() => onToggleCollapse(group.id)}
      style={{
        cursor: 'pointer',
        height: ROW_HEIGHT,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 5,
        paddingRight: 5,
        opacity: group.hidden ? 0.5 : undefined,
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetHeaderCurrentMonth
          : theme.budgetHeaderOtherMonth,
        ...style,
      }}
    >
      <IncomeGroupName
        group={group}
        onEdit={onEdit}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />
      <IncomeGroupCells group={group} />
    </View>
  );
}

type IncomeGroupNameProps = {
  group: CategoryGroupEntity;
  onEdit: (id: CategoryGroupEntity['id']) => void;
  isCollapsed: (id: CategoryGroupEntity['id']) => boolean;
  onToggleCollapse: (id: CategoryGroupEntity['id']) => void;
};

function IncomeGroupName({
  group,
  onEdit,
  isCollapsed,
  onToggleCollapse,
}: IncomeGroupNameProps) {
  const sidebarColumnWidth = getColumnWidth({
    isSidebar: true,
    offset: -13.5,
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
        onPress={() => onEdit(group.id)}
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

type IncomeGroupCellsProps = {
  group: CategoryGroupEntity;
};

function IncomeGroupCells({ group }: IncomeGroupCellsProps) {
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const format = useFormat();

  const budgeted =
    budgetType === 'tracking' ? trackingBudget.groupBudgeted(group.id) : null;

  const balance =
    budgetType === 'tracking'
      ? trackingBudget.groupSumAmount(group.id)
      : envelopeBudget.groupSumAmount(group.id);

  const columnWidth = getColumnWidth();

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingRight: 5,
      }}
    >
      {budgeted && (
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
                  style={{
                    width: columnWidth,
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    paddingLeft: 5,
                    textAlign: 'right',
                    fontSize: 12,
                    fontWeight: '500',
                  }}
                >
                  {format(value, type)}
                </AutoTextSize>
              </PrivacyFilter>
            </View>
          )}
        </CellValue>
      )}
      <CellValue<'envelope-budget' | 'tracking-budget', 'group-sum-amount'>
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
                style={{
                  width: columnWidth,
                  justifyContent: 'center',
                  alignItems: 'flex-end',
                  paddingLeft: 5,
                  textAlign: 'right',
                  fontSize: 12,
                  fontWeight: '500',
                }}
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
