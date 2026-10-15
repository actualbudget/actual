import { Trans, useTranslation } from 'react-i18next';

import {
  CategoryFundingStatus,
  useCategoryFunding,
} from '#components/budget/goals/CategoryFundingStatus';
import { useBalanceMenu } from '#components/budget/tracking/BalanceMenu';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetBalanceHeader } from '#components/mobile/MobileSheetBalanceHeader';
import { MobileSheetMenuRows } from '#components/mobile/MobileSheetMenuRows';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useCategory } from '#hooks/useCategory';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { trackingBudget } from '#spreadsheet/bindings';

type TrackingBalanceMenuModalProps = Extract<
  ModalType,
  { name: 'tracking-balance-menu' }
>['options'];

export function TrackingBalanceMenuModal({
  month,
  categoryId,
  onShowActivity,
  onCarryover,
}: TrackingBalanceMenuModalProps) {
  const { t } = useTranslation();
  const { data: category } = useCategory(categoryId);
  // The funding panel below replaces the saved goal summary when it can show
  // live numbers, so the two never appear together.
  const funding = useCategoryFunding({ category, month });
  const { items, onMenuSelect } = useBalanceMenu({ categoryId, onCarryover });

  if (!category) {
    return null;
  }

  return (
    <MobileSheet name="tracking-balance-menu" title={category.name}>
      {({ close }) => (
        <>
          <MobileSheetBalanceHeader
            label={<Trans>Balance</Trans>}
            shouldInlineGoalStatus={!funding}
            carryover={trackingBudget.catCarryover(categoryId)}
            balance={
              category.is_income
                ? trackingBudget.catSumAmount(categoryId)
                : trackingBudget.catBalance(categoryId)
            }
            goal={trackingBudget.catGoal(categoryId)}
            budgeted={trackingBudget.catBudgeted(categoryId)}
            longGoal={trackingBudget.catLongGoal(categoryId)}
          />
          <CategoryFundingStatus
            category={category}
            month={month}
            onFunded={close}
          />
          <MobileSheetSection>
            {category.is_income ? (
              <MobileSheetRow
                label={t('View transactions')}
                onPress={() => onShowActivity?.()}
              />
            ) : (
              <MobileSheetMenuRows items={items} onSelect={onMenuSelect} />
            )}
          </MobileSheetSection>
        </>
      )}
    </MobileSheet>
  );
}
