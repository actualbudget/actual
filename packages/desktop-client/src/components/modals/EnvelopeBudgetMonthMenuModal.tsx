import { useTranslation } from 'react-i18next';

import * as monthUtils from '@actual-app/core/shared/months';

import { useBudgetMonthMenu } from '#components/budget/envelope/budgetsummary/BudgetMonthMenu';
import { BudgetMonthMenuSheet } from '#components/mobile/budget/BudgetMonthMenuSheet';
import { useLocale } from '#hooks/useLocale';
import type { Modal as ModalType } from '#modals/modalsSlice';

type EnvelopeBudgetMonthMenuModalProps = Extract<
  ModalType,
  { name: 'envelope-budget-month-menu' }
>['options'];

export function EnvelopeBudgetMonthMenuModal({
  month,
  onBudgetAction,
  onEditNotes,
}: EnvelopeBudgetMonthMenuModalProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const displayMonth = monthUtils.format(month, "MMMM ''yy", locale);

  const { items, onMenuSelect } = useBudgetMonthMenu({
    onCopyLastMonthBudget: () => onBudgetAction(month, 'copy-last'),
    onSetBudgetsToZero: () => onBudgetAction(month, 'set-zero'),
    onSetMonthsAverage: numberOfMonths =>
      onBudgetAction(month, `set-${numberOfMonths}-avg`),
    onCheckTemplates: () => onBudgetAction(month, 'check-templates'),
    onApplyBudgetTemplates: () => onBudgetAction(month, 'apply-goal-template'),
    onOverwriteWithBudgetTemplates: () =>
      onBudgetAction(month, 'overwrite-goal-template'),
    onEndOfMonthCleanup: () => onBudgetAction(month, 'cleanup-goal-template'),
  });

  const undoMessages = {
    'copy-last': t(
      "{{displayMonth}} budgets have all been set to last month's budgeted amounts.",
      { displayMonth },
    ),
    'set-zero': t('{{displayMonth}} budgets have all been set to zero.', {
      displayMonth,
    }),
    'set-3-avg': t(
      '{{displayMonth}} budgets have all been set to {{months}} month average.',
      { displayMonth, months: 3 },
    ),
    'set-6-avg': t(
      '{{displayMonth}} budgets have all been set to {{months}} month average.',
      { displayMonth, months: 6 },
    ),
    'set-12-avg': t(
      '{{displayMonth}} budgets have all been set to yearly average.',
      { displayMonth },
    ),
    'apply-goal-template': t(
      '{{displayMonth}} budget templates have been applied.',
      { displayMonth },
    ),
    'overwrite-goal-template': t(
      '{{displayMonth}} budget templates have been overwritten.',
      { displayMonth },
    ),
    'cleanup-goal-template': t(
      '{{displayMonth}} end-of-month cleanup templates have been applied.',
      { displayMonth },
    ),
  };

  return (
    <BudgetMonthMenuSheet
      name="envelope-budget-month-menu"
      month={month}
      items={items}
      onMenuSelect={onMenuSelect}
      undoMessages={undoMessages}
      onEditNotes={onEditNotes}
    />
  );
}
