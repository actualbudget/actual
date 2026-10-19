import { Trans } from 'react-i18next';

import { useBalanceMenu } from '#components/budget/envelope/BalanceMenu';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetBalanceHeader } from '#components/mobile/MobileSheetBalanceHeader';
import { MobileSheetMenuRows } from '#components/mobile/MobileSheetMenuRows';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useCategory } from '#hooks/useCategory';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { envelopeBudget } from '#spreadsheet/bindings';

type EnvelopeBalanceMenuModalProps = Omit<
  Extract<ModalType, { name: 'envelope-balance-menu' }>['options'],
  'month'
>;

export function EnvelopeBalanceMenuModal({
  categoryId,
  onCarryover,
  onTransfer,
  onCover,
}: EnvelopeBalanceMenuModalProps) {
  const { data: category } = useCategory(categoryId);
  const { items, onMenuSelect } = useBalanceMenu({
    categoryId,
    onCarryover,
    onTransfer,
    onCover,
  });

  if (!category) {
    return null;
  }

  return (
    <MobileSheet name="envelope-balance-menu" title={category.name}>
      <MobileSheetBalanceHeader
        label={<Trans>Balance</Trans>}
        carryover={envelopeBudget.catCarryover(categoryId)}
        balance={envelopeBudget.catBalance(categoryId)}
        goal={envelopeBudget.catGoal(categoryId)}
        budgeted={envelopeBudget.catBudgeted(categoryId)}
        longGoal={envelopeBudget.catLongGoal(categoryId)}
      />
      <MobileSheetSection>
        <MobileSheetMenuRows items={items} onSelect={onMenuSelect} />
      </MobileSheetSection>
    </MobileSheet>
  );
}
