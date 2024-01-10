import React from 'react';

import { format, sheetForMonth, prevMonth } from 'loot-core/src/shared/months';

import { styles } from '../../style';
import { type CommonModalProps } from '../../types/modals';
import { ToBudget } from '../budget/rollover/budgetsummary/ToBudget';
import { TotalsList } from '../budget/rollover/budgetsummary/TotalsList';
import { Modal } from '../common/Modal';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

type RolloverBudgetSummaryProps = {
  modalProps: CommonModalProps;
  onBudgetAction: (idx: string | number, action: string, arg: unknown) => void;
  month: string;
};

export function RolloverBudgetSummary({
  month,
  onBudgetAction,
  modalProps,
}: RolloverBudgetSummaryProps) {
  const prevMonthName = format(prevMonth(month), 'MMM');

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
          <ToBudget
            month={month}
            prevMonthName={prevMonthName}
            onBudgetAction={onBudgetAction}
            style={{
              ...styles.mediumText,
              marginTop: 15,
            }}
            amountStyle={{
              ...styles.underlinedText,
            }}
            totalsTooltipProps={{
              position: 'bottom-center',
            }}
            holdTooltipProps={{
              position: 'bottom-center',
            }}
            transferTooltipProps={{
              position: 'bottom-center',
            }}
          />
        </NamespaceContext.Provider>
      )}
    </Modal>
  );
}
