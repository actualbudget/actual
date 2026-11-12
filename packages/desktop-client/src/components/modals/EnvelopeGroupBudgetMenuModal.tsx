import { useBudgetMenu } from '#components/budget/envelope/BudgetMenu';
import { GroupBudgetMenuSheet } from '#components/mobile/budget/GroupBudgetMenuSheet';
import type { Modal as ModalType } from '#modals/modalsSlice';

type EnvelopeGroupBudgetMenuModalProps = Extract<
  ModalType,
  { name: 'envelope-group-budget-menu' }
>['options'];

export function EnvelopeGroupBudgetMenuModal({
  groupId,
  onCopyLastMonthAverage,
  onSetMonthsAverage,
  onApplyBudgetTemplate,
}: EnvelopeGroupBudgetMenuModalProps) {
  const { items, onMenuSelect } = useBudgetMenu({
    onCopyLastMonthAverage,
    onSetMonthsAverage,
    onApplyBudgetTemplate,
  });

  return (
    <GroupBudgetMenuSheet
      name="envelope-group-budget-menu"
      groupId={groupId}
      items={items}
      onMenuSelect={onMenuSelect}
    />
  );
}
