import React from 'react';
import { useTranslation } from 'react-i18next';

import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { radius, spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { sheetForMonth } from '@actual-app/core/shared/months';
import * as monthUtils from '@actual-app/core/shared/months';

import { ExpenseTotal } from '#components/budget/tracking/budgetsummary/ExpenseTotal';
import { IncomeTotal } from '#components/budget/tracking/budgetsummary/IncomeTotal';
import { Saved } from '#components/budget/tracking/budgetsummary/Saved';
import { MobileSheet } from '#components/mobile/MobileSheet';
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
    <MobileSheet name="tracking-budget-summary" title={t('Budget Summary')}>
      <View
        style={{ padding: `${spacing.xs}px ${spacing.lg}px ${spacing.lg}px` }}
      >
        <SheetNameProvider name={sheetForMonth(month)}>
          <SpaceBetween
            direction="vertical"
            gap={spacing.sm}
            style={{
              alignSelf: 'center',
              alignItems: 'flex-start',
              backgroundColor: 'transparent',
              borderRadius: radius.sm,
            }}
          >
            <IncomeTotal style={{ ...styles.mediumText }} />
            <ExpenseTotal style={{ ...styles.mediumText }} />
          </SpaceBetween>
          <Saved
            projected={month >= currentMonth}
            style={{ ...styles.mediumText, marginTop: spacing.xl }}
          />
        </SheetNameProvider>
      </View>
    </MobileSheet>
  );
}
