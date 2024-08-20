import React, { type ComponentPropsWithoutRef } from 'react';

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
            throw new Error(`Unrecognized menu option: ${name}`);
        }
      }}
      items={[
        ...(balance > 0
          ? [
              {
                name: 'transfer',
                text: 'Transfer to another category',
              },
            ]
          : []),
        ...(balance < 0
          ? [
              {
                name: 'cover',
                text: 'Cover overspending',
              },
            ]
          : []),
        {
          name: 'carryover',
          text: carryover
            ? 'Remove overspending rollover'
            : 'Rollover overspending',
        },
      ]}
    />
  );
}
