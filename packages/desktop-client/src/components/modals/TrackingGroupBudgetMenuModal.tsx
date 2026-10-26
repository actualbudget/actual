import { useBudgetMenu } from '#components/budget/tracking/BudgetMenu';
import { GroupBudgetMenuSheet } from '#components/mobile/budget/GroupBudgetMenuSheet';
import type { Modal as ModalType } from '#modals/modalsSlice';

type TrackingGroupBudgetMenuModalProps = Extract<
  ModalType,
  { name: 'tracking-group-budget-menu' }
>['options'];

export function TrackingGroupBudgetMenuModal({
  groupId,
  onCopyLastMonthAverage,
  onSetMonthsAverage,
  onApplyBudgetTemplate,
  onCopyUntilYearEnd,
}: TrackingGroupBudgetMenuModalProps) {
  const { items, onMenuSelect } = useBudgetMenu({
    onCopyLastMonthAverage,
    onSetMonthsAverage,
    onApplyBudgetTemplate,
    onCopyUntilYearEnd,
  });

  return (
    <GroupBudgetMenuSheet
      name="tracking-group-budget-menu"
      groupId={groupId}
      items={items}
      onMenuSelect={onMenuSelect}
    />
  );
}
