import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  collapseModals,
  type Modal as ModalType,
  pushModal,
} from 'loot-core/client/modals/modalsSlice';
import { envelopeBudget } from 'loot-core/client/queries';
import { groupById, integerToCurrency } from 'loot-core/shared/util';
import { format, sheetForMonth, prevMonth } from 'loot-core/src/shared/months';

import { useCategories } from '../../hooks/useCategories';
import { useUndo } from '../../hooks/useUndo';
import { useDispatch } from '../../redux';
import { styles } from '../../style';
import { ToBudgetAmount } from '../budget/envelope/budgetsummary/ToBudgetAmount';
import { TotalsList } from '../budget/envelope/budgetsummary/TotalsList';
import { useEnvelopeSheetValue } from '../budget/envelope/EnvelopeBudgetComponents';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

type EnvelopeBudgetSummaryModalProps = Extract<
  ModalType,
  { name: 'envelope-budget-summary' }
>['options'];

export function EnvelopeBudgetSummaryModal({
  month,
  onBudgetAction,
}: EnvelopeBudgetSummaryModalProps) {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const prevMonthName = format(prevMonth(month), 'MMM');
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
                  amount: integerToCurrency(amount),
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
            onSubmit: categoryId => {
              onBudgetAction(month, 'cover-overbudgeted', {
                category: categoryId,
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
          <NamespaceContext.Provider value={sheetForMonth(month)}>
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
          </NamespaceContext.Provider>
        </>
      )}
    </Modal>
  );
}
