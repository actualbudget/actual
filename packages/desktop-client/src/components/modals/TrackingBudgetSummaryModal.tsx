import React from 'react';
import { useTranslation } from 'react-i18next';

import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { sheetForMonth } from '@actual-app/core/shared/months';
import * as monthUtils from '@actual-app/core/shared/months';

import { ExpenseTotal } from '#components/budget/tracking/budgetsummary/ExpenseTotal';
import { IncomeTotal } from '#components/budget/tracking/budgetsummary/IncomeTotal';
import { Saved } from '#components/budget/tracking/budgetsummary/Saved';
import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { SheetNameProvider } from '#hooks/useSheetName';
import type { Modal as ModalType } from '#modals/modalsSlice';

type TrackingBudgetSummaryModalProps = Extract<
  ModalType,
  { name: 'tracking-budget-summary' }
>['options'];

export function TrackingBudgetSummaryModal({
  month,
}: TrackingBudgetSummaryModalProps) {
  const { t } = useTranslation();
  const currentMonth = monthUtils.currentMonth();
  return (
    <Modal name="tracking-budget-summary">
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Budget Summary')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <SheetNameProvider name={sheetForMonth(month)}>
            <SpaceBetween
              direction="vertical"
              gap={10}
              style={{
                alignSelf: 'center',
                alignItems: 'flex-start',
                backgroundColor: 'transparent',
                borderRadius: 4,
              }}
            >
              <IncomeTotal style={{ ...styles.mediumText }} />
              <ExpenseTotal style={{ ...styles.mediumText }} />
            </SpaceBetween>
            <Saved
              projected={month >= currentMonth}
              style={{ ...styles.mediumText, marginTop: 20 }}
            />
          </SheetNameProvider>
        </>
      )}
    </Modal>
  );
}
