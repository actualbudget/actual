import React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import type { MenuItemObject } from '@actual-app/components/menu';

import { trackingBudget } from '#spreadsheet/bindings';

import { useTrackingSheetValue } from './TrackingBudgetComponents';

export type BalanceMenuActions = {
  categoryId: string;
  onCarryover: (carryover: boolean) => void;
};

export function useBalanceMenu({
  categoryId,
  onCarryover,
}: BalanceMenuActions) {
  const { t } = useTranslation();
  const carryover = useTrackingSheetValue(
    trackingBudget.catCarryover(categoryId),
  );

  const onMenuSelect = (name: string) => {
    switch (name) {
      case 'carryover':
        onCarryover?.(!carryover);
        break;
      default:
        throw new Error(`Unrecognized menu option: ${String(name)}`);
    }
  };

  const items: MenuItemObject<string>[] = [
    {
      name: 'carryover',
      text: carryover
        ? t('Remove overspending rollover')
        : t('Rollover overspending'),
    },
  ];

  return { items, onMenuSelect };
}

type BalanceMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> &
  BalanceMenuActions;

export function BalanceMenu({
  categoryId,
  onCarryover,
  ...props
}: BalanceMenuProps) {
  const { items, onMenuSelect } = useBalanceMenu({ categoryId, onCarryover });

  return <Menu {...props} onMenuSelect={onMenuSelect} items={items} />;
}
