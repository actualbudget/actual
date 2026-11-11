import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useHoverMenu } from '@actual-app/components/hooks/useHoverMenu';
import { Popover } from '@actual-app/components/popover';
import * as monthUtils from '@actual-app/core/shared/months';

import { useEnvelopeBudget } from '#components/budget/envelope/EnvelopeBudgetContext';
import { SummaryCard } from '#components/budget/SummaryCard';
import { useLocale } from '#hooks/useLocale';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useUndo } from '#hooks/useUndo';

import { BudgetMonthMenu } from './BudgetMonthMenu';
import { ToBudget } from './ToBudget';
import { TotalsList } from './TotalsList';

type BudgetSummaryProps = {
  month: string;
};
export const BudgetSummary = memo(({ month }: BudgetSummaryProps) => {
  const locale = useLocale();
  const {
    currentMonth,
    summaryCollapsed: collapsed,
    onBudgetAction,
    onToggleSummaryCollapse,
  } = useEnvelopeBudget();

  const menu = useHoverMenu();
  const { showUndoNotification } = useUndo();

  const onMenuOpen = menu.toggle;
  const onMenuClose = menu.close;

  const prevMonthName = monthUtils.format(
    monthUtils.prevMonth(month),
    'MMM',
    locale,
  );

  const displayMonth = monthUtils.format(month, "MMMM ''yy", locale);
  const { t } = useTranslation();

  return (
    <SheetNameProvider name={monthUtils.sheetForMonth(month)}>
      <SummaryCard
        month={month}
        isCurrentMonth={month === currentMonth}
        collapsed={collapsed}
        onToggleCollapse={onToggleSummaryCollapse}
        menuTriggerRef={menu.triggerRef}
        menuTriggerProps={menu.triggerProps}
        onMenuOpen={onMenuOpen}
        menu={
          <Popover {...menu.popoverProps}>
            <BudgetMonthMenu
              onCopyLastMonthBudget={() => {
                onBudgetAction(month, 'copy-last');
                onMenuClose();
                showUndoNotification({
                  message: t(
                    "{{displayMonth}} budgets have all been set to last month's budgeted amounts.",
                    { displayMonth },
                  ),
                });
              }}
              onSetBudgetsToZero={() => {
                onBudgetAction(month, 'set-zero');
                onMenuClose();
                showUndoNotification({
                  message: t(
                    '{{displayMonth}} budgets have all been set to zero.',
                    { displayMonth },
                  ),
                });
              }}
              onSetMonthsAverage={numberOfMonths => {
                onBudgetAction(month, `set-${numberOfMonths}-avg`);
                onMenuClose();
                showUndoNotification({
                  message:
                    numberOfMonths === 12
                      ? t(
                          `${displayMonth} budgets have all been set to yearly average.`,
                        )
                      : t(
                          `${displayMonth} budgets have all been set to ${numberOfMonths} month average.`,
                        ),
                });
              }}
              onCheckTemplates={() => {
                onBudgetAction(month, 'check-templates');
                onMenuClose();
              }}
              onApplyBudgetTemplates={() => {
                onBudgetAction(month, 'apply-goal-template');
                onMenuClose();
                showUndoNotification({
                  message: t(
                    '{{displayMonth}} budget templates have been applied.',
                    { displayMonth },
                  ),
                });
              }}
              onOverwriteWithBudgetTemplates={() => {
                onBudgetAction(month, 'overwrite-goal-template');
                onMenuClose();
                showUndoNotification({
                  message: t(
                    '{{displayMonth}} budget templates have been overwritten.',
                    { displayMonth },
                  ),
                });
              }}
              onEndOfMonthCleanup={() => {
                onBudgetAction(month, 'cleanup-goal-template');
                onMenuClose();
                showUndoNotification({
                  message: t(
                    '{{displayMonth}} end-of-month cleanup templates have been applied.',
                    { displayMonth },
                  ),
                });
              }}
            />
          </Popover>
        }
        headline={
          <ToBudget
            prevMonthName={prevMonthName}
            month={month}
            onBudgetAction={onBudgetAction}
            isCollapsed={collapsed}
          />
        }
      >
        <TotalsList prevMonthName={prevMonthName} />
      </SummaryCard>
    </SheetNameProvider>
  );
});

BudgetSummary.displayName = 'EnvelopeBudgetSummary';
