import React from 'react';
import type { ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import type { Binding, SheetFields } from '#spreadsheet';
import { trackingBudget } from '#spreadsheet/bindings';

import { ExpenseProgress } from './ExpenseProgress';
import { IncomeProgress } from './IncomeProgress';

type TotalsRowProps<
  CurrentField extends SheetFields<'tracking-budget'>,
  TargetField extends SheetFields<'tracking-budget'>,
> = {
  title: ReactNode;
  progress: ReactNode;
  current: Binding<'tracking-budget', CurrentField>;
  target: Binding<'tracking-budget', TargetField>;
};

function TotalsRow<
  CurrentField extends SheetFields<'tracking-budget'>,
  TargetField extends SheetFields<'tracking-budget'>,
>({
  title,
  progress,
  current,
  target,
}: TotalsRowProps<CurrentField, TargetField>) {
  return (
    <>
      {/* A ring so the empty pie still shows against the card */}
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          boxShadow: `0 0 0 1px ${theme.tableBorder}`,
        }}
      >
        {progress}
      </View>
      <Text>{title}</Text>
      <Text style={{ ...styles.tnum, textAlign: 'right' }}>
        <Trans
          i18nKey="<allocatedAmount /> <italic>of <totalAmount /></italic>"
          components={{
            allocatedAmount: (
              <CellValue binding={current} type="financial">
                {props => (
                  <CellValueText {...props} style={{ fontWeight: 600 }} />
                )}
              </CellValue>
            ),
            italic: (
              <Text
                style={{ color: theme.pageTextLight, fontStyle: 'italic' }}
              />
            ),
            totalAmount: <CellValue binding={target} type="financial" />,
          }}
        />
      </Text>
    </>
  );
}

/**
 * Income and expenses against their budgeted totals, as rows that fit under
 * the compact summary card's header row.
 */
export function TotalsDetails() {
  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto auto 1fr',
        alignItems: 'center',
        columnGap: 10,
        rowGap: 4,
        lineHeight: 1.4,
        ...styles.smallText,
      }}
    >
      <TotalsRow
        title={<Trans>Income</Trans>}
        progress={
          <IncomeProgress
            current={trackingBudget.totalIncome}
            target={trackingBudget.totalBudgetedIncome}
          />
        }
        current={trackingBudget.totalIncome}
        target={trackingBudget.totalBudgetedIncome}
      />
      <TotalsRow
        title={<Trans>Expenses</Trans>}
        progress={
          <ExpenseProgress
            current={trackingBudget.totalSpent}
            target={trackingBudget.totalBudgetedExpense}
          />
        }
        current={trackingBudget.totalSpent}
        target={trackingBudget.totalBudgetedExpense}
      />
    </View>
  );
}
