import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';

import { type CategoryEntity } from 'loot-core/types/models';

import { useEnvelopeSheetValue } from './EnvelopeBudgetComponents';

import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type IncomeMenuProps = {
  categoryId: string;
  month: string;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onShowActivity: (id: CategoryEntity['id'], month: string) => void;
  onClose?: () => void;
};

export function IncomeMenu({
  categoryId,
  month,
  onBudgetAction,
  onShowActivity,
  onClose = () => {},
}: IncomeMenuProps) {
  const { t } = useTranslation();
  const carryover = useEnvelopeSheetValue(
    envelopeBudget.catCarryover(categoryId),
  );

  return (
    <span>
      <Menu
        onMenuSelect={name => {
          switch (name) {
            case 'view':
              onShowActivity(categoryId, month);
              break;
            case 'carryover':
              if (!carryover) onBudgetAction(month, 'reset-hold');
              onBudgetAction(month, 'carryover', {
                category: categoryId,
                flag: !carryover,
              });
              onClose();
              break;
            default:
              throw new Error(`Unrecognized menu option: ${name}`);
          }
        }}
        items={[
          {
            name: 'carryover',
            text: carryover ? t('Disable auto hold') : t('Enable auto hold'),
          },
          {
            name: 'view',
            text: t('View transactions'),
          },
        ]}
      />
    </span>
  );
}
