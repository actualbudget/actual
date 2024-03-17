import React from 'react';

import { rolloverBudget } from 'loot-core/src/client/queries';

import { Menu, type MenuProps } from '../../common/Menu';
import { useSheetValue } from '../../spreadsheet/useSheetValue';

export type BalanceMenuProps = Omit<MenuProps, 'onMenuSelect' | 'items'> & {
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
  const carryover = useSheetValue(rolloverBudget.catCarryover(categoryId));
  const balance = useSheetValue(rolloverBudget.catBalance(categoryId));
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
            throw new Error(`Unsupported item: ${name}`);
        }
      }}
      items={[
        {
          name: 'transfer',
          text: 'Transfer to another category',
        },
        {
          name: 'carryover',
          text: carryover
            ? 'Remove overspending rollover'
            : 'Rollover overspending',
        },
        ...(balance < 0
          ? [
              {
                name: 'cover',
                text: 'Cover overspending',
              },
            ]
          : []),
      ]}
    />
  );
}
