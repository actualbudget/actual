import React from 'react';
import { useTranslation } from 'react-i18next';

import { Stack } from '@actual-app/components/stack';
import { styles } from '@actual-app/components/styles';

import { sheetForMonth } from 'loot-core/shared/months';
import * as monthUtils from 'loot-core/shared/months';

import { type Modal as ModalType } from '../../modals/modalsSlice';
import { ExpenseTotal } from '../budget/tracking/budgetsummary/ExpenseTotal';
import { IncomeTotal } from '../budget/tracking/budgetsummary/IncomeTotal';
import { Saved } from '../budget/tracking/budgetsummary/Saved';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';

import { SheetNameProvider } from '@desktop-client/hooks/useSheetName';

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
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Budget Summary')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <SheetNameProvider name={sheetForMonth(month)}>
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
          </SheetNameProvider>
        </>
      )}
    </Modal>
  );
}
