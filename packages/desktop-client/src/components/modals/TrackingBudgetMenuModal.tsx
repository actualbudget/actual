import { useBudgetMenu } from '#components/budget/tracking/BudgetMenu';
import { useTrackingSheetValue } from '#components/budget/tracking/TrackingBudgetComponents';
import { BudgetMenuSheet } from '#components/mobile/budget/BudgetMenuSheet';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { trackingBudget } from '#spreadsheet/bindings';

type TrackingBudgetMenuModalProps = Extract<
  ModalType,
  { name: 'tracking-budget-menu' }
>['options'];

export function TrackingBudgetMenuModal({
  categoryId,
  month,
  onUpdateBudget,
  onCopyLastMonthAverage,
  onSetMonthsAverage,
  onApplyBudgetTemplate,
  onCopyUntilYearEnd,
  onEditNotes,
}: TrackingBudgetMenuModalProps) {
  const budgeted = useTrackingSheetValue(
    trackingBudget.catBudgeted(categoryId),
  );
  const { items, onMenuSelect } = useBudgetMenu({
    onCopyLastMonthAverage,
    onSetMonthsAverage,
    onApplyBudgetTemplate,
    onCopyUntilYearEnd,
  });

  return (
    <BudgetMenuSheet
      name="tracking-budget-menu"
      categoryId={categoryId}
      month={month}
      budgeted={budgeted ?? 0}
      items={items}
      onMenuSelect={onMenuSelect}
      onUpdateBudget={onUpdateBudget}
      onEditNotes={onEditNotes}
    />
  );
}
