import { Trans, useTranslation } from 'react-i18next';

import { useEnvelopeSheetValue } from '#components/budget/envelope/EnvelopeBudgetComponents';
import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetBalanceHeader } from '#components/mobile/MobileSheetBalanceHeader';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useCategory } from '#hooks/useCategory';
import { useBudgetLine } from '#hooks/useCategoryCurrencies';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { envelopeBudget } from '#spreadsheet/bindings';

type EnvelopeIncomeBalanceMenuModalProps = Omit<
  Extract<ModalType, { name: 'envelope-income-balance-menu' }>['options'],
  'month'
>;

export function EnvelopeIncomeBalanceMenuModal({
  categoryId,
  onCarryover,
  onShowActivity,
}: EnvelopeIncomeBalanceMenuModalProps) {
  const { t } = useTranslation();
  const { categoryId: ownerId, currencyCode } = useBudgetLine(categoryId);
  const { data: category } = useCategory(ownerId);
  const carryover = useEnvelopeSheetValue(
    envelopeBudget.catCarryover(categoryId),
  );

  if (!category) {
    return null;
  }

  return (
    <MobileSheet
      name="envelope-income-balance-menu"
      title={
        currencyCode ? `${category.name} (${currencyCode})` : category.name
      }
    >
      <MobileSheetBalanceHeader
        currencyCode={currencyCode}
        label={<Trans>Received</Trans>}
        carryover={envelopeBudget.catCarryover(categoryId)}
        balance={envelopeBudget.catSumAmount(categoryId)}
        goal={envelopeBudget.catGoal(categoryId)}
        budgeted={envelopeBudget.catBudgeted(categoryId)}
        longGoal={envelopeBudget.catLongGoal(categoryId)}
        isIncome
      />
      <MobileSheetSection>
        <MobileSheetRow
          label={carryover ? t('Disable auto hold') : t('Enable auto hold')}
          onPress={() => onCarryover(!carryover)}
        />
        <MobileSheetRow
          label={t('View transactions')}
          onPress={() => onShowActivity()}
        />
      </MobileSheetSection>
    </MobileSheet>
  );
}
