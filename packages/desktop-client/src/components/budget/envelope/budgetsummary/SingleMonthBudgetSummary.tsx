import React from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { BudgetSummaryCard } from '#components/budget/BudgetSummaryCard';
import { EnvelopeCellValue } from '#components/budget/envelope/EnvelopeBudgetComponents';
import { useEnvelopeBudget } from '#components/budget/envelope/EnvelopeBudgetContext';
import { NotesButton } from '#components/NotesButton';
import { CellValueText } from '#components/spreadsheet/CellValue';
import { useLocale } from '#hooks/useLocale';
import { SheetNameProvider } from '#hooks/useSheetName';
import { envelopeBudget } from '#spreadsheet/bindings';

import { BudgetMonthMenuButton } from './BudgetMonthMenuButton';
import { ToBudget } from './ToBudget';
import { TotalsList } from './TotalsList';

function TotalBudgetedValue() {
  return (
    <EnvelopeCellValue binding={envelopeBudget.totalBudgeted} type="financial">
      {props => <CellValueText {...props} value={-props.value} />}
    </EnvelopeCellValue>
  );
}

type SingleMonthBudgetSummaryProps = {
  month: string;
};

export function SingleMonthBudgetSummary({
  month,
}: SingleMonthBudgetSummaryProps) {
  const locale = useLocale();
  const { currentMonth, onBudgetAction, onToggleSummaryCollapse } =
    useEnvelopeBudget();

  const isCurrentMonth = month === currentMonth;
  const prevMonthName = monthUtils.format(
    monthUtils.prevMonth(month),
    'MMM',
    locale,
  );

  return (
    <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
      <View
        data-testid="budget-summary"
        data-month={month}
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: 5,
          marginBottom: 5,
        }}
      >
        <BudgetSummaryCard
          isCurrentMonth={isCurrentMonth}
          style={{
            flex: '1.5 1 340px',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <ToBudget
            prevMonthName={prevMonthName}
            month={month}
            onBudgetAction={onBudgetAction}
          />
          <TotalsList prevMonthName={prevMonthName} />
          <View style={{ flex: 1 }} />
          <View style={{ alignSelf: 'flex-start' }}>
            <NotesButton
              id={`budget-${month}`}
              width={15}
              height={15}
              tooltipPosition="bottom right"
              defaultColor={theme.pageTextLight}
            />
          </View>
        </BudgetSummaryCard>

        <BudgetSummaryCard
          title={<Trans>Spent</Trans>}
          isCurrentMonth={isCurrentMonth}
          style={{ flex: '1 1 180px', justifyContent: 'center' }}
        >
          <EnvelopeCellValue
            binding={envelopeBudget.totalSpent}
            type="financial"
          >
            {props => (
              <CellValueText
                {...props}
                style={{ fontSize: 20, fontWeight: 600 }}
              />
            )}
          </EnvelopeCellValue>
          <Text style={{ color: theme.pageTextLight }}>
            <Trans
              i18nKey="of <budgetedAmount /> budgeted"
              components={{ budgetedAmount: <TotalBudgetedValue /> }}
            />
          </Text>
        </BudgetSummaryCard>

        <BudgetSummaryCard
          title={<Trans>Budget actions</Trans>}
          isCurrentMonth={isCurrentMonth}
          style={{
            flex: '1 1 200px',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <BudgetMonthMenuButton
            month={month}
            label={<Trans>Choose an action</Trans>}
            isSummaryCollapsed={false}
            onToggleSummaryCollapse={onToggleSummaryCollapse}
          />
          <Text style={{ color: theme.pageTextLight }}>
            <Trans>Copy last month, use an average or reset to zero</Trans>
          </Text>
        </BudgetSummaryCard>
      </View>
    </SheetNameProvider>
  );
}
