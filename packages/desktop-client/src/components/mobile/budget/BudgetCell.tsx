import { useCallback, type ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { type CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { AutoTextSize } from 'auto-text-size';

import { pushModal } from 'loot-core/client/actions';
import { integerToCurrency } from 'loot-core/shared/util';
import { type CategoryEntity } from 'loot-core/types/models';

import { useNotes } from '../../../hooks/useNotes';
import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { useUndo } from '../../../hooks/useUndo';
import { useDispatch } from '../../../redux';
import { makeAmountGrey } from '../../budget/util';
import { PrivacyFilter } from '../../PrivacyFilter';
import { type SheetFields } from '../../spreadsheet';
import { CellValue } from '../../spreadsheet/CellValue';
import { useFormat } from '../../spreadsheet/useFormat';

import { getColumnWidth, PILL_STYLE } from './BudgetTable';

type BudgetCellProps<
  SheetFieldName extends SheetFields<'envelope-budget' | 'tracking-budget'>,
> = ComponentPropsWithoutRef<
  typeof CellValue<'envelope-budget' | 'tracking-budget', SheetFieldName>
> & {
  category: CategoryEntity;
  style?: CSSProperties;
  month: string;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
};

export function BudgetCell<
  SheetFieldName extends SheetFields<'envelope-budget' | 'tracking-budget'>,
>({
  binding,
  category,
  month,
  onBudgetAction,
  style,
  children,
  ...props
}: BudgetCellProps<SheetFieldName>) {
  const { t } = useTranslation();
  const columnWidth = getColumnWidth();
  const dispatch = useDispatch();
  const format = useFormat();
  const { showUndoNotification } = useUndo();
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const categoryNotes = useNotes(category.id);

  const onOpenCategoryBudgetMenu = useCallback(() => {
    const modalBudgetType = budgetType === 'rollover' ? 'envelope' : 'tracking';
    const categoryBudgetMenuModal = `${modalBudgetType}-budget-menu` as const;
    dispatch(
      pushModal(categoryBudgetMenuModal, {
        categoryId: category.id,
        month,
        onUpdateBudget: amount => {
          onBudgetAction(month, 'budget-amount', {
            category: category.id,
            amount,
          });
          showUndoNotification({
            message: `${category.name} budget has been updated to ${integerToCurrency(amount)}.`,
          });
        },
        onCopyLastMonthAverage: () => {
          onBudgetAction(month, 'copy-single-last', {
            category: category.id,
          });
          showUndoNotification({
            message: `${category.name} budget has been set last to month’s budgeted amount.`,
          });
        },
        onSetMonthsAverage: numberOfMonths => {
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
            message: `${category.name} budget has been set to ${numberOfMonths === 12 ? 'yearly' : `${numberOfMonths} month`} average.`,
          });
        },
        onApplyBudgetTemplate: () => {
          onBudgetAction(month, 'apply-single-category-template', {
            category: category.id,
          });
          showUndoNotification({
            message: `${category.name} budget templates have been applied.`,
            pre: categoryNotes ?? undefined,
          });
        },
      }),
    );
  }, [
    budgetType,
    category.id,
    category.name,
    categoryNotes,
    dispatch,
    month,
    onBudgetAction,
    showUndoNotification,
  ]);

  return (
    <CellValue
      binding={binding}
      type="financial"
      aria-label={t('Budgeted amount for {{categoryName}} category', {
        categoryName: category.name,
      })}
      {...props}
    >
      {({ type, name, value }) =>
        children?.({
          type,
          name,
          value,
        }) || (
          <Button
            variant="bare"
            style={{
              ...PILL_STYLE,
              maxWidth: columnWidth,
              ...makeAmountGrey(value),
            }}
            onPress={onOpenCategoryBudgetMenu}
            aria-label={t('Open budget menu for {{categoryName}} category', {
              categoryName: category.name,
            })}
          >
            <View>
              <PrivacyFilter>
                <AutoTextSize
                  key={value}
                  as={Text}
                  minFontSizePx={6}
                  maxFontSizePx={12}
                  mode="oneline"
                  style={{
                    maxWidth: columnWidth,
                    textAlign: 'right',
                    fontSize: 12,
                  }}
                >
                  {format(value, type)}
                </AutoTextSize>
              </PrivacyFilter>
            </View>
          </Button>
        )
      }
    </CellValue>
  );
}
