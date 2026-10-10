import { useBudgetMenu } from '#components/budget/envelope/BudgetMenu';
import { useEnvelopeSheetValue } from '#components/budget/envelope/EnvelopeBudgetComponents';
import { BudgetMenuSheet } from '#components/mobile/budget/BudgetMenuSheet';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { envelopeBudget } from '#spreadsheet/bindings';

type EnvelopeBudgetMenuModalProps = Extract<
  ModalType,
  { name: 'envelope-budget-menu' }
>['options'];

export function EnvelopeBudgetMenuModal({
  categoryId,
  month,
  onUpdateBudget,
  onCopyLastMonthAverage,
  onSetMonthsAverage,
  onApplyBudgetTemplate,
  onEditNotes,
}: EnvelopeBudgetMenuModalProps) {
  const budgeted = useEnvelopeSheetValue(
    envelopeBudget.catBudgeted(categoryId),
  );
  const { items, onMenuSelect } = useBudgetMenu({
    onCopyLastMonthAverage,
    onSetMonthsAverage,
    onApplyBudgetTemplate,
  });

  return (
    <BudgetMenuSheet
      name="envelope-budget-menu"
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
