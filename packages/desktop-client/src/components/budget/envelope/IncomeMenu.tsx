import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';

import { envelopeBudget } from 'loot-core/client/queries';
import { type CategoryEntity } from 'loot-core/types/models';

import { BalanceMenu } from './BalanceMenu';
import { useEnvelopeSheetValue } from './EnvelopeBudgetComponents';

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
  const ref = useRef<HTMLSpanElement>(null);

  const { t } = useTranslation();
  const carryover = useEnvelopeSheetValue(
    envelopeBudget.catCarryover(categoryId),
  );

  return (
    <span tabIndex={-1} ref={ref}>
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
            text: carryover ? t('Disable auto-hold') : t('Enable auto-hold'),
          },
          {
            name: 'view',
            text: t('View Transactions'),
          },
        ]}
      />
    </span>
  );
}
