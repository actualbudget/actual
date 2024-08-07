import React from 'react';
import { useDispatch } from 'react-redux';

import { collapseModals, pushModal } from 'loot-core/client/actions';
import { rolloverBudget } from 'loot-core/client/queries';
import { format, sheetForMonth, prevMonth } from 'loot-core/src/shared/months';

import { styles } from '../../style';
import { ToBudgetAmount } from '../budget/rollover/budgetsummary/ToBudgetAmount';
import { TotalsList } from '../budget/rollover/budgetsummary/TotalsList';
import { useRolloverSheetValue } from '../budget/rollover/RolloverComponents';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

type RolloverBudgetSummaryModalProps = {
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  month: string;
};

export function RolloverBudgetSummaryModal({
  month,
  onBudgetAction,
}: RolloverBudgetSummaryModalProps) {
  const dispatch = useDispatch();
  const prevMonthName = format(prevMonth(month), 'MMM');
  const sheetValue = useRolloverSheetValue({
    name: rolloverBudget.toBudget,
    value: 0,
  });

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
      pushModal('rollover-summary-to-budget-menu', {
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
    <Modal name="rollover-budget-summary">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Budget Summary"
            rightContent={<ModalCloseButton onClick={close} />}
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
            />
          </NamespaceContext.Provider>
        </>
      )}
    </Modal>
  );
}
