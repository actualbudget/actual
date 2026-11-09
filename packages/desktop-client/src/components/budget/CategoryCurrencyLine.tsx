import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';

import { Field, Row } from '#components/table';
import type { CategoryLine } from '#hooks/useCategoryCurrencies';
import { useContextMenu } from '#hooks/useContextMenu';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { removeCurrencyModal } from './categoryCurrencyModals';
import { RenderMonths } from './RenderMonths';

import { useBudgetComponents } from '.';

type CategoryCurrencyLineProps = {
  category: CategoryEntity;
  categoryGroup?: CategoryGroupEntity;
  line: CategoryLine;
  isLast?: boolean;
  editingCell: { id: string; cell: string } | null;
  onEditMonth?: (id: string, month: string) => void;
  onBudgetAction: (month: string, action: string, arg: unknown) => void;
  onShowActivity: (id: CategoryEntity['id'], month: string) => void;
};

// One currency of a category budgeted in several: the category's own
// budget, in the default currency, or one of its other currencies
export function CategoryCurrencyLine({
  category,
  categoryGroup,
  line,
  isLast,
  editingCell,
  onEditMonth,
  onBudgetAction,
  onShowActivity,
}: CategoryCurrencyLineProps) {
  const { ExpenseCategoryComponent, IncomeCategoryComponent } =
    useBudgetComponents();
  const MonthComponent = category.is_income
    ? IncomeCategoryComponent
    : ExpenseCategoryComponent;

  return (
    <Row
      collapsed
      style={{
        backgroundColor: theme.budgetCurrentMonth,
        opacity: category.hidden || categoryGroup?.hidden ? 0.5 : undefined,
      }}
    >
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <SidebarCategoryLine category={category} line={line} />
        <RenderMonths>
          {({ month }) => (
            <MonthComponent
              month={month}
              category={category}
              line={line}
              isLast={isLast}
              editing={
                editingCell?.id === line.id && editingCell.cell === month
              }
              onEdit={(id, editMonth) =>
                onEditMonth?.(id as string, editMonth as string)
              }
              onBudgetAction={onBudgetAction}
              onShowActivity={onShowActivity}
            />
          )}
        </RenderMonths>
      </View>
    </Row>
  );
}

function SidebarCategoryLine({
  category,
  line,
}: {
  category: CategoryEntity;
  line: CategoryLine;
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
  const categoryExpandedState = categoryExpandedStatePref ?? 0;
  const isOwnLine = line.id === category.id;

  const triggerRef = useRef(null);
  const { handleContextMenu } = useContextMenu({
    triggerRef,
    enabled: !isOwnLine,
    items: [
      {
        name: 'remove-currency',
        text: t('Remove currency'),
        onClick: () =>
          dispatch(
            pushModal({
              modal: removeCurrencyModal(t, category, line),
            }),
          ),
      },
    ],
  });

  return (
    <View
      style={{
        width: 200 + 100 * categoryExpandedState,
        overflow: 'hidden',
        '& .hover-visible': { display: 'none' },
        '&:hover .hover-visible': { display: 'flex' },
      }}
    >
      <Field width="flex" style={{ paddingLeft: 28 }}>
        <View
          ref={triggerRef}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height: 20,
            color: theme.pageTextSubdued,
          }}
          data-testid="category-currency-line"
        >
          <TextOneLine>{line.currencyCode}</TextOneLine>
          {!isOwnLine && (
            <View style={{ flexShrink: 0, marginLeft: 5 }}>
              <Button
                variant="bare"
                className="hover-visible"
                aria-label={t('Menu')}
                style={{ color: 'currentColor', padding: 3 }}
                onPress={handleContextMenu}
              >
                <SvgCheveronDown
                  width={14}
                  height={14}
                  style={{ color: 'currentColor' }}
                />
              </Button>
            </View>
          )}
        </View>
      </Field>
    </View>
  );
}
