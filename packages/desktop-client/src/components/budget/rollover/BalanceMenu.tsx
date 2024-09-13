import React, { type ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { rolloverBudget } from 'loot-core/src/client/queries';

import { Menu } from '../../common/Menu';

import { useRolloverSheetValue } from './RolloverComponents';

type BalanceMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  categoryId: string;
  onTransfer: () => void;
  onCarryover: (carryOver: boolean) => void;
  onCover: () => void;
};

export function BalanceMenu({
  categoryId,
  onTransfer,
  onCarryover,
  onCover,
  ...props
}: BalanceMenuProps) {
  const { t } = useTranslation();

  const carryover = useRolloverSheetValue(
    rolloverBudget.catCarryover(categoryId),
  );
  const balance = useRolloverSheetValue(rolloverBudget.catBalance(categoryId));

  return (
    <Menu
      {...props}
      onMenuSelect={name => {
        switch (name) {
          case 'transfer':
            onTransfer?.();
            break;
          case 'carryover':
            onCarryover?.(!carryover);
            break;
          case 'cover':
            onCover?.();
            break;
          default:
            throw new Error(t('Unrecognized menu option: {{name}}', { name }));
        }
      }}
      items={[
        ...(balance > 0
          ? [
              {
                name: 'transfer',
                text: t('Transfer to another category'),
              },
            ]
          : []),
        ...(balance < 0
          ? [
              {
                name: 'cover',
                text: t('Cover overspending'),
              },
            ]
          : []),
        {
          name: 'carryover',
          text: carryover
            ? t('Remove overspending rollover')
            : t('Rollover overspending'),
        },
      ]}
    />
  );
}
