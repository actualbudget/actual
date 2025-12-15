import React from 'react';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';

import {
  format as formatMonth,
  sheetForMonth,
  prevMonth,
} from 'loot-core/shared/months';
import { groupById } from 'loot-core/shared/util';

import { ToBudgetAmount } from '@desktop-client/components/budget/envelope/budgetsummary/ToBudgetAmount';
import { TotalsList } from '@desktop-client/components/budget/envelope/budgetsummary/TotalsList';
import { useEnvelopeSheetValue } from '@desktop-client/components/budget/envelope/EnvelopeBudgetComponents';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';
import { useUndo } from '@desktop-client/hooks/useUndo';
import {
  collapseModals,
  type Modal as ModalType,
  pushModal,
} from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

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
  const { list: categories } = useCategories();
  const categoriesById = groupById(categories);

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
              onBudgetAction(month, 'transfer-available', {
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
              onBudgetAction(month, 'cover-overbudgeted', {
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
              onBudgetAction(month, 'hold', { amount });
              dispatch(collapseModals({ rootModalName: 'hold-buffer' }));
            },
          },
        },
      }),
    );
  };

  const onResetHoldBuffer = () => {
    onBudgetAction(month, 'reset-hold');
  };

  const onClick = ({ close }: { close: () => void }) => {
    dispatch(
      pushModal({
        modal: {
          name: 'envelope-summary-to-budget-menu',
          options: {
            month,
            onTransfer: openTransferAvailableModal,
            onCover: openCoverOverbudgetedModal,
            onResetHoldBuffer: () => {
              onResetHoldBuffer();
              close();
            },
            onHoldBuffer,
            onBudgetAction,
          },
        },
      }),
    );
  };

  return (
    <Modal name="envelope-budget-summary">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Budget Summary')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <SheetNameProvider name={sheetForMonth(month)}>
            <TotalsList
              prevMonthName={prevMonthName}
              style={{
                ...styles.mediumText,
              }}
            />
            <ToBudgetAmount
              prevMonthName={prevMonthName}
              style={{
                ...styles.mediumText,
                marginTop: 15,
              }}
              amountStyle={{
                ...styles.underlinedText,
              }}
              onClick={() => onClick({ close })}
              isTotalsListTooltipDisabled={true}
            />
          </SheetNameProvider>
        </>
      )}
    </Modal>
  );
}
