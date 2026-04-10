import { useCallback } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { AutoTextSize } from 'auto-text-size';

import { makeAmountGrey } from '#components/budget/util';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { CellValue } from '#components/spreadsheet/CellValue';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useNotes } from '#hooks/useNotes';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useUndo } from '#hooks/useUndo';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import type { SheetFields } from '#spreadsheet';

import { getColumnWidth, PILL_STYLE } from './BudgetTable';

type BudgetCellProps<
  SheetFieldName extends SheetFields<'envelope-budget' | 'tracking-budget'>,
> = ComponentPropsWithoutRef<
  typeof CellValue<'envelope-budget' | 'tracking-budget', SheetFieldName>
> & {
  category: CategoryEntity;
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
  children,
  ...props
}: BudgetCellProps<SheetFieldName>) {
  const { t } = useTranslation();
  const locale = useLocale();
  const columnWidth = getColumnWidth();
  const dispatch = useDispatch();
  const format = useFormat();
  const { showUndoNotification } = useUndo();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const categoryNotes = useNotes(category.id);

  const onSaveNotes = useCallback(async (id: string, notes: string) => {
    await send('notes-save', { id, note: notes });
  }, []);

  const onEditNotes = useCallback(
    (id: string, month: string) => {
      dispatch(
        pushModal({
          modal: {
            name: 'notes',
            options: {
              id,
              name:
                category.name +
                ' - ' +
                monthUtils.format(month, "MMMM ''yy", locale),
              onSave: onSaveNotes,
            },
          },
        }),
      );
    },
    [category.name, locale, dispatch, onSaveNotes],
  );

  const onOpenCategoryBudgetMenu = useCallback(() => {
    const modalBudgetType = budgetType === 'envelope' ? 'envelope' : 'tracking';
    const categoryBudgetMenuModal = `${modalBudgetType}-budget-menu` as const;
    dispatch(
      pushModal({
        modal: {
          name: categoryBudgetMenuModal,
          options: {
            categoryId: category.id,
            month,
            onEditNotes,
            onUpdateBudget: amount => {
              onBudgetAction(month, 'budget-amount', {
                category: category.id,
                amount,
              });
              showUndoNotification({
                message: `${category.name} budget has been updated to ${format(amount, 'financial')}.`,
              });
            },
            onCopyLastMonthAverage: () => {
              onBudgetAction(month, 'copy-single-last', {
                category: category.id,
              });
              showUndoNotification({
                message: `${category.name} budget has been set to last month's budgeted amount.`,
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
          },
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
    onEditNotes,
    format,
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
            <PrivacyFilter>
              <AutoTextSize
                key={value}
                as={Text}
                minFontSizePx={6}
                maxFontSizePx={12}
                mode="oneline"
                style={{
                  ...styles.tnum,
                  maxWidth: columnWidth,
                  textAlign: 'right',
                  fontSize: 12,
                }}
              >
                {format(value, type)}
              </AutoTextSize>
            </PrivacyFilter>
          </Button>
        )
      }
    </CellValue>
  );
}
