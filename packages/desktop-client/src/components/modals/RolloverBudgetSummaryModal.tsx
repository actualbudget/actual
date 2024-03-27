import React from 'react';
import { useDispatch } from 'react-redux';

import { collapseModals, pushModal } from 'loot-core/client/actions';
import { rolloverBudget } from 'loot-core/client/queries';
import { format, sheetForMonth, prevMonth } from 'loot-core/src/shared/months';

import { styles } from '../../style';
import { ToBudgetAmount } from '../budget/rollover/budgetsummary/ToBudgetAmount';
import { TotalsList } from '../budget/rollover/budgetsummary/TotalsList';
import { Modal } from '../common/Modal';
import { type CommonModalProps } from '../Modals';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';
import { useSheetValue } from '../spreadsheet/useSheetValue';

type RolloverBudgetSummaryModalProps = {
  modalProps: CommonModalProps;
  onBudgetAction: (idx: string | number, action: string, arg?: unknown) => void;
  month: string;
};

export function RolloverBudgetSummaryModal({
  month,
  onBudgetAction,
  modalProps,
}: RolloverBudgetSummaryModalProps) {
  const dispatch = useDispatch();
  const prevMonthName = format(prevMonth(month), 'MMM');
  const sheetValue = useSheetValue({
    name: rolloverBudget.toBudget,
    value: 0,
  });

  const openTransferModal = () => {
    dispatch(
      pushModal('transfer', {
        title: 'Transfer',
        amount: sheetValue,
        onSubmit: (amount, toCategoryId) => {
          onBudgetAction?.(month, 'transfer-available', {
            amount,
            month,
            category: toCategoryId,
          });
          dispatch(collapseModals('transfer'));
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
    onBudgetAction?.(month, 'reset-hold');
    modalProps.onClose();
  };

  const onClick = () => {
    dispatch(
      pushModal('rollover-to-budget-menu', {
        month,
        onTransfer: openTransferModal,
        onResetHoldBuffer,
        onHoldBuffer,
      }),
    );
  };

  return (
    <Modal title="Budget Summary" {...modalProps}>
      {() => (
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
            onClick={onClick}
          />
        </NamespaceContext.Provider>
      )}
    </Modal>
  );
}
