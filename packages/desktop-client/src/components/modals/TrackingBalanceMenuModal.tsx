import { Trans } from 'react-i18next';

import { useBalanceMenu } from '#components/budget/tracking/BalanceMenu';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetBalanceHeader } from '#components/mobile/MobileSheetBalanceHeader';
import { MobileSheetMenuRows } from '#components/mobile/MobileSheetMenuRows';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useCategory } from '#hooks/useCategory';
import { useBudgetLine } from '#hooks/useCategoryCurrencies';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { trackingBudget } from '#spreadsheet/bindings';

type TrackingBalanceMenuModalProps = Omit<
  Extract<ModalType, { name: 'tracking-balance-menu' }>['options'],
  'month'
>;

export function TrackingBalanceMenuModal({
  categoryId,
  onCarryover,
}: TrackingBalanceMenuModalProps) {
  const { categoryId: ownerId, currencyCode } = useBudgetLine(categoryId);
  const { data: category } = useCategory(ownerId);
  const { items, onMenuSelect } = useBalanceMenu({ categoryId, onCarryover });

  if (!category) {
    return null;
  }

  return (
    <MobileSheet
      name="tracking-balance-menu"
      title={
        currencyCode ? `${category.name} (${currencyCode})` : category.name
      }
    >
      <MobileSheetBalanceHeader
        label={<Trans>Balance</Trans>}
        currencyCode={currencyCode}
        carryover={trackingBudget.catCarryover(categoryId)}
        balance={trackingBudget.catBalance(categoryId)}
        goal={trackingBudget.catGoal(categoryId)}
        budgeted={trackingBudget.catBudgeted(categoryId)}
        longGoal={trackingBudget.catLongGoal(categoryId)}
      />
      <MobileSheetSection>
        <MobileSheetMenuRows items={items} onSelect={onMenuSelect} />
      </MobileSheetSection>
    </MobileSheet>
  );
}
