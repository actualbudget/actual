import React from 'react';
import { useDispatch } from 'react-redux';

import { envelopeBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';
import { groupById, integerToCurrency } from 'loot-core/shared/util';
import { format, sheetForMonth, prevMonth } from 'loot-core/src/shared/months';

import { useCategories } from '../../hooks/useCategories';
import { useUndo } from '../../hooks/useUndo';
import { collapseModals, pushModal } from '../../state/actions';
import { styles } from '../../style';
import { ToBudgetAmount } from '../budget/envelope/budgetsummary/ToBudgetAmount';
import { TotalsList } from '../budget/envelope/budgetsummary/TotalsList';
import { useEnvelopeSheetValue } from '../budget/envelope/EnvelopeBudgetComponents';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

const MODAL_NAME = 'envelope-budget-summary' as const;

type EnvelopeBudgetSummaryModalProps = {
  name: typeof MODAL_NAME;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  month: string;
};

export function EnvelopeBudgetSummaryModal({
  name = MODAL_NAME,
  month,
  onBudgetAction,
}: EnvelopeBudgetSummaryModalProps) {
  return (
    <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
      <EnvelopeBudgetSummaryModalInner
        name={name}
        month={month}
        onBudgetAction={onBudgetAction}
      />
    </NamespaceContext.Provider>
  );
}

function EnvelopeBudgetSummaryModalInner({
  name = MODAL_NAME,
  month,
  onBudgetAction,
}: EnvelopeBudgetSummaryModalProps) {
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
      pushModal('transfer', {
        title: 'Transfer: To Budget',
        month,
        amount: sheetValue,
        onSubmit: (amount, toCategoryId) => {
          onBudgetAction(month, 'transfer-available', {
            amount,
            month,
            category: toCategoryId,
          });
          dispatch(collapseModals('transfer'));
          showUndoNotification({
            message: `Transferred ${integerToCurrency(amount)} to ${categoriesById[toCategoryId].name}`,
          });
        },
      }),
    );
  };

  const openCoverOverbudgetedModal = () => {
    dispatch(
      pushModal('cover', {
        title: 'Cover: Overbudgeted',
        month,
        showToBeBudgeted: false,
        onSubmit: categoryId => {
          onBudgetAction(month, 'cover-overbudgeted', {
            category: categoryId,
          });
          dispatch(collapseModals('cover'));
          showUndoNotification({
            message: `Covered overbudgeted from ${categoriesById[categoryId].name}`,
          });
        },
      }),
    );
  };

  const onHoldBuffer = () => {
    dispatch(
      pushModal('hold-buffer', {
        month,
        onSubmit: amount => {
          onBudgetAction(month, 'hold', { amount });
          dispatch(collapseModals('hold-buffer'));
        },
      }),
    );
  };

  const onResetHoldBuffer = () => {
    onBudgetAction(month, 'reset-hold');
  };

  const onClick = ({ close }: { close: () => void }) => {
    dispatch(
      pushModal('envelope-summary-to-budget-menu', {
        month,
        onTransfer: openTransferAvailableModal,
        onCover: openCoverOverbudgetedModal,
        onResetHoldBuffer: () => {
          onResetHoldBuffer();
          close();
        },
        onHoldBuffer,
      }),
    );
  };

  return (
    <Modal name={name}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Budget Summary"
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
EnvelopeBudgetSummaryModal.modalName = MODAL_NAME;
