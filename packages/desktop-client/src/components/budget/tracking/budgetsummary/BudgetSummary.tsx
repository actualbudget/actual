// @ts-strict-ignore
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgArrowButtonDown1,
  SvgArrowButtonUp1,
} from '@actual-app/components/icons/v2';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { css } from '@emotion/css';

import { CollapsedBudgetSummaryCard } from '#components/budget/CollapsedBudgetSummaryCard';
import { MonthStatusBadge } from '#components/budget/MonthStatusBadge';
import { useTrackingBudget } from '#components/budget/tracking/TrackingBudgetContext';
import { NotesButton } from '#components/NotesButton';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useLocale } from '#hooks/useLocale';
import { SheetNameProvider } from '#hooks/useSheetName';

import { BudgetMonthMenuButton } from './BudgetMonthMenuButton';
import { ExpenseTotal } from './ExpenseTotal';
import { IncomeTotal } from './IncomeTotal';
import { Saved } from './Saved';

type BudgetSummaryProps = {
  month: string;
};
export function BudgetSummary({ month }: BudgetSummaryProps) {
  const locale = useLocale();
  const { t } = useTranslation();
  const {
    currentMonth,
    summaryCollapsed: collapsed,
    onToggleSummaryCollapse,
  } = useTrackingBudget();
  const isBudgetPageRedesignEnabled = useFeatureFlag('budgetPageRedesign');

  const ExpandOrCollapseIcon = collapsed
    ? SvgArrowButtonDown1
    : SvgArrowButtonUp1;

  if (isBudgetPageRedesignEnabled && collapsed) {
    return (
      <CollapsedBudgetSummaryCard
        month={month}
        currentMonth={currentMonth}
        monthMenuButton={<BudgetMonthMenuButton month={month} />}
        renderPrimaryFigure={({ isLabelHidden }) => (
          <Saved
            projected={month >= currentMonth}
            style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}
            labelStyle={{
              fontSize: 12,
              whiteSpace: 'nowrap',
              ...(isLabelHidden && { display: 'none' }),
            }}
            amountStyle={{ fontSize: 16 }}
          />
        )}
        onToggleSummaryCollapse={onToggleSummaryCollapse}
      />
    );
  }

  return (
    <View
      data-testid="budget-summary"
      data-month={month}
      style={{
        backgroundColor:
          month === currentMonth
            ? theme.budgetCurrentMonth
            : theme.budgetOtherMonth,
        boxShadow: styles.cardShadow,
        borderRadius: 6,
        marginLeft: 0,
        marginRight: 0,
        marginTop: 5,
        flex: 1,
        cursor: 'default',
        marginBottom: 5,
        overflow: 'hidden',
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        '&:hover .hover-visible': {
          opacity: 1,
        },
      }}
    >
      <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
        <View
          style={{
            padding: '0 13px',
            ...(collapsed ? { margin: '10px 0' } : { marginTop: 16 }),
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: 10,
              top: 0,
            }}
          >
            <Button
              variant="bare"
              aria-label={
                collapsed
                  ? t('Expand month summary')
                  : t('Collapse month summary')
              }
              className="hover-visible"
              onPress={onToggleSummaryCollapse}
            >
              <ExpandOrCollapseIcon
                width={13}
                height={13}
                // The margin is to make it the exact same size as the dots button
                style={{ color: theme.pageTextLight, margin: 1 }}
              />
            </Button>
          </View>

          <div
            className={css({
              textAlign: 'center',
              marginTop: 3,
              fontSize: 18,
              fontWeight: 500,
              textDecorationSkip: 'ink',
            })}
          >
            {monthUtils.format(month, 'MMMM', locale)}
            {isBudgetPageRedesignEnabled && (
              <MonthStatusBadge
                month={month}
                currentMonth={currentMonth}
                style={{ marginLeft: 8, verticalAlign: 'middle' }}
              />
            )}
          </div>

          <View
            style={{
              position: 'absolute',
              right: 10,
              top: 0,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View>
              <NotesButton
                id={`budget-${month}`}
                width={15}
                height={15}
                tooltipPosition="bottom right"
                defaultColor={theme.pageTextLight}
              />
            </View>
            <View style={{ userSelect: 'none' }}>
              <BudgetMonthMenuButton month={month} />
            </View>
          </View>
        </View>

        {!collapsed && (
          <SpaceBetween
            direction="vertical"
            gap={10}
            style={{
              alignSelf: 'center',
              alignItems: 'flex-start',
              backgroundColor: theme.budgetHeaderCurrentMonth,
              borderRadius: 4,
              padding: '10px 15px',
              marginTop: 13,
            }}
          >
            <IncomeTotal />
            <ExpenseTotal />
          </SpaceBetween>
        )}

        {collapsed ? (
          <View
            style={{
              alignItems: 'center',
              padding: '10px 20px',
              justifyContent: 'space-between',
              backgroundColor: theme.budgetHeaderCurrentMonth,
              borderTop: '1px solid ' + theme.tableBorder,
            }}
          >
            <Saved projected={month >= currentMonth} />
          </View>
        ) : (
          <Saved
            projected={month >= currentMonth}
            style={{ marginTop: 13, marginBottom: 20 }}
          />
        )}
      </SheetNameProvider>
    </View>
  );
}
