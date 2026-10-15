import { Trans } from 'react-i18next';

import { useBalanceMenu } from '#components/budget/envelope/BalanceMenu';
import {
  CategoryFundingStatus,
  useCategoryFunding,
} from '#components/budget/goals/CategoryFundingStatus';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetBalanceHeader } from '#components/mobile/MobileSheetBalanceHeader';
import { MobileSheetMenuRows } from '#components/mobile/MobileSheetMenuRows';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useCategory } from '#hooks/useCategory';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { envelopeBudget } from '#spreadsheet/bindings';

type EnvelopeBalanceMenuModalProps = Extract<
  ModalType,
  { name: 'envelope-balance-menu' }
>['options'];

export function EnvelopeBalanceMenuModal({
  month,
  categoryId,
  onCarryover,
  onTransfer,
  onCover,
}: EnvelopeBalanceMenuModalProps) {
  const { data: category } = useCategory(categoryId);
  // The funding panel below replaces the saved goal summary when it can show
  // live numbers, so the two never appear together.
  const funding = useCategoryFunding({ category, month });
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
      {({ close }) => (
        <>
          <MobileSheetBalanceHeader
            label={<Trans>Balance</Trans>}
            shouldInlineGoalStatus={!funding}
            carryover={envelopeBudget.catCarryover(categoryId)}
            balance={envelopeBudget.catBalance(categoryId)}
            goal={envelopeBudget.catGoal(categoryId)}
            budgeted={envelopeBudget.catBudgeted(categoryId)}
            longGoal={envelopeBudget.catLongGoal(categoryId)}
          />
          <CategoryFundingStatus
            category={category}
            month={month}
            onFunded={close}
          />
          <MobileSheetSection>
            <MobileSheetMenuRows items={items} onSelect={onMenuSelect} />
          </MobileSheetSection>
        </>
      )}
    </MobileSheet>
  );
}
