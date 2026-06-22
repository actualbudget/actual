import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import type { MenuItem } from '@actual-app/components/menu';
import type { CategoryEntity } from '@actual-app/core/types/models';

import { useFutureBufferMode } from '#hooks/useFutureBufferMode';
import { envelopeBudget } from '#spreadsheet/bindings';

import { useEnvelopeSheetValue } from './EnvelopeBudgetComponents';

type IncomeMenuProps = {
  categoryId: string;
  month: string;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onShowActivity: (id: CategoryEntity['id'], month: string) => void;
  onClose: () => void;
};

export function IncomeMenu({
  categoryId,
  month,
  onBudgetAction,
  onShowActivity,
  onClose,
}: IncomeMenuProps) {
  const { t } = useTranslation();
  const { isAutomaticFutureBufferMode } = useFutureBufferMode();
  const carryover = useEnvelopeSheetValue(
    envelopeBudget.catCarryover(categoryId),
  );

  // Hide the manual income auto-hold toggle while future buffer mode is active.
  const hideAutoHold = isAutomaticFutureBufferMode;

  const items: MenuItem[] = [
    ...(hideAutoHold
      ? []
      : [
          {
            name: 'carryover',
            text: carryover ? t('Disable auto hold') : t('Enable auto hold'),
          },
        ]),
    {
      name: 'view',
      text: t('View transactions'),
    },
  ];

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
              throw new Error(`Unrecognized menu option: ${String(name)}`);
          }
        }}
        items={items}
      />
    </span>
  );
}
