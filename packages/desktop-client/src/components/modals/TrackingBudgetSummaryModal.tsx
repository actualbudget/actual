import React from 'react';

import { sheetForMonth } from 'loot-core/src/shared/months';
import * as monthUtils from 'loot-core/src/shared/months';

import { styles } from '../../style';
import { ExpenseTotal } from '../budget/tracking/budgetsummary/ExpenseTotal';
import { IncomeTotal } from '../budget/tracking/budgetsummary/IncomeTotal';
import { Saved } from '../budget/tracking/budgetsummary/Saved';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Stack } from '../common/Stack';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

const MODAL_NAME = 'tracking-budget-summary' as const;

type TrackingBudgetSummaryModalProps = {
  name: typeof MODAL_NAME;
  month: string;
};

export function TrackingBudgetSummaryModal({
  name = MODAL_NAME,
  month,
}: TrackingBudgetSummaryModalProps) {
  const currentMonth = monthUtils.currentMonth();
  return (
    <Modal name={name}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title="Budget Summary"
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <NamespaceContext.Provider value={sheetForMonth(month)}>
            <Stack
              spacing={2}
              style={{
                alignSelf: 'center',
                backgroundColor: 'transparent',
                borderRadius: 4,
              }}
            >
              <IncomeTotal style={{ ...styles.mediumText }} />
              <ExpenseTotal style={{ ...styles.mediumText }} />
            </Stack>
            <Saved
              projected={month >= currentMonth}
              style={{ ...styles.mediumText, marginTop: 20 }}
            />
          </NamespaceContext.Provider>
        </>
      )}
    </Modal>
  );
}
TrackingBudgetSummaryModal.modalName = MODAL_NAME;
