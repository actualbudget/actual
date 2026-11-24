import { useTranslation } from 'react-i18next';

import * as monthUtils from '@actual-app/core/shared/months';

import { useBudgetMonthMenu } from '#components/budget/tracking/budgetsummary/BudgetMonthMenu';
import { BudgetMonthMenuSheet } from '#components/mobile/budget/BudgetMonthMenuSheet';
import { useLocale } from '#hooks/useLocale';
import type { Modal as ModalType } from '#modals/modalsSlice';

type TrackingBudgetMonthMenuModalProps = Extract<
  ModalType,
  { name: 'tracking-budget-month-menu' }
>['options'];

export function TrackingBudgetMonthMenuModal({
  month,
  onBudgetAction,
  onEditNotes,
}: TrackingBudgetMonthMenuModalProps) {
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
  };

  return (
    <BudgetMonthMenuSheet
      name="tracking-budget-month-menu"
      month={month}
      items={items}
      onMenuSelect={onMenuSelect}
      undoMessages={undoMessages}
      onEditNotes={onEditNotes}
    />
  );
}
