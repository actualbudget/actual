import React, { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgCheveronDown,
  SvgDotsHorizontalTriple,
} from '@actual-app/components/icons/v1';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import * as monthUtils from '@actual-app/core/shared/months';

import { useEnvelopeBudget } from '#components/budget/envelope/EnvelopeBudgetContext';
import { useLocale } from '#hooks/useLocale';
import { useUndo } from '#hooks/useUndo';

import { BudgetMonthMenu } from './BudgetMonthMenu';

type BudgetMonthMenuButtonProps = {
  month: string;
  /** Shows a labelled button instead of the default dots icon. */
  label?: ReactNode;
  isSummaryCollapsed?: boolean;
  onToggleSummaryCollapse?: () => void;
};

export function BudgetMonthMenuButton({
  month,
  label,
  isSummaryCollapsed,
  onToggleSummaryCollapse,
}: BudgetMonthMenuButtonProps) {
  const locale = useLocale();
  const { t } = useTranslation();
  const { onBudgetAction } = useEnvelopeBudget();

  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { showUndoNotification } = useUndo();

  function onMenuOpen() {
    setMenuOpen(true);
  }

  function onMenuClose() {
    setMenuOpen(false);
  }

  const displayMonth = monthUtils.format(month, "MMMM ''yy", locale);

  return (
    <>
      {label ? (
        <Button ref={triggerRef} onPress={onMenuOpen}>
          {label}
          <SvgCheveronDown width={14} height={14} style={{ marginLeft: 4 }} />
        </Button>
      ) : (
        <Button
          ref={triggerRef}
          variant="bare"
          aria-label={t('Menu')}
          onPress={onMenuOpen}
        >
          <SvgDotsHorizontalTriple
            width={15}
            height={15}
            style={{ color: theme.pageTextLight }}
          />
        </Button>
      )}

      <Popover
        triggerRef={triggerRef}
        isOpen={menuOpen}
        onOpenChange={onMenuClose}
      >
        <BudgetMonthMenu
          isSummaryCollapsed={isSummaryCollapsed}
          onToggleSummaryCollapse={
            onToggleSummaryCollapse &&
            (() => {
              onToggleSummaryCollapse();
              onMenuClose();
            })
          }
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
    </>
  );
}
