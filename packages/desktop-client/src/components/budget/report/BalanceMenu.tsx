import React from 'react';

import { reportBudget } from 'loot-core/src/client/queries';

import { Menu, type MenuProps } from '../../common/Menu';
import { useSheetValue } from '../../spreadsheet/useSheetValue';

export type BalanceMenuProps = Omit<MenuProps, 'onMenuSelect' | 'items'> & {
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
            throw new Error(`Unsupported item: ${name}`);
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
