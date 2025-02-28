import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Card } from '@actual-app/components/card';
import { Label } from '@actual-app/components/label';
import { type CSSProperties, styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';
import { AutoTextSize } from 'auto-text-size';

import { envelopeBudget, trackingBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';
import { type CategoryGroupEntity } from 'loot-core/types/models';

import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { SvgExpandArrow } from '../../../icons/v0';
import { SvgCheveronRight } from '../../../icons/v1';
import { PrivacyFilter } from '../../PrivacyFilter';
import { CellValue } from '../../spreadsheet/CellValue';
import { useFormat } from '../../spreadsheet/useFormat';

import { getColumnWidth } from './BudgetTable';
import { IncomeCategoryList } from './IncomeCategoryList';
import { ListItem } from './ListItem';

type IncomeGroupProps = {
  group: CategoryGroupEntity;
  month: string;
  showHiddenCategories: boolean;
  onEditGroup: (id: CategoryGroupEntity['id']) => void;
  onEditCategory: (id: string) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  isCollapsed: boolean;
  onToggleCollapse: (id: CategoryGroupEntity['id']) => void;
};

export function IncomeGroup({
  group,
  month,
  showHiddenCategories,
  onEditGroup,
  onEditCategory,
  onBudgetAction,
  isCollapsed,
  onToggleCollapse,
}: IncomeGroupProps) {
  const { t } = useTranslation();
  const columnWidth = getColumnWidth();
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  const categories = useMemo(
    () =>
      isCollapsed
        ? []
        : (group.categories?.filter(
            category => !category.hidden || showHiddenCategories,
          ) ?? []),
    [group.categories, isCollapsed, showHiddenCategories],
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
        {budgetType === 'report' && (
          <Label title={t('Budgeted')} style={{ width: columnWidth }} />
        )}
        <Label title={t('Received')} style={{ width: columnWidth }} />
      </View>

      <Card style={{ marginTop: 0 }}>
        <IncomeGroupHeader
          group={group}
          month={month}
          onEdit={onEditGroup}
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
  isCollapsed: boolean;
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
  const listItemRef = useRef<HTMLDivElement | null>(null);

  return (
    <ListItem
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        opacity: !!group.hidden ? 0.5 : undefined,
        paddingLeft: 0,
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetHeaderCurrentMonth
          : theme.budgetHeaderOtherMonth,
        ...style,
      }}
      innerRef={listItemRef}
      data-testid="category-group-row"
    >
      <IncomeGroupName
        group={group}
        onEdit={onEdit}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />
      <IncomeGroupCells group={group} />
    </ListItem>
  );
}

type IncomeGroupNameProps = {
  group: CategoryGroupEntity;
  onEdit?: (id: CategoryGroupEntity['id']) => void;
  isCollapsed: boolean;
  onToggleCollapse?: (id: CategoryGroupEntity['id']) => void;
};

function IncomeGroupName({
  group,
  onEdit,
  isCollapsed,
  onToggleCollapse,
}: IncomeGroupNameProps) {
  const sidebarColumnWidth = getColumnWidth({
    show3Cols: false,
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
        })}
        onPress={() => onToggleCollapse?.(group.id)}
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
      <Button
        variant="bare"
        style={{
          maxWidth: sidebarColumnWidth,
        }}
        onPress={() => onEdit?.(group.id)}
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
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const format = useFormat();

  const budgeted =
    budgetType === 'report' ? trackingBudget.groupBudgeted(group.id) : null;

  const balance =
    budgetType === 'report'
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
