import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgArrowButtonUp1 } from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';

import { BudgetSummaryCard } from '#components/budget/BudgetSummaryCard';
import { useTrackingBudget } from '#components/budget/tracking/TrackingBudgetContext';
import { NotesButton } from '#components/NotesButton';
import { SheetNameProvider } from '#hooks/useSheetName';

import { BudgetMonthMenuButton } from './BudgetMonthMenuButton';
import { ExpenseTotal } from './ExpenseTotal';
import { IncomeTotal } from './IncomeTotal';
import { Saved } from './Saved';

type SingleMonthBudgetSummaryProps = {
  month: string;
};

export function SingleMonthBudgetSummary({
  month,
}: SingleMonthBudgetSummaryProps) {
  const { t } = useTranslation();
  const { currentMonth, onToggleSummaryCollapse } = useTrackingBudget();

  const isCurrentMonth = month === currentMonth;

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
            flex: '1 1 220px',
            flexDirection: 'row',
            alignItems: 'center',
            paddingLeft: 10,
            paddingRight: 10,
          }}
        >
          <Button
            variant="bare"
            aria-label={t('Collapse month summary')}
            className="hover-visible"
            style={{ alignSelf: 'flex-start' }}
            onPress={onToggleSummaryCollapse}
          >
            <SvgArrowButtonUp1
              width={13}
              height={13}
              // The margin is to make it the exact same size as the dots button
              style={{ color: theme.pageTextLight, margin: 1 }}
            />
          </Button>
          <Saved projected={month >= currentMonth} style={{ flex: 1 }} />
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
          isCurrentMonth={isCurrentMonth}
          style={{ flex: '1 1 180px', justifyContent: 'center' }}
        >
          <IncomeTotal />
        </BudgetSummaryCard>

        <BudgetSummaryCard
          isCurrentMonth={isCurrentMonth}
          style={{ flex: '1 1 180px', justifyContent: 'center' }}
        >
          <ExpenseTotal />
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
          />
          <Text style={{ color: theme.pageTextLight }}>
            <Trans>Copy last month, use an average or reset to zero</Trans>
          </Text>
        </BudgetSummaryCard>
      </View>
    </SheetNameProvider>
  );
}
