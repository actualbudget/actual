import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import {
  format as formatMonth,
  prevMonth,
  sheetForMonth,
} from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models/category';

import { ToBudgetAmount } from '#components/budget/envelope/budgetsummary/ToBudgetAmount';
import { TotalsList } from '#components/budget/envelope/budgetsummary/TotalsList';
import { useEnvelopeSheetValue } from '#components/budget/envelope/EnvelopeBudgetComponents';
import { ToBudgetSheetActions } from '#components/mobile/budget/ToBudgetSheetActions';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { useCategoriesById } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useUndo } from '#hooks/useUndo';
import { collapseModals, pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import { envelopeBudget } from '#spreadsheet/bindings';

type EnvelopeBudgetSummaryModalProps = Extract<
  ModalType,
  { name: 'envelope-budget-summary' }
>['options'];

export function EnvelopeBudgetSummaryModal({
  month,
  onBudgetAction,
}: EnvelopeBudgetSummaryModalProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const locale = useLocale();
  const dispatch = useDispatch();
  const prevMonthName = formatMonth(prevMonth(month), 'MMM', locale);
  const sheetValue =
    useEnvelopeSheetValue({
      name: envelopeBudget.toBudget,
      value: 0,
    }) ?? 0;

  const { showUndoNotification } = useUndo();
  const {
    data: { list: categoriesById } = {
      list: {} as Record<string, CategoryEntity>,
    },
  } = useCategoriesById();

  const openTransferAvailableModal = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'transfer',
          options: {
            title: t('Transfer to category'),
            month,
            amount: sheetValue,
            onSubmit: (amount, toCategoryId) => {
              void onBudgetAction(month, 'transfer-available', {
                amount,
                month,
                category: toCategoryId,
              });
              dispatch(collapseModals({ rootModalName: 'transfer' }));
              showUndoNotification({
                message: t('Transferred {{amount}} to {{categoryName}}', {
                  amount: format(amount, 'financial'),
                  categoryName: categoriesById[toCategoryId].name,
                }),
              });
            },
          },
        },
      }),
    );
  };

  const openCoverOverbudgetedModal = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'cover',
          options: {
            title: t('Cover overbudgeted'),
            month,
            showToBeBudgeted: false,
            amount: sheetValue,
            onSubmit: (amount, categoryId) => {
              void onBudgetAction(month, 'cover-overbudgeted', {
                category: categoryId,
                amount,
                currencyCode: format.currency.code,
              });
              dispatch(collapseModals({ rootModalName: 'cover' }));
              showUndoNotification({
                message: t('Covered overbudgeted from {{categoryName}}', {
                  categoryName: categoriesById[categoryId].name,
                }),
              });
            },
          },
        },
      }),
    );
  };

  const onHoldBuffer = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'hold-buffer',
          options: {
            month,
            onSubmit: amount => {
              void onBudgetAction(month, 'hold', { amount });
              dispatch(collapseModals({ rootModalName: 'hold-buffer' }));
            },
          },
        },
      }),
    );
  };

  return (
    <MobileSheet name="envelope-budget-summary" title={t('Budget Summary')}>
      {({ close }) => (
        <SheetNameProvider name={sheetForMonth(month)}>
          <View
            style={{
              padding: `${spacing.xs}px ${spacing.lg}px ${spacing.lg}px`,
            }}
          >
            <TotalsList
              prevMonthName={prevMonthName}
              style={styles.mediumText}
            />
            <ToBudgetAmount
              prevMonthName={prevMonthName}
              style={{ ...styles.mediumText, marginTop: spacing.lg }}
              isTotalsListTooltipDisabled
            />
          </View>
          <ToBudgetSheetActions
            month={month}
            onTransfer={openTransferAvailableModal}
            onCover={openCoverOverbudgetedModal}
            onHoldBuffer={onHoldBuffer}
            onResetHoldBuffer={() => {
              void onBudgetAction(month, 'reset-hold');
              close();
            }}
            onBudgetAction={onBudgetAction}
          />
        </SheetNameProvider>
      )}
    </MobileSheet>
  );
}
