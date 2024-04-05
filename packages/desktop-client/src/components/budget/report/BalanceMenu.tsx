import React, { type ComponentPropsWithoutRef } from 'react';

import { reportBudget } from 'loot-core/src/client/queries';

import { Menu } from '../../common/Menu';
import { useSheetValue } from '../../spreadsheet/useSheetValue';

type BalanceMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  categoryId: string;
  onCarryover: (carryover: boolean) => void;
};

export function BalanceMenu({
  categoryId,
  onCarryover,
  ...props
}: BalanceMenuProps) {
  const carryover = useSheetValue(reportBudget.catCarryover(categoryId));
  return (
    <Menu
      {...props}
      onMenuSelect={name => {
        switch (name) {
          case 'carryover':
            onCarryover?.(!carryover);
            break;
          default:
            throw new Error(`Unrecognized menu option: ${name}`);
        }
      }}
      items={[
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
