import { useCallback, type ComponentPropsWithoutRef } from 'react';
import { GridListItem } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronRight } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import { type CategoryEntity } from 'loot-core/types/models';

import { BalanceCell } from './BalanceCell';
import { BudgetCell } from './BudgetCell';
import { getColumnWidth, ROW_HEIGHT } from './BudgetTable';

import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import {
  envelopeBudget,
  trackingBudget,
} from '@desktop-client/spreadsheet/bindings';

type IncomeCategoryNameProps = {
  category: CategoryEntity;
  onEdit: (id: CategoryEntity['id']) => void;
};

function IncomeCategoryName({ category, onEdit }: IncomeCategoryNameProps) {
  const sidebarColumnWidth = getColumnWidth({
    isSidebar: true,
    offset: -10,
  });
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'flex-start',
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
        style={{
          maxWidth: sidebarColumnWidth,
        }}
        onPress={() => onEdit?.(category.id)}
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
            data-testid="category-name"
          >
            {category.name}
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

type IncomeCategoryCellsProps = {
  category: CategoryEntity;
  month: string;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
  onShowActivity: () => void;
};

function IncomeCategoryCells({
  category,
  month,
  onBudgetAction,
  onShowActivity,
}: IncomeCategoryCellsProps) {
  const { t } = useTranslation();
  const columnWidth = getColumnWidth();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');

  const budgeted =
    budgetType === 'tracking'
      ? trackingBudget.catBudgeted(category.id)
      : envelopeBudget.catBudgeted(category.id);

  const balance =
    budgetType === 'tracking'
      ? trackingBudget.catSumAmount(category.id)
      : envelopeBudget.catSumAmount(category.id);

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}
    >
      {budgetType === 'report' && (
        <View
          style={{
            width: columnWidth,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <BudgetCell
            binding={budgeted}
            type="financial"
            category={category}
            month={month}
            onBudgetAction={onBudgetAction}
          />
        </View>
      )}
      <View
        style={{
          width: columnWidth,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <BalanceCell
          binding={balance}
          category={category}
          onPress={onShowActivity}
          aria-label={t('Show transactions for {{categoryName}} category', {
            categoryName: category.name,
          })}
        />
      </View>
    </View>
  );
}

type IncomeCategoryListItemProps = ComponentPropsWithoutRef<
  typeof GridListItem<CategoryEntity>
> & {
  month: string;
  onEdit: (id: CategoryEntity['id']) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
};

export function IncomeCategoryListItem({
  month,
  onEdit,
  onBudgetAction,
  ...props
}: IncomeCategoryListItemProps) {
  const { value: category } = props;
  const navigate = useNavigate();

  const onShowActivity = useCallback(() => {
    if (!category) {
      return;
    }
    navigate(`/categories/${category.id}?month=${month}`);
  }, [category, month, navigate]);

  if (!category) {
    return null;
  }

  return (
    <GridListItem
      textValue={category.name}
      data-testid="category-row"
      {...props}
    >
      <View
        style={{
          height: ROW_HEIGHT,
          borderColor: theme.tableBorder,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 5,
          paddingRight: 5,
          borderBottomWidth: 1,
          opacity: !!category.hidden ? 0.5 : undefined,
          backgroundColor: monthUtils.isCurrentMonth(month)
            ? theme.budgetCurrentMonth
            : theme.budgetOtherMonth,
        }}
      >
        <IncomeCategoryName category={category} onEdit={onEdit} />
        <IncomeCategoryCells
          category={category}
          month={month}
          onBudgetAction={onBudgetAction}
          onShowActivity={onShowActivity}
        />
      </View>
    </GridListItem>
  );
}
