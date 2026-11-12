import { Trans } from 'react-i18next';

import { useBalanceMenu } from '#components/budget/envelope/BalanceMenu';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetBalanceHeader } from '#components/mobile/MobileSheetBalanceHeader';
import { MobileSheetMenuRows } from '#components/mobile/MobileSheetMenuRows';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useCategory } from '#hooks/useCategory';
import { useBudgetLine } from '#hooks/useCategoryCurrencies';
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
  onFundGoal,
}: EnvelopeBalanceMenuModalProps) {
  const { categoryId: ownerId, currencyCode } = useBudgetLine(categoryId);
  const { data: category } = useCategory(ownerId);
  const { items, onMenuSelect } = useBalanceMenu({
    categoryId,
    onCarryover,
    onTransfer,
    onCover,
    onFundGoal,
  });

  if (!category) {
    return null;
  }

  return (
    <MobileSheet
      name="envelope-balance-menu"
      title={
        currencyCode ? `${category.name} (${currencyCode})` : category.name
      }
    >
      <MobileSheetBalanceHeader
        label={<Trans>Balance</Trans>}
        currencyCode={currencyCode}
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
