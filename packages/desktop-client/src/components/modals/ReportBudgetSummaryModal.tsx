import React from 'react';

import { sheetForMonth } from 'loot-core/src/shared/months';
import * as monthUtils from 'loot-core/src/shared/months';

import { styles } from '../../style';
import { ExpenseTotal } from '../budget/report/budgetsummary/ExpenseTotal';
import { IncomeTotal } from '../budget/report/budgetsummary/IncomeTotal';
import { Saved } from '../budget/report/budgetsummary/Saved';
import { Modal } from '../common/Modal';
import { Stack } from '../common/Stack';
import { type CommonModalProps } from '../Modals';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

type ReportBudgetSummaryModalProps = {
  modalProps: CommonModalProps;
  month: string;
};

export function ReportBudgetSummaryModal({
  month,
  modalProps,
}: ReportBudgetSummaryModalProps) {
  const currentMonth = monthUtils.currentMonth();
  return (
    <Modal title="Budget Summary" {...modalProps}>
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
    </Modal>
  );
}
