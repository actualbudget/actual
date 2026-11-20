import { useToBudgetMenu } from '#components/budget/envelope/budgetsummary/ToBudgetMenu';
import type { ToBudgetMenuActions } from '#components/budget/envelope/budgetsummary/ToBudgetMenu';
import { MobileSheetMenuRows } from '#components/mobile/MobileSheetMenuRows';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';

export function ToBudgetSheetActions(props: ToBudgetMenuActions) {
  const { items, onMenuSelect } = useToBudgetMenu(props);

  return (
    <MobileSheetSection>
      <MobileSheetMenuRows items={items} onSelect={onMenuSelect} />
    </MobileSheetSection>
  );
}
